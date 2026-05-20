import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailingTransportService } from './mailing-transport.service';
import { MailingFiltersDto } from './dto/mailing-filters.dto';
import { UserRole, Prisma, MailingCampaignStatus } from '@prisma/client';
import * as crypto from 'crypto';

const MAX_RECIPIENTS_PER_CAMPAIGN = 2000;
const MAX_EXPORT_ROWS = 10_000;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 200;
const DEFAULT_BATCH_SIZE = 100;
const INTER_EMAIL_DELAY_MS = parseInt(process.env.MAILING_SMTP_RATE_LIMIT_MS || '100', 10);
const UNSUBSCRIBE_SECRET = process.env.MAILING_UNSUBSCRIBE_SECRET || process.env.CLERK_SECRET_KEY || 'mailing-default-secret';

/** All columns that can appear in an export. */
export const EXPORTABLE_COLUMNS = [
  'email',
  'firstName',
  'lastName',
  'role',
  'orgName',
  'canton',
  'city',
  'languages',
  'subscriptionStatus',
  'subscriptionTier',
  'isActive',
  'createdAt',
  'lastActiveAt',
] as const;

type ExportColumn = (typeof EXPORTABLE_COLUMNS)[number];

/* ------------------------------------------------------------------ */
/*  Helper: tiny sleep                                                 */
/* ------------------------------------------------------------------ */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: MailingTransportService,
  ) {}

  /* ================================================================ */
  /*  SHARED FILTER QUERY BUILDER                                      */
  /* ================================================================ */

  buildRecipientWhere(filters: MailingFiltersDto): Prisma.UserWhereInput {
    const andConditions: Prisma.UserWhereInput[] = [];

    // Hard rules --------------------------------------------------
    // Always exclude users without an email
    andConditions.push({ email: { not: null } });

    // A) Role filters -------------------------------------------
    const roleCondition: Prisma.EnumUserRoleFilter = {};

    // Always exclude admin/super_admin from recipient lists
    const alwaysExclude: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
    const userExclude: UserRole[] = filters.excludeRoles?.length
      ? ([...new Set([...alwaysExclude, ...(filters.excludeRoles as UserRole[])])])
      : alwaysExclude;
    roleCondition.notIn = userExclude;

    if (filters.roles?.length) {
      roleCondition.in = filters.roles.filter((r) => !alwaysExclude.includes(r));
    }

    andConditions.push({ role: roleCondition });

    // B) Account status ------------------------------------------
    if (filters.isActive !== undefined) {
      andConditions.push({ isActive: filters.isActive });
    }

    // C) Subscription filters ------------------------------------
    if (
      filters.hasSubscription !== undefined ||
      filters.subscriptionStatuses?.length ||
      filters.subscriptionTiers?.length ||
      filters.renewalDateFrom ||
      filters.renewalDateTo
    ) {
      const subWhere: Prisma.SubscriptionWhereInput = {};

      if (filters.subscriptionStatuses?.length) {
        subWhere.status = { in: filters.subscriptionStatuses };
      }
      if (filters.subscriptionTiers?.length) {
        subWhere.tier = { in: filters.subscriptionTiers };
      }
      if (filters.renewalDateFrom || filters.renewalDateTo) {
        subWhere.currentPeriodEnd = {};
        if (filters.renewalDateFrom) {
          subWhere.currentPeriodEnd.gte = new Date(filters.renewalDateFrom);
        }
        if (filters.renewalDateTo) {
          subWhere.currentPeriodEnd.lte = new Date(filters.renewalDateTo);
        }
      }

      if (filters.hasSubscription === true) {
        andConditions.push({ mainSubscriptions: { some: subWhere } });
      } else if (filters.hasSubscription === false) {
        andConditions.push({ mainSubscriptions: { none: {} } });
      } else if (Object.keys(subWhere).length > 0) {
        andConditions.push({ mainSubscriptions: { some: subWhere } });
      }
    }

    // C2) Educator approval status ---------------------------------
    // Scoped to EDUCATOR role only: non-educator users in a mixed audience
    // are not filtered out because they have no approvalStatus at all.
    if (filters.educatorApprovalStatuses?.length) {
      andConditions.push({
        OR: [
          { role: { not: UserRole.EDUCATOR } },
          { approvalStatus: { in: filters.educatorApprovalStatuses } },
        ],
      });
    }

    // D) Location & language (via Organization) ------------------
    const orgWhere: Prisma.OrganizationWhereInput = {};
    if (filters.cantons?.length) {
      orgWhere.canton = { in: filters.cantons };
    }
    if (filters.cities?.length) {
      orgWhere.city = { in: filters.cities, mode: 'insensitive' };
    }
    if (filters.languages?.length) {
      orgWhere.languages = { hasSome: filters.languages };
    }
    if (Object.keys(orgWhere).length > 0) {
      andConditions.push({
        organizations: { some: { organization: orgWhere } },
      });
    }

    // E) Mailing list opt-out / unsubscribed -----------------------
    // Uses the explicit `mailingListOptOut` field (default false).
    // Users are only excluded when they specifically unsubscribe via
    // their notification settings or an unsubscribe link.
    // The legacy `marketingOptIn` filter is kept for backward compat.
    if (filters.marketingOptIn === true) {
      // Show only users who have NOT opted out of the mailing list
      andConditions.push({
        OR: [
          { notificationPreferences: null },
          { notificationPreferences: { mailingListOptOut: false } },
        ],
      });
    } else if (filters.marketingOptIn === false) {
      // Explicitly requesting opted-out users
      andConditions.push({ notificationPreferences: { mailingListOptOut: true } });
    } else if (filters.excludeUnsubscribed !== false) {
      // Default when "Newsletter subscribers" audience is selected:
      // exclude users who explicitly unsubscribed from the mailing list
      andConditions.push({
        OR: [
          { notificationPreferences: null },
          { notificationPreferences: { mailingListOptOut: false } },
        ],
      });
    }
    // When excludeUnsubscribed === false (All Users / Broadcast mode):
    // no mailing-list filter is applied — everyone is included.

    // F) Date ranges ----------------------------------------------
    if (filters.createdFrom || filters.createdTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.createdFrom) createdAt.gte = new Date(filters.createdFrom);
      if (filters.createdTo) createdAt.lte = new Date(filters.createdTo);
      andConditions.push({ createdAt });
    }
    if (filters.lastActiveFrom || filters.lastActiveTo) {
      const lastActiveAt: Prisma.DateTimeNullableFilter = {};
      if (filters.lastActiveFrom) lastActiveAt.gte = new Date(filters.lastActiveFrom);
      if (filters.lastActiveTo) lastActiveAt.lte = new Date(filters.lastActiveTo);
      andConditions.push({ lastActiveAt });
    }

    // G) Search ---------------------------------------------------
    if (filters.search?.trim()) {
      // SEC: limit search length to prevent excessive DB load
      const term = filters.search.trim().slice(0, MAX_SEARCH_LENGTH);
      andConditions.push({
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    // H) Direct user ID restriction (e.g. from a custom list) -----
    if (filters.userIds?.length) {
      andConditions.push({ id: { in: filters.userIds } });
    }

    return { AND: andConditions };
  }

  /** Fetch all member user IDs from a custom list (handles pagination). */
  async getAllCustomListMemberIds(listId: string): Promise<string[]> {
    const PAGE_SIZE = 500;
    const ids: string[] = [];
    let page = 1;
    let done = false;
    while (!done) {
      const skip = (page - 1) * PAGE_SIZE;
      const members = await this.prisma.mailingCustomListMember.findMany({
        where: { listId },
        skip,
        take: PAGE_SIZE,
        select: { userId: true },
        orderBy: { userId: 'asc' },
      });
      ids.push(...members.map((m) => m.userId));
      done = members.length < PAGE_SIZE;
      if (ids.length >= MAX_EXPORT_ROWS) break;
      page++;
    }
    return ids;
  }

  /* ================================================================ */
  /*  PREVIEW                                                          */
  /* ================================================================ */

  async previewRecipients(
    filters: MailingFiltersDto,
    page = 1,
    pageSize = 20,
    sort = 'email',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    // SEC: clamp page size to prevent unbounded DB queries
    const clampedPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const clampedPage = Math.max(1, page);

    const where = this.buildRecipientWhere(filters);
    const skip = (clampedPage - 1) * clampedPageSize;

    // Diagnostic: log the generated WHERE clause on first page request
    if (clampedPage === 1) {
      this.logger.debug(`Preview query WHERE: ${JSON.stringify(where)}`);
    }

    const orderByMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
      email: { email: sortOrder },
      name: { firstName: sortOrder },
      role: { role: sortOrder },
      createdAt: { createdAt: sortOrder },
    };

    const [count, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: clampedPageSize,
        orderBy: orderByMap[sort] || { email: sortOrder },
        include: {
          organizations: {
            take: 1,
            include: { organization: { select: { name: true, canton: true, city: true } } },
          },
          mainSubscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD'] } },
            take: 1,
            select: { status: true },
          },
          notificationPreferences: { select: { marketing: true, mailingListOptOut: true } },
        },
      }),
    ]);

    // Diagnostic: when count is zero on page 1, log total users for context
    if (count === 0 && clampedPage === 1) {
      const [totalUsers, nonAdminUsers] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
            email: { not: null },
          },
        }),
      ]);
      this.logger.warn(
        `Preview returned 0 recipients — total users in DB: ${totalUsers}, non-admin users with email: ${nonAdminUsers}`,
      );
    }

    const rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: u.role,
      orgName: u.organizations[0]?.organization?.name || null,
      canton: u.organizations[0]?.organization?.canton || null,
      isActive: u.isActive,
      hasSubscription: u.mainSubscriptions.length > 0,
      marketingOptIn: u.notificationPreferences?.marketing !== false,
      mailingListOptOut: u.notificationPreferences?.mailingListOptOut === true,
    }));

    // Warnings
    const warnings: string[] = [];
    if (filters.excludeUnsubscribed === false) {
      const optedOut = await this.prisma.user.count({
        where: {
          AND: [
            where,
            { notificationPreferences: { mailingListOptOut: true } },
          ],
        },
      });
      if (optedOut > 0) {
        warnings.push(`Includes ${optedOut} contact(s) who unsubscribed from the mailing list`);
      }
    }

    return {
      count,
      rows,
      warnings,
      page: clampedPage,
      pageSize: clampedPageSize,
      totalPages: Math.ceil(count / clampedPageSize),
    };
  }

  /* ================================================================ */
  /*  SEGMENTS CRUD                                                    */
  /* ================================================================ */

  async createSegment(name: string, filters: MailingFiltersDto, createdById: string, description?: string) {
    const where = this.buildRecipientWhere(filters);
    const estimatedSize = await this.prisma.user.count({ where });

    return this.prisma.mailingSegment.create({
      data: {
        name,
        description,
        filtersJson: filters as any,
        createdById,
        estimatedSize,
        lastComputedAt: new Date(),
      },
    });
  }

  async listSegments(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [segments, total] = await Promise.all([
      this.prisma.mailingSegment.findMany({
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { campaigns: true } } },
      }),
      this.prisma.mailingSegment.count(),
    ]);

    return {
      segments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getSegment(id: string) {
    const segment = await this.prisma.mailingSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('Segment not found');
    return segment;
  }

  async updateSegment(id: string, data: { name?: string; description?: string; filters?: MailingFiltersDto }) {
    const segment = await this.getSegment(id);
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.filters) {
      updateData.filtersJson = data.filters as any;
      const where = this.buildRecipientWhere(data.filters);
      updateData.estimatedSize = await this.prisma.user.count({ where });
      updateData.lastComputedAt = new Date();
    }

    return this.prisma.mailingSegment.update({ where: { id: segment.id }, data: updateData });
  }

  async deleteSegment(id: string) {
    await this.getSegment(id);
    return this.prisma.mailingSegment.delete({ where: { id } });
  }

  async refreshSegmentSize(id: string) {
    const segment = await this.getSegment(id);
    const filters = segment.filtersJson as unknown as MailingFiltersDto;
    const where = this.buildRecipientWhere(filters);
    const estimatedSize = await this.prisma.user.count({ where });

    return this.prisma.mailingSegment.update({
      where: { id },
      data: { estimatedSize, lastComputedAt: new Date() },
    });
  }

  /* ================================================================ */
  /*  EXPORT                                                           */
  /* ================================================================ */

  async exportRecipients(
    filters: MailingFiltersDto,
    columns: string[],
    deduplicateByEmail = true,
    adminId: string,
    segmentId?: string,
  ) {
    const validColumns = columns.filter((c) =>
      (EXPORTABLE_COLUMNS as readonly string[]).includes(c),
    ) as ExportColumn[];

    if (validColumns.length === 0) {
      throw new BadRequestException('At least one valid column is required');
    }

    const where = this.buildRecipientWhere(filters);

    // SEC: cap export to prevent OOM on very large datasets
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { email: 'asc' },
      take: MAX_EXPORT_ROWS,
      include: {
        organizations: {
          take: 1,
          include: {
            organization: {
              select: { name: true, canton: true, city: true, languages: true },
            },
          },
        },
        mainSubscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD'] } },
          take: 1,
          select: { status: true, tier: true },
        },
      },
    });

    // Deduplicate by email
    let exportUsers = users;
    if (deduplicateByEmail) {
      const seen = new Set<string>();
      exportUsers = users.filter((u) => {
        if (!u.email || seen.has(u.email)) return false;
        seen.add(u.email);
        return true;
      });
    }

    // Build rows
    const rows = exportUsers.map((u) => {
      const org = u.organizations[0]?.organization;
      const sub = u.mainSubscriptions[0];
      const row: Record<string, string> = {};

      for (const col of validColumns) {
        switch (col) {
          case 'email':
            row[col] = u.email || '';
            break;
          case 'firstName':
            row[col] = u.firstName || '';
            break;
          case 'lastName':
            row[col] = u.lastName || '';
            break;
          case 'role':
            row[col] = u.role;
            break;
          case 'orgName':
            row[col] = org?.name || '';
            break;
          case 'canton':
            row[col] = org?.canton || '';
            break;
          case 'city':
            row[col] = org?.city || '';
            break;
          case 'languages':
            row[col] = org?.languages?.join(', ') || '';
            break;
          case 'subscriptionStatus':
            row[col] = sub?.status || 'NONE';
            break;
          case 'subscriptionTier':
            row[col] = sub?.tier || '';
            break;
          case 'isActive':
            row[col] = u.isActive ? 'Yes' : 'No';
            break;
          case 'createdAt':
            row[col] = u.createdAt.toISOString();
            break;
          case 'lastActiveAt':
            row[col] = u.lastActiveAt?.toISOString() || '';
            break;
        }
      }
      return row;
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        entity: 'MailingExport',
        entityId: segmentId || 'ad-hoc',
        action: 'export',
        actorId: adminId,
        metadata: { segmentId, columns: validColumns, recordCount: rows.length },
      },
    });

    return { columns: validColumns, rows, count: rows.length };
  }

  /* ================================================================ */
  /*  CAMPAIGNS                                                        */
  /* ================================================================ */

  async createCampaign(
    subject: string,
    bodyHtml: string,
    bodyText: string | undefined,
    createdById: string,
    filters?: MailingFiltersDto,
    segmentId?: string,
  ) {
    let resolvedFilters = filters;

    // If segmentId is provided, load its filters
    if (segmentId) {
      const segment = await this.getSegment(segmentId);
      resolvedFilters = segment.filtersJson as unknown as MailingFiltersDto;
    }

    if (!resolvedFilters) {
      throw new BadRequestException('Either filters or segmentId is required');
    }

    const where = this.buildRecipientWhere(resolvedFilters);
    const totalEstimated = await this.prisma.user.count({ where });

    if (totalEstimated === 0) {
      throw new BadRequestException('No recipients match the given filters');
    }
    if (totalEstimated > MAX_RECIPIENTS_PER_CAMPAIGN) {
      throw new BadRequestException(
        `Recipient count (${totalEstimated}) exceeds maximum of ${MAX_RECIPIENTS_PER_CAMPAIGN}. Please narrow your filters.`,
      );
    }

    // SEC: sanitize HTML to remove script tags, event handlers, and dangerous elements
    const sanitisedHtml = this.sanitiseHtml(bodyHtml);

    // Auto-generate plain text if not provided
    const plainText =
      bodyText || sanitisedHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const campaign = await this.prisma.mailingCampaign.create({
      data: {
        subject: subject.slice(0, 998), // SEC: limit subject length (RFC 2822 max 998 chars)
        bodyHtml: sanitisedHtml,
        bodyText: plainText,
        segmentId: segmentId || null,
        filtersJson: resolvedFilters as any,
        totalEstimated,
        createdById,
        status: MailingCampaignStatus.DRAFT,
      },
    });

    // Audit log — non-critical; must not roll back a successful campaign creation
    try {
      await this.prisma.auditLog.create({
        data: {
          entity: 'MailingCampaign',
          entityId: campaign.id,
          action: 'create',
          actorId: createdById,
          metadata: { subject, segmentId, totalEstimated },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit log failed for campaign ${campaign.id}: ${auditErr?.message}`);
    }

    return { campaignId: campaign.id, estimatedCount: totalEstimated, status: campaign.status };
  }

  async listCampaigns(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [campaigns, total] = await Promise.all([
      this.prisma.mailingCampaign.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { segment: { select: { name: true } } },
      }),
      this.prisma.mailingCampaign.count(),
    ]);

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        totalEstimated: c.totalEstimated,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        segmentName: c.segment?.name || null,
        createdAt: c.createdAt.toISOString(),
        sentAt: c.sentAt?.toISOString() || null,
        completedAt: c.completedAt?.toISOString() || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.mailingCampaign.findUnique({
      where: { id },
      include: { segment: { select: { name: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async cancelCampaign(id: string, adminId: string) {
    const campaign = await this.getCampaign(id);
    if (campaign.status !== MailingCampaignStatus.DRAFT && campaign.status !== MailingCampaignStatus.SENDING) {
      throw new BadRequestException('Can only cancel DRAFT or SENDING campaigns');
    }

    await this.prisma.auditLog.create({
      data: {
        entity: 'MailingCampaign',
        entityId: id,
        action: 'cancel',
        actorId: adminId,
        metadata: { previousStatus: campaign.status },
      },
    });

    return this.prisma.mailingCampaign.update({
      where: { id },
      data: { status: MailingCampaignStatus.CANCELLED },
    });
  }

  /* ================================================================ */
  /*  BATCH SENDING                                                    */
  /* ================================================================ */

  async sendBatch(campaignId: string, batchSize = DEFAULT_BATCH_SIZE) {
    const campaign = await this.getCampaign(campaignId);

    if (
      campaign.status !== MailingCampaignStatus.DRAFT &&
      campaign.status !== MailingCampaignStatus.SENDING
    ) {
      throw new BadRequestException(`Cannot send: campaign status is ${campaign.status}`);
    }

    if (!this.transport.isConfigured()) {
      throw new BadRequestException(
        'No email transport configured. Set MAILGUN_API_KEY + MAILGUN_DOMAIN, MAILING_SMTP_HOST + MAILING_SMTP_USER + MAILING_SMTP_PASS, or SENDGRID_API_KEY in your environment.',
      );
    }

    // Resolve filters from the campaign itself or from the associated segment
    let filters: MailingFiltersDto | null = campaign.filtersJson as unknown as MailingFiltersDto | null;
    if (!filters && campaign.segmentId) {
      const segment = await this.prisma.mailingSegment.findUnique({ where: { id: campaign.segmentId } });
      filters = segment?.filtersJson as unknown as MailingFiltersDto | null;
    }
    if (!filters) {
      throw new BadRequestException('Campaign has no filter configuration');
    }

    const where = this.buildRecipientWhere(filters);

    // Build cursor-based query — fetch next batch of users after the cursor
    const cursorClause: Prisma.UserWhereInput = campaign.cursor
      ? { id: { gt: campaign.cursor } }
      : {};

    const recipients = await this.prisma.user.findMany({
      where: { AND: [where, cursorClause] },
      orderBy: { id: 'asc' },
      take: batchSize,
      include: {
        organizations: {
          take: 1,
          include: {
            organization: { select: { name: true, canton: true } },
          },
        },
      },
    });

    // SEC: optimistic concurrency — prevent duplicate batch sends from parallel requests
    // Only one request should transition DRAFT -> SENDING; others will see SENDING and proceed safely
    // The cursor-based pagination prevents duplicate emails even if two batches run concurrently
    if (campaign.status === MailingCampaignStatus.DRAFT) {
      const updated = await this.prisma.mailingCampaign.updateMany({
        where: { id: campaignId, status: MailingCampaignStatus.DRAFT },
        data: { status: MailingCampaignStatus.SENDING, sentAt: new Date() },
      });
      if (updated.count === 0) {
        // Another request already transitioned this campaign — re-fetch and continue
        const refreshed = await this.getCampaign(campaignId);
        if (refreshed.status !== MailingCampaignStatus.SENDING) {
          throw new ConflictException('Campaign status changed unexpectedly');
        }
      }
    }

    let sentThisBatch = 0;
    let failedThisBatch = 0;
    let lastUserId: string | null = null;

    const unsubscribeBaseUrl = process.env.APP_URL || 'https://procrechesolutions.com';

    for (const recipient of recipients) {
      lastUserId = recipient.id;

      if (!recipient.email) {
        failedThisBatch++;
        continue;
      }

      // SEC: generate signed unsubscribe token (HMAC) so users cannot forge unsubscribe URLs for others
      const org = recipient.organizations[0]?.organization;
      const unsubToken = this.signUnsubscribeToken(recipient.id, campaignId);
      const unsubscribeUrl = `${unsubscribeBaseUrl}/unsubscribe?token=${unsubToken}`;

      // Personalise
      const personalised = this.personalise(campaign.bodyHtml, {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        email: recipient.email,
        role: recipient.role,
        orgName: org?.name || '',
        canton: org?.canton || '',
        unsubscribeUrl,
      });

      const personalisedText = this.personalise(campaign.bodyText || '', {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        email: recipient.email,
        role: recipient.role,
        orgName: org?.name || '',
        canton: org?.canton || '',
        unsubscribeUrl,
      });

      // Append compliance footer
      const htmlWithFooter = this.appendFooter(personalised, unsubscribeUrl);

      const result = await this.transport.sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: htmlWithFooter,
        text: personalisedText,
        tags: ['campaign', campaignId],
        metadata: { campaignId, userId: recipient.id },
      });

      // Log to existing EmailLog table
      try {
        await this.prisma.emailLog.create({
          data: {
            userId: recipient.id,
            event: `campaign:${campaignId}`,
            recipient: recipient.email,
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId || null,
            error: result.error || null,
            payload: { campaignId, provider: result.provider },
          },
        });
      } catch {
        // Don't fail the batch if logging fails
      }

      if (result.success) {
        sentThisBatch++;
      } else {
        failedThisBatch++;
        this.logger.warn(`Failed to send to user ${recipient.id}: ${result.error}`);
      }

      // Inter-email delay
      if (INTER_EMAIL_DELAY_MS > 0) {
        await sleep(INTER_EMAIL_DELAY_MS);
      }
    }

    // Update campaign progress
    const done = recipients.length < batchSize;
    const newSentCount = campaign.sentCount + sentThisBatch;
    const newFailedCount = campaign.failedCount + failedThisBatch;

    await this.prisma.mailingCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: newSentCount,
        failedCount: newFailedCount,
        cursor: lastUserId,
        ...(done
          ? {
              status: MailingCampaignStatus.SENT,
              completedAt: new Date(),
            }
          : {}),
      },
    });

    return {
      sentCountThisBatch: sentThisBatch,
      failedCountThisBatch: failedThisBatch,
      totalSentSoFar: newSentCount,
      totalFailedSoFar: newFailedCount,
      nextCursor: done ? null : lastUserId,
      done,
      totalEstimated: campaign.totalEstimated,
    };
  }

  /* ================================================================ */
  /*  HELPERS                                                          */
  /* ================================================================ */

  private personalise(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      // SEC: only replace known token names (alphanumeric) to prevent regex injection
      if (/^[a-zA-Z0-9_]+$/.test(key)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
      }
    }
    return result;
  }

  /** SEC: strip dangerous HTML tags and attributes to prevent stored XSS in campaign emails. */
  private sanitiseHtml(html: string): string {
    // Remove <script> tags and contents
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove event handler attributes (onclick, onerror, onload, etc.)
    cleaned = cleaned.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Remove javascript: protocol URLs
    cleaned = cleaned.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="');
    cleaned = cleaned.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="');
    // Remove <iframe>, <object>, <embed>, <form>, <input> tags
    cleaned = cleaned.replace(/<\/?(iframe|object|embed|form|input|button|textarea)\b[^>]*>/gi, '');
    // Remove data: URI in src attributes (can be used for XSS)
    cleaned = cleaned.replace(/src\s*=\s*["']?\s*data:/gi, 'src="');
    return cleaned;
  }

  /** SEC: create HMAC-signed unsubscribe token encoding userId + campaignId. */
  signUnsubscribeToken(userId: string, campaignId: string): string {
    const payload = `${userId}:${campaignId}`;
    const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(payload).digest('hex');
    // Token format: base64url(userId:campaignId):hmac
    const encoded = Buffer.from(payload).toString('base64url');
    return `${encoded}.${hmac}`;
  }

  /** SEC: verify an unsubscribe token and extract userId + campaignId. Returns null if invalid. */
  verifyUnsubscribeToken(token: string): { userId: string; campaignId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, hmac] = parts;
    try {
      const payload = Buffer.from(encoded, 'base64url').toString('utf8');
      const expectedHmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(payload).digest('hex');
      // SEC: timing-safe comparison to prevent timing attacks
      if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
        return null;
      }
      const [userId, campaignId] = payload.split(':');
      if (!userId || !campaignId) return null;
      return { userId, campaignId };
    } catch {
      return null;
    }
  }

  private appendFooter(html: string, unsubscribeUrl: string): string {
    // Parse "Name <email>" from BREVO_FROM_EMAIL for footer display
    const fromRaw = process.env.BREVO_FROM_EMAIL ?? '';
    const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : '';
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw.trim();
    // SEC: escape from-address values to prevent HTML injection via env vars
    const escapedName = this.escapeHtml(fromName);
    const escapedEmail = this.escapeHtml(fromEmail);
    const escapedUrl = this.escapeHtml(unsubscribeUrl);
    const footer = `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        <p>${escapedName} &mdash; ${escapedEmail}</p>
        <p><a href="${escapedUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a></p>
      </div>`;
    // Insert before closing body or append
    if (html.includes('</body>')) {
      return html.replace('</body>', `${footer}</body>`);
    }
    return html + footer;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Returns current transport configuration status for admin diagnostics. */
  getTransportStatus() {
    const configured = this.transport.isConfigured();
    const provider = this.transport.getProviderName();

    const vars = {
      smtp: {
        configured: !!(
          process.env.MAILING_SMTP_HOST &&
          process.env.MAILING_SMTP_USER &&
          process.env.MAILING_SMTP_PASS
        ),
        vars: ['MAILING_SMTP_HOST', 'MAILING_SMTP_USER', 'MAILING_SMTP_PASS'],
        present: {
          MAILING_SMTP_HOST: !!process.env.MAILING_SMTP_HOST,
          MAILING_SMTP_USER: !!process.env.MAILING_SMTP_USER,
          MAILING_SMTP_PASS: !!process.env.MAILING_SMTP_PASS,
        },
      },
      mailgun: {
        configured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
        vars: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN'],
        present: {
          MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
          MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
        },
      },
      sendgrid: {
        configured: !!process.env.SENDGRID_API_KEY,
        vars: ['SENDGRID_API_KEY'],
        present: {
          SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
        },
      },
    };

    return {
      configured,
      activeProvider: configured ? provider : null,
      providers: vars,
      fromEmail:
        process.env.MAILING_FROM_EMAIL ||
        process.env.MAILING_SMTP_USER ||
        process.env.FROM_EMAIL ||
        null,
      fromName: process.env.MAILING_FROM_NAME || process.env.FROM_NAME || null,
    };
  }

  /** Resolve filters: either from a segment or from the provided filters directly. */
  async resolveFilters(filters?: MailingFiltersDto, segmentId?: string): Promise<MailingFiltersDto> {
    if (segmentId) {
      const segment = await this.getSegment(segmentId);
      return segment.filtersJson as unknown as MailingFiltersDto;
    }
    if (filters) return filters;
    throw new BadRequestException('Either filters or segmentId is required');
  }

  /* ================================================================ */
  /*  CUSTOM LISTS                                                     */
  /* ================================================================ */

  async createCustomList(name: string, createdById: string, description?: string) {
    return this.prisma.mailingCustomList.create({
      data: { name, description, createdById },
      include: { _count: { select: { members: true } } },
    });
  }

  async listCustomLists(page = 1, pageSize = 50) {
    const clampedPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const clampedPage = Math.max(1, page);
    const skip = (clampedPage - 1) * clampedPageSize;
    const [lists, total] = await Promise.all([
      this.prisma.mailingCustomList.findMany({
        skip,
        take: clampedPageSize,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.mailingCustomList.count(),
    ]);
    return { lists, total, page: clampedPage, pageSize: clampedPageSize, totalPages: Math.ceil(total / clampedPageSize) };
  }

  async getCustomList(id: string) {
    const list = await this.prisma.mailingCustomList.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!list) throw new NotFoundException('Custom list not found');
    return list;
  }

  async updateCustomList(id: string, data: { name?: string; description?: string }) {
    await this.getCustomList(id);
    return this.prisma.mailingCustomList.update({
      where: { id },
      data,
      include: { _count: { select: { members: true } } },
    });
  }

  async deleteCustomList(id: string) {
    await this.getCustomList(id);
    return this.prisma.mailingCustomList.delete({ where: { id } });
  }

  async addUsersToCustomList(listId: string, userIds: string[]) {
    await this.getCustomList(listId);
    // SEC: limit batch size
    const clampedIds = userIds.slice(0, 500);
    try {
      const result = await this.prisma.mailingCustomListMember.createMany({
        data: clampedIds.map((userId) => ({ listId, userId })),
        skipDuplicates: true,
      });
      return { added: result.count, total: clampedIds.length };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('One or more user IDs are invalid');
      }
      throw error;
    }
  }

  async removeUsersFromCustomList(listId: string, userIds: string[]) {
    await this.getCustomList(listId);
    // SEC: limit batch size consistent with addUsersToCustomList
    const clampedIds = userIds.slice(0, 500);
    const deleted = await this.prisma.mailingCustomListMember.deleteMany({
      where: { listId, userId: { in: clampedIds } },
    });
    return { removed: deleted.count };
  }

  async getCustomListMembers(listId: string, page = 1, pageSize = 20) {
    await this.getCustomList(listId);
    const clampedPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const clampedPage = Math.max(1, page);
    const skip = (clampedPage - 1) * clampedPageSize;
    const [members, total] = await Promise.all([
      this.prisma.mailingCustomListMember.findMany({
        where: { listId },
        skip,
        take: clampedPageSize,
        orderBy: { addedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastName: true,
              role: true, isActive: true,
            },
          },
        },
      }),
      this.prisma.mailingCustomListMember.count({ where: { listId } }),
    ]);
    return {
      members: members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName || '',
        lastName: m.user.lastName || '',
        role: m.user.role,
        isActive: m.user.isActive,
        addedAt: m.addedAt.toISOString(),
      })),
      total,
      page: clampedPage,
      pageSize: clampedPageSize,
      totalPages: Math.ceil(total / clampedPageSize),
    };
  }
}
