import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailingTransportService } from './mailing-transport.service';
import { MailingFiltersDto } from './dto/mailing-filters.dto';
import { UserRole, Prisma, MailingCampaignStatus } from '@prisma/client';

const MAX_RECIPIENTS_PER_CAMPAIGN = 2000;
const DEFAULT_BATCH_SIZE = 100;
const INTER_EMAIL_DELAY_MS = parseInt(process.env.MAILING_SMTP_RATE_LIMIT_MS || '100', 10);

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

    // Exclude unsubscribed by default
    if (filters.excludeUnsubscribed !== false) {
      andConditions.push({
        OR: [
          { notificationPreferences: null },
          { notificationPreferences: { marketing: true } },
        ],
      });
    }

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

    // E) Marketing opt-in ----------------------------------------
    if (filters.marketingOptIn === true) {
      andConditions.push({ notificationPreferences: { marketing: true } });
    } else if (filters.marketingOptIn === false) {
      andConditions.push({ notificationPreferences: { marketing: false } });
    }

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
      const term = filters.search.trim();
      andConditions.push({
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: andConditions };
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
    const where = this.buildRecipientWhere(filters);
    const skip = (page - 1) * pageSize;

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
        take: pageSize,
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
          notificationPreferences: { select: { marketing: true } },
        },
      }),
    ]);

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
    }));

    // Warnings
    const warnings: string[] = [];
    if (filters.excludeUnsubscribed === false) {
      const optedOut = await this.prisma.user.count({
        where: {
          ...where,
          notificationPreferences: { marketing: false },
        },
      });
      if (optedOut > 0) {
        warnings.push(`Includes ${optedOut} contact(s) who opted out of marketing emails`);
      }
    }

    return {
      count,
      rows,
      warnings,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
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

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { email: 'asc' },
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
    if (!this.transport.isConfigured()) {
      throw new BadRequestException(
        'No email transport configured. Set MAILING_SMTP_HOST, MAILGUN_API_KEY, or SENDGRID_API_KEY.',
      );
    }

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

    // Auto-generate plain text if not provided
    const plainText =
      bodyText || bodyHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const campaign = await this.prisma.mailingCampaign.create({
      data: {
        subject,
        bodyHtml,
        bodyText: plainText,
        segmentId: segmentId || null,
        filtersJson: resolvedFilters as any,
        totalEstimated,
        createdById,
        status: MailingCampaignStatus.DRAFT,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        entity: 'MailingCampaign',
        entityId: campaign.id,
        action: 'create',
        actorId: createdById,
        metadata: { subject, segmentId, totalEstimated },
      },
    });

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
      throw new BadRequestException('No email transport configured');
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

    // Mark campaign as SENDING on first batch
    if (campaign.status === MailingCampaignStatus.DRAFT) {
      await this.prisma.mailingCampaign.update({
        where: { id: campaignId },
        data: { status: MailingCampaignStatus.SENDING, sentAt: new Date() },
      });
    }

    let sentThisBatch = 0;
    let failedThisBatch = 0;
    let lastUserId: string | null = null;

    const fromAddress = this.transport.getFromAddress();
    const unsubscribeBaseUrl = process.env.APP_URL || 'https://procrechesolutions.com';

    for (const recipient of recipients) {
      lastUserId = recipient.id;

      if (!recipient.email) {
        failedThisBatch++;
        continue;
      }

      // Personalise
      const org = recipient.organizations[0]?.organization;
      const personalised = this.personalise(campaign.bodyHtml, {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        email: recipient.email,
        role: recipient.role,
        orgName: org?.name || '',
        canton: org?.canton || '',
        unsubscribeUrl: `${unsubscribeBaseUrl}/unsubscribe?uid=${recipient.id}&cid=${campaignId}`,
      });

      const personalisedText = this.personalise(campaign.bodyText || '', {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        email: recipient.email,
        role: recipient.role,
        orgName: org?.name || '',
        canton: org?.canton || '',
        unsubscribeUrl: `${unsubscribeBaseUrl}/unsubscribe?uid=${recipient.id}&cid=${campaignId}`,
      });

      // Append compliance footer
      const htmlWithFooter = this.appendFooter(personalised, `${unsubscribeBaseUrl}/unsubscribe?uid=${recipient.id}&cid=${campaignId}`);

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
        this.logger.warn(`Failed to send to ${recipient.email}: ${result.error}`);
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
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return result;
  }

  private appendFooter(html: string, unsubscribeUrl: string): string {
    const fromAddr = this.transport.getFromAddress();
    const footer = `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        <p>${fromAddr.name} &mdash; ${fromAddr.email}</p>
        <p><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a></p>
      </div>`;
    // Insert before closing body or append
    if (html.includes('</body>')) {
      return html.replace('</body>', `${footer}</body>`);
    }
    return html + footer;
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
}
