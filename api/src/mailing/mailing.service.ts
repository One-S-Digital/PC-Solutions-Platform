import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MailingCampaignStatus, MailingListType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailTransportService } from './mail-transport.service';
import { signUnsubscribeToken, UnsubscribeScope } from './unsubscribe-token.util';

export interface MailingRecipient {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  organizationName?: string | null;
  region?: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function csvEscape(value: string | null | undefined): string {
  const s = (value ?? '').toString();
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailTransport: MailTransportService,
  ) {}

  private async getProfileIdFromClerkId(clerkId: string | undefined | null): Promise<string | null> {
    if (!clerkId) return null;
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async listMailingLists(params: { search?: string } = {}) {
    const where: Prisma.MailingListWhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};

    const lists = await this.prisma.mailingList.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { members: true, campaigns: true, listOptOuts: true } },
      },
    });

    return { success: true, data: lists };
  }

  async getMailingList(id: string) {
    const list = await this.prisma.mailingList.findUnique({
      where: { id },
      include: {
        members: { select: { userId: true } },
        _count: { select: { members: true, campaigns: true, listOptOuts: true } },
      },
    });
    if (!list) throw new NotFoundException('Mailing list not found');
    return { success: true, data: list };
  }

  async createMailingList(
    actorClerkId: string | undefined,
    data: {
      name: string;
      type: MailingListType;
      roles?: UserRole[];
      regions?: string[];
      includeInactive?: boolean;
      memberUserIds?: string[];
    },
  ) {
    const createdById = await this.getProfileIdFromClerkId(actorClerkId);

    const list = await this.prisma.mailingList.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        roles: data.roles ?? [],
        regions: (data.regions ?? []).filter(Boolean),
        includeInactive: Boolean(data.includeInactive),
        createdById: createdById ?? undefined,
      },
    });

    if (data.type === MailingListType.CUSTOM) {
      const memberUserIds = Array.isArray(data.memberUserIds) ? data.memberUserIds.filter(Boolean) : [];
      if (memberUserIds.length > 0) {
        await this.prisma.mailingListMember.createMany({
          data: memberUserIds.map((userId) => ({ mailingListId: list.id, userId })),
          skipDuplicates: true,
        });
      }
    }

    return this.getMailingList(list.id);
  }

  async updateMailingList(
    id: string,
    data: {
      name?: string;
      type?: MailingListType;
      roles?: UserRole[];
      regions?: string[];
      includeInactive?: boolean;
      memberUserIds?: string[];
    },
  ) {
    const existing = await this.prisma.mailingList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mailing list not found');

    const nextType = data.type ?? existing.type;
    const list = await this.prisma.mailingList.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.roles !== undefined && { roles: data.roles }),
        ...(data.regions !== undefined && { regions: (data.regions ?? []).filter(Boolean) }),
        ...(data.includeInactive !== undefined && { includeInactive: Boolean(data.includeInactive) }),
      },
    });

    // Sync members if provided (only meaningful for CUSTOM lists)
    if (data.memberUserIds !== undefined) {
      const desired = new Set((data.memberUserIds ?? []).filter(Boolean));
      await this.prisma.mailingListMember.deleteMany({
        where: { mailingListId: id, userId: { notIn: Array.from(desired) } },
      });
      if (desired.size > 0) {
        await this.prisma.mailingListMember.createMany({
          data: Array.from(desired).map((userId) => ({ mailingListId: id, userId })),
          skipDuplicates: true,
        });
      }
    } else if (nextType !== MailingListType.CUSTOM && existing.type === MailingListType.CUSTOM) {
      // If list type was changed away from CUSTOM, clear members
      await this.prisma.mailingListMember.deleteMany({ where: { mailingListId: id } });
    }

    return this.getMailingList(list.id);
  }

  async deleteMailingList(id: string) {
    await this.prisma.mailingList.delete({ where: { id } });
    return { success: true };
  }

  async getAvailableRegions(): Promise<{ success: true; data: string[] }> {
    const [users, orgs] = await Promise.all([
      this.prisma.user.findMany({
        select: { region: true },
        where: { region: { not: null } },
      }),
      this.prisma.organization.findMany({
        select: { canton: true, region: true, regionsServed: true },
      }),
    ]);

    const set = new Set<string>();
    for (const u of users) {
      if (u.region?.trim()) set.add(u.region.trim());
    }
    for (const o of orgs) {
      if (o.canton?.trim()) set.add(o.canton.trim());
      if (o.region?.trim()) set.add(o.region.trim());
      for (const r of o.regionsServed || []) {
        if (r?.trim()) set.add(r.trim());
      }
    }

    return { success: true, data: Array.from(set).sort((a, b) => a.localeCompare(b)) };
  }

  async searchUsers(params: {
    search?: string;
    roles?: UserRole[];
    regions?: string[];
    page?: number;
    limit?: number;
  }): Promise<{
    success: true;
    data: { users: MailingRecipient[]; meta: { page: number; limit: number; total: number; totalPages: number } };
  }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(params.search?.trim()
        ? {
            OR: [
              { email: { contains: params.search.trim(), mode: 'insensitive' } },
              { firstName: { contains: params.search.trim(), mode: 'insensitive' } },
              { lastName: { contains: params.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.roles && params.roles.length > 0 ? { role: { in: params.roles } } : {}),
      ...(params.regions && params.regions.length > 0
        ? {
            OR: [
              { region: { in: params.regions } },
              {
                organizations: {
                  some: {
                    organization: {
                      OR: [
                        { canton: { in: params.regions } },
                        { region: { in: params.regions } },
                        { regionsServed: { hasSome: params.regions } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          region: true,
          organizations: {
            take: 1,
            select: {
              organization: {
                select: { name: true, canton: true, region: true, regionsServed: true },
              },
            },
          },
        },
      }),
    ]);

    const mapped: MailingRecipient[] = users
      .filter((u) => Boolean(u.email))
      .map((u) => {
        const org = u.organizations?.[0]?.organization;
        const computedRegion = org?.canton || org?.region || u.region || null;
        return {
          userId: u.id,
          email: u.email!,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          organizationName: org?.name || null,
          region: computedRegion,
        };
      });

    return {
      success: true,
      data: {
        users: mapped,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    };
  }

  async resolveRecipients(mailingListId: string): Promise<MailingRecipient[]> {
    const list = await this.prisma.mailingList.findUnique({
      where: { id: mailingListId },
      include: { members: { select: { userId: true } } },
    });
    if (!list) throw new NotFoundException('Mailing list not found');

    const memberIds = list.type === MailingListType.CUSTOM ? list.members.map((m) => m.userId) : undefined;
    if (list.type === MailingListType.CUSTOM && (!memberIds || memberIds.length === 0)) {
      return [];
    }

    const where: Prisma.UserWhereInput = {
      email: { not: null },
      ...(list.includeInactive ? {} : { isActive: true }),
      ...(list.roles.length > 0 ? { role: { in: list.roles } } : {}),
      ...(memberIds ? { id: { in: memberIds } } : {}),
      ...(list.regions.length > 0
        ? {
            OR: [
              { region: { in: list.regions } },
              {
                organizations: {
                  some: {
                    organization: {
                      OR: [
                        { canton: { in: list.regions } },
                        { region: { in: list.regions } },
                        { regionsServed: { hasSome: list.regions } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [globalOptOuts, listOptOuts] = await Promise.all([
      this.prisma.mailingGlobalOptOut.findMany({ select: { email: true } }),
      this.prisma.mailingListOptOut.findMany({ where: { mailingListId }, select: { email: true } }),
    ]);
    const globalSet = new Set(globalOptOuts.map((o) => normalizeEmail(o.email)));
    const listSet = new Set(listOptOuts.map((o) => normalizeEmail(o.email)));

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        region: true,
        organizations: {
          take: 1,
          select: {
            organization: { select: { name: true, canton: true, region: true } },
          },
        },
      },
    });

    return users
      .filter((u) => Boolean(u.email))
      .map((u) => {
        const org = u.organizations?.[0]?.organization;
        const computedRegion = org?.canton || org?.region || u.region || null;
        return {
          userId: u.id,
          email: u.email!,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          organizationName: org?.name || null,
          region: computedRegion,
        };
      })
      .filter((r) => {
        const e = normalizeEmail(r.email);
        return !globalSet.has(e) && !listSet.has(e);
      });
  }

  async previewRecipients(mailingListId: string, limit = 20) {
    const recipients = await this.resolveRecipients(mailingListId);
    return {
      success: true,
      data: {
        total: recipients.length,
        sample: recipients.slice(0, Math.max(1, Math.min(100, limit))),
      },
    };
  }

  async previewRecipientsForDefinition(def: {
    type: MailingListType;
    roles?: UserRole[];
    regions?: string[];
    includeInactive?: boolean;
    memberUserIds?: string[];
    limit?: number;
  }) {
    const type = def.type;
    const roles = def.roles ?? [];
    const regions = (def.regions ?? []).filter(Boolean);
    const includeInactive = Boolean(def.includeInactive);
    const memberIds = type === MailingListType.CUSTOM ? (def.memberUserIds ?? []).filter(Boolean) : undefined;

    if (type === MailingListType.CUSTOM && (!memberIds || memberIds.length === 0)) {
      return { success: true, data: { total: 0, sample: [] } };
    }

    const where: Prisma.UserWhereInput = {
      email: { not: null },
      ...(includeInactive ? {} : { isActive: true }),
      ...(roles.length > 0 ? { role: { in: roles } } : {}),
      ...(memberIds ? { id: { in: memberIds } } : {}),
      ...(regions.length > 0
        ? {
            OR: [
              { region: { in: regions } },
              {
                organizations: {
                  some: {
                    organization: {
                      OR: [
                        { canton: { in: regions } },
                        { region: { in: regions } },
                        { regionsServed: { hasSome: regions } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const globalOptOuts = await this.prisma.mailingGlobalOptOut.findMany({ select: { email: true } });
    const globalSet = new Set(globalOptOuts.map((o) => normalizeEmail(o.email)));

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        region: true,
        organizations: {
          take: 1,
          select: {
            organization: { select: { name: true, canton: true, region: true } },
          },
        },
      },
    });

    const recipients = users
      .filter((u) => Boolean(u.email))
      .map((u) => {
        const org = u.organizations?.[0]?.organization;
        const computedRegion = org?.canton || org?.region || u.region || null;
        return {
          userId: u.id,
          email: u.email!,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          organizationName: org?.name || null,
          region: computedRegion,
        } satisfies MailingRecipient;
      })
      .filter((r) => !globalSet.has(normalizeEmail(r.email)));

    const limit = Math.max(1, Math.min(100, Number(def.limit || 20)));
    return { success: true, data: { total: recipients.length, sample: recipients.slice(0, limit) } };
  }

  async exportRecipientsCsv(mailingListId: string): Promise<{ filename: string; csv: string }> {
    const recipients = await this.resolveRecipients(mailingListId);
    const header = ['email', 'firstName', 'lastName', 'role', 'organizationName', 'region'];
    const lines = [
      header.join(','),
      ...recipients.map((r) =>
        [
          csvEscape(r.email),
          csvEscape(r.firstName ?? ''),
          csvEscape(r.lastName ?? ''),
          csvEscape(r.role),
          csvEscape(r.organizationName ?? ''),
          csvEscape(r.region ?? ''),
        ].join(','),
      ),
    ];
    const csv = lines.join('\n');
    return { filename: `mailing-list-${mailingListId}.csv`, csv };
  }

  async createCampaign(actorClerkId: string | undefined, data: {
    mailingListId: string;
    subject: string;
    htmlContent?: string;
    textContent?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
  }) {
    const createdById = await this.getProfileIdFromClerkId(actorClerkId);
    const list = await this.prisma.mailingList.findUnique({ where: { id: data.mailingListId } });
    if (!list) throw new NotFoundException('Mailing list not found');

    const campaign = await this.prisma.mailingCampaign.create({
      data: {
        mailingListId: data.mailingListId,
        subject: data.subject.trim(),
        htmlContent: data.htmlContent ?? null,
        textContent: data.textContent ?? null,
        fromName: data.fromName ?? null,
        fromEmail: data.fromEmail ?? null,
        replyTo: data.replyTo ?? null,
        createdById: createdById ?? undefined,
      },
    });
    return { success: true, data: campaign };
  }

  private buildUnsubscribeUrls(email: string, mailingListId: string) {
    const secret = process.env.MAILING_UNSUBSCRIBE_SECRET || process.env.CLERK_WEBHOOK_SECRET || 'dev-secret';
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/g, '');

    const listToken = signUnsubscribeToken(
      { email, scope: 'LIST' as UnsubscribeScope, listId: mailingListId, exp },
      secret,
    );
    const globalToken = signUnsubscribeToken(
      { email, scope: 'GLOBAL' as UnsubscribeScope, exp },
      secret,
    );

    const listUrl = `${baseUrl}/api/mailing/unsubscribe?token=${encodeURIComponent(listToken)}`;
    const globalUrl = `${baseUrl}/api/mailing/unsubscribe?token=${encodeURIComponent(globalToken)}`;
    return { listUrl, globalUrl };
  }

  private appendUnsubscribeFooter(params: { html?: string | null; text?: string | null; listUrl: string; globalUrl: string }) {
    const htmlBody = params.html ?? '';
    const textBody = params.text ?? '';
    const footerHtml = `
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#6b7280;margin:0;">
        Don’t want these emails?
        <a href="${params.listUrl}" style="color:#2563eb;">Unsubscribe from this mailing list</a>
        or
        <a href="${params.globalUrl}" style="color:#2563eb;">unsubscribe from all admin mailings</a>.
      </p>
    `.trim();

    const footerText =
      `\n\n---\n` +
      `Unsubscribe options:\n` +
      `- Unsubscribe from this mailing list: ${params.listUrl}\n` +
      `- Unsubscribe from all admin mailings: ${params.globalUrl}\n`;

    return {
      html: `${htmlBody}\n${footerHtml}`.trim(),
      text: `${textBody}${footerText}`.trim(),
    };
  }

  async sendCampaign(params: {
    campaignId: string;
    dryRun?: boolean;
    testEmail?: string;
  }) {
    const campaign = await this.prisma.mailingCampaign.findUnique({ where: { id: params.campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === MailingCampaignStatus.SENDING) {
      throw new BadRequestException('Campaign is already sending');
    }

    const list = await this.prisma.mailingList.findUnique({ where: { id: campaign.mailingListId } });
    if (!list) throw new NotFoundException('Mailing list not found');

    const fromEmail = campaign.fromEmail || process.env.FROM_EMAIL || 'noreply@procreche.ch';
    const fromName = campaign.fromName || process.env.FROM_NAME || 'Pro Crèche Solutions';

    const recipients = params.testEmail
      ? [
          {
            userId: '',
            email: params.testEmail,
            firstName: null,
            lastName: null,
            role: UserRole.ADMIN,
            organizationName: null,
            region: null,
          } satisfies MailingRecipient,
        ]
      : await this.resolveRecipients(campaign.mailingListId);

    await this.prisma.mailingCampaign.update({
      where: { id: campaign.id },
      data: {
        status: MailingCampaignStatus.SENDING,
        totalRecipients: recipients.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        lastError: null,
      },
    });

    // Pre-create deliveries (skip duplicates)
    if (!params.testEmail) {
      const chunkSize = 500;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        await this.prisma.mailingCampaignDelivery.createMany({
          data: chunk.map((r) => ({
            campaignId: campaign.id,
            email: r.email,
            userId: r.userId || null,
          })),
          skipDuplicates: true,
        });
      }
    }

    if (params.dryRun) {
      await this.prisma.mailingCampaign.update({
        where: { id: campaign.id },
        data: {
          status: MailingCampaignStatus.DRAFT,
        },
      });
      return { success: true, data: { dryRun: true, totalRecipients: recipients.length } };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const r of recipients) {
      const email = r.email;
      if (!email) {
        skipped++;
        continue;
      }

      const { listUrl, globalUrl } = this.buildUnsubscribeUrls(email, campaign.mailingListId);
      const headers = {
        'List-Unsubscribe': `<${listUrl}>, <${globalUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };

      const { html, text } = this.appendUnsubscribeFooter({
        html: campaign.htmlContent,
        text: campaign.textContent,
        listUrl,
        globalUrl,
      });

      try {
        await this.mailTransport.sendMail({
          to: email,
          from: { email: fromEmail, name: fromName },
          subject: campaign.subject,
          html,
          text,
          replyTo: campaign.replyTo || undefined,
          headers,
        });

        sent++;
        if (!params.testEmail) {
          await this.prisma.mailingCampaignDelivery.upsert({
            where: { campaignId_email: { campaignId: campaign.id, email } },
            update: { status: 'SENT', sentAt: new Date(), error: null },
            create: { campaignId: campaign.id, email, status: 'SENT', sentAt: new Date() },
          });
        }
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Failed to send to ${email}: ${message}`);
        if (!params.testEmail) {
          await this.prisma.mailingCampaignDelivery.upsert({
            where: { campaignId_email: { campaignId: campaign.id, email } },
            update: { status: 'FAILED', error: message },
            create: { campaignId: campaign.id, email, status: 'FAILED', error: message },
          });
        }
      }

      await this.prisma.mailingCampaign.update({
        where: { id: campaign.id },
        data: { sentCount: sent, failedCount: failed, skippedCount: skipped },
      });
    }

    const finalStatus = failed > 0 && sent === 0 ? MailingCampaignStatus.FAILED : MailingCampaignStatus.SENT;
    await this.prisma.mailingCampaign.update({
      where: { id: campaign.id },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
      },
    });

    return { success: true, data: { sent, failed, skipped, total: recipients.length } };
  }

  async listCampaigns(mailingListId?: string) {
    const campaigns = await this.prisma.mailingCampaign.findMany({
      where: mailingListId ? { mailingListId } : {},
      orderBy: { createdAt: 'desc' },
      include: { mailingList: { select: { name: true } } },
    });
    return { success: true, data: campaigns };
  }

  async createOptOut(params: { email: string; scope: 'GLOBAL' | 'LIST'; mailingListId?: string; reason?: string }) {
    const email = normalizeEmail(params.email);
    if (params.scope === 'GLOBAL') {
      const row = await this.prisma.mailingGlobalOptOut.upsert({
        where: { email },
        update: { reason: params.reason ?? null },
        create: { email, reason: params.reason ?? null },
      });
      return { success: true, data: row };
    }

    if (!params.mailingListId) throw new BadRequestException('mailingListId is required for LIST opt-outs');

    const row = await this.prisma.mailingListOptOut.upsert({
      where: { mailingListId_email: { mailingListId: params.mailingListId, email } },
      update: { reason: params.reason ?? null },
      create: { mailingListId: params.mailingListId, email, reason: params.reason ?? null },
    });
    return { success: true, data: row };
  }

  async listOptOuts(params: { search?: string; scope?: 'GLOBAL' | 'LIST'; mailingListId?: string } = {}) {
    const search = params.search?.trim();

    const [global, list] = await Promise.all([
      params.scope && params.scope !== 'GLOBAL'
        ? Promise.resolve([])
        : this.prisma.mailingGlobalOptOut.findMany({
            where: search ? { email: { contains: search, mode: 'insensitive' } } : {},
            orderBy: { createdAt: 'desc' },
          }),
      params.scope && params.scope !== 'LIST'
        ? Promise.resolve([])
        : this.prisma.mailingListOptOut.findMany({
            where: {
              ...(params.mailingListId ? { mailingListId: params.mailingListId } : {}),
              ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: { mailingList: { select: { name: true } } },
          }),
    ]);

    return { success: true, data: { global, list } };
  }

  async deleteOptOut(params: { scope: 'GLOBAL' | 'LIST'; id: string }) {
    if (params.scope === 'GLOBAL') {
      await this.prisma.mailingGlobalOptOut.delete({ where: { id: params.id } });
      return { success: true };
    }
    await this.prisma.mailingListOptOut.delete({ where: { id: params.id } });
    return { success: true };
  }

  async applyPublicUnsubscribe(payload: { email: string; scope: UnsubscribeScope; listId?: string }) {
    const email = normalizeEmail(payload.email);
    const user = await this.prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (payload.scope === 'GLOBAL') {
      await this.prisma.mailingGlobalOptOut.upsert({
        where: { email },
        update: { userId: user?.id ?? null, reason: 'Unsubscribed via email link' },
        create: { email, userId: user?.id ?? null, reason: 'Unsubscribed via email link' },
      });
      return { scope: 'GLOBAL' as const };
    }

    if (!payload.listId) throw new BadRequestException('Missing listId');
    await this.prisma.mailingListOptOut.upsert({
      where: { mailingListId_email: { mailingListId: payload.listId, email } },
      update: { userId: user?.id ?? null, reason: 'Unsubscribed via email link' },
      create: { mailingListId: payload.listId, email, userId: user?.id ?? null, reason: 'Unsubscribed via email link' },
    });
    return { scope: 'LIST' as const };
  }

  async testEmailConnection() {
    const result = await this.mailTransport.testEmailConnection();
    return { success: result.success, data: result };
  }
}

