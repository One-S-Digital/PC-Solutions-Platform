import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EducatorApprovalStatus, NotificationType, ReplacementMatchStatus, ReplacementRequestStatus, UrgencyLevel, UserRole } from '@prisma/client';
import { CreateReplacementRequestDto } from './dto/create-replacement-request.dto';
import { UpdateReplacementRequestDto } from './dto/update-replacement-request.dto';
import { RespondMatchDto } from './dto/respond-match.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailNotificationService } from '../email-notification/email-notification.service';

@Injectable()
export class ReplacementsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private emailNotificationService: EmailNotificationService,
    private configService: ConfigService,
  ) {}

  private async notify(userId: string, type: NotificationType, title: string, body: string, link?: string) {
    const notification = await this.notificationsService.create({ userId, type, title, body, link });
    this.notificationsGateway.pushNotification(userId, notification);
    return notification;
  }

  private async isFeatureEnabled(flagKey: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: flagKey } });
    return flag ? flag.isActive : true;
  }

  private resolveAppUrl(): string {
    return this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || '';
  }

  // ── Requests ──────────────────────────────────────────────────────────────

  async createRequest(dto: CreateReplacementRequestDto, foundationId: string, userId: string) {
    return this.prisma.replacementRequest.create({
      data: {
        foundationId,
        requestedById: userId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        shiftStart: dto.shiftStart,
        shiftEnd: dto.shiftEnd,
        role: dto.role,
        description: dto.description,
        location: dto.location,
        urgency: dto.urgency ?? UrgencyLevel.NORMAL,
      },
      include: { matches: { include: { educator: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
  }

  async findAllRequests(filters: {
    foundationId?: string;
    status?: string;
    isAdmin?: boolean;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.foundationId) where.foundationId = filters.foundationId;
    if (filters.status) where.status = filters.status;

    return this.prisma.replacementRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        foundation: { select: { id: true, name: true } },
        matches: {
          include: {
            educator: { select: { id: true, firstName: true, lastName: true, jobRole: true, region: true } },
          },
        },
      },
    });
  }

  async findRequestById(id: string, viewer?: { callerId: string; callerRole: UserRole }) {
    const isEducator = viewer?.callerRole === UserRole.EDUCATOR;
    const request = await this.prisma.replacementRequest.findUnique({
      where: { id },
      include: {
        foundation: { select: { id: true, name: true } },
        matches: {
          // Educators can only see their own match entry; foundation/admin see all
          where: isEducator ? { educatorId: viewer!.callerId } : undefined,
          include: {
            educator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                ...(isEducator ? {} : { email: true, skills: true, cvUrl: true }),
                jobRole: true,
                region: true,
              },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Replacement request not found');
    return request;
  }

  async updateRequest(id: string, dto: UpdateReplacementRequestDto, foundationId: string, isAdmin: boolean) {
    const request = await this.prisma.replacementRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Replacement request not found');
    if (!isAdmin && request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only update your own replacement requests');
    }
    return this.prisma.replacementRequest.update({
      where: { id },
      data: dto,
    });
  }

  async cancelRequest(id: string, foundationId: string, isAdmin: boolean) {
    const request = await this.prisma.replacementRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Replacement request not found');
    if (!isAdmin && request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only cancel your own replacement requests');
    }
    if (request.status === ReplacementRequestStatus.FILLED) {
      throw new BadRequestException('Cannot cancel a filled replacement request');
    }
    return this.prisma.replacementRequest.update({
      where: { id },
      data: { status: ReplacementRequestStatus.CANCELLED },
    });
  }

  // ── Matches ───────────────────────────────────────────────────────────────

  async proposeMatch(requestId: string, educatorId: string, foundationId: string, isAdmin: boolean) {
    const request = await this.prisma.replacementRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Replacement request not found');
    if (!isAdmin && request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only propose matches for your own replacement requests');
    }
    if (request.status !== ReplacementRequestStatus.OPEN) {
      throw new BadRequestException('Can only propose matches for OPEN requests');
    }

    const existing = await this.prisma.replacementMatch.findUnique({
      where: { requestId_educatorId: { requestId, educatorId } },
    });
    if (existing) throw new BadRequestException('Match already exists for this educator');

    const match = await this.prisma.replacementMatch.create({
      data: { requestId, educatorId },
      include: { educator: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Update request to MATCHED if still OPEN
    await this.prisma.replacementRequest.update({
      where: { id: requestId },
      data: { status: ReplacementRequestStatus.MATCHED },
    });

    // Notify educator of the proposed match
    await this.notify(
      educatorId,
      NotificationType.REPLACEMENT_MATCH_PROPOSED,
      'Replacement match proposed',
      `You have been proposed for a replacement shift: ${request.role}`,
      `/educator/replacements`,
    );

    // Send email to educator (fire-and-forget — never block the response)
    const educator = match.educator;
    if (educator?.email) {
      this.isFeatureEnabled('v2_staffing_emails').then(enabled => {
        if (!enabled) return;
        const appUrl = this.resolveAppUrl();
        return this.emailNotificationService.sendNotification({
          event: 'replacement_match_proposed',
          recipient: educator.email!,
          recipientName: educator.firstName ?? undefined,
          payload: {
            firstName: educator.firstName ?? 'there',
            role: request.role,
            startDate: request.startDate.toISOString().slice(0, 10),
            endDate: request.endDate.toISOString().slice(0, 10),
            location: request.location ?? '',
            requestUrl: appUrl ? `${appUrl}/educator/replacements` : '',
          },
        });
      }).catch(() => {});
    }

    return match;
  }

  async respondToMatch(matchId: string, dto: RespondMatchDto, educatorId: string, isAdmin: boolean) {
    const match = await this.prisma.replacementMatch.findUnique({
      where: { id: matchId },
      include: {
        request: {
          include: { requestedBy: { select: { id: true, firstName: true, email: true } } },
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (!isAdmin && match.educatorId !== educatorId) {
      throw new ForbiddenException('You can only respond to your own matches');
    }

    const updated = await this.prisma.replacementMatch.update({
      where: { id: matchId },
      data: {
        status: dto.status,
        note: dto.note,
        respondedAt: new Date(),
      },
    });

    // If confirmed, mark request as FILLED
    if (dto.status === ReplacementMatchStatus.CONFIRMED) {
      await this.prisma.replacementRequest.update({
        where: { id: match.requestId },
        data: { status: ReplacementRequestStatus.FILLED },
      });
    }

    // Notify the foundation's requester about the educator's response
    const notifType =
      dto.status === ReplacementMatchStatus.ACCEPTED
        ? NotificationType.REPLACEMENT_MATCH_ACCEPTED
        : dto.status === ReplacementMatchStatus.DECLINED
          ? NotificationType.REPLACEMENT_MATCH_DECLINED
          : NotificationType.REPLACEMENT_MATCH_CONFIRMED;

    await this.notify(
      match.request.requestedById,
      notifType,
      `Replacement match ${dto.status.toLowerCase()}`,
      `An educator has ${dto.status.toLowerCase()} your replacement request.`,
      `/foundation/replacements`,
    );

    // Send email to the foundation's requester for accepted/declined responses
    type Requester = { id: string; firstName: string | null; email: string | null } | null;
    const requester = (match.request as typeof match.request & { requestedBy: Requester }).requestedBy;
    const emailEvent =
      dto.status === ReplacementMatchStatus.ACCEPTED
        ? 'replacement_match_accepted'
        : dto.status === ReplacementMatchStatus.DECLINED
          ? 'replacement_match_declined'
          : null;

    if (emailEvent && requester?.email) {
      this.isFeatureEnabled('v2_staffing_emails').then(enabled => {
        if (!enabled) return;
        const appUrl = this.resolveAppUrl();
        return this.emailNotificationService.sendNotification({
          event: emailEvent!,
          recipient: requester!.email!,
          recipientName: requester!.firstName ?? undefined,
          payload: {
            firstName: requester!.firstName ?? 'there',
            role: match.request.role,
            startDate: match.request.startDate.toISOString().slice(0, 10),
            endDate: match.request.endDate.toISOString().slice(0, 10),
            requestUrl: appUrl ? `${appUrl}/foundation/replacements` : '',
          },
        });
      }).catch(() => {});
    }

    return updated;
  }

  async getMyMatches(educatorId: string) {
    return this.prisma.replacementMatch.findMany({
      where: { educatorId },
      orderBy: { proposedAt: 'desc' },
      include: {
        request: {
          include: { foundation: { select: { id: true, name: true } } },
        },
      },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getKpiMetrics(foundationId?: string) {
    const where = foundationId ? { foundationId } : {};

    // Time-to-hire: avg days from OPEN → FILLED
    const filled = await this.prisma.replacementRequest.findMany({
      where: { ...where, status: ReplacementRequestStatus.FILLED },
      select: { createdAt: true, updatedAt: true },
    });

    const avgFulfillmentDays =
      filled.length === 0
        ? null
        : filled.reduce((sum, r) => {
            const days = (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / filled.length;

    const signals = await this.getStaffingSignals(foundationId);

    return {
      ...signals,
      avgFulfillmentDays: avgFulfillmentDays !== null ? Math.round(avgFulfillmentDays * 10) / 10 : null,
      filledCount: filled.length,
    };
  }

  async getStaffingSignals(foundationId?: string) {
    const requestWhere = foundationId ? { foundationId } : {};

    const [openRequests, matchedRequests, filledRequests, replacementPoolSize] =
      await this.prisma.$transaction([
        this.prisma.replacementRequest.count({
          where: { ...requestWhere, status: ReplacementRequestStatus.OPEN },
        }),
        this.prisma.replacementRequest.count({
          where: { ...requestWhere, status: ReplacementRequestStatus.MATCHED },
        }),
        this.prisma.replacementRequest.count({
          where: { ...requestWhere, status: ReplacementRequestStatus.FILLED },
        }),
        this.prisma.user.count({
          where: { role: UserRole.EDUCATOR, availableForReplacement: true, isActive: true },
        }),
      ]);

    return { openRequests, matchedRequests, filledRequests, replacementPoolSize };
  }

  // ── Educator availability toggle (Phase 3) ────────────────────────────────

  async toggleReplacementAvailability(userId: string, available: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { availableForReplacement: available },
      select: { id: true, availableForReplacement: true },
    });
  }

  async findAvailableEducators(filters?: { role?: string; region?: string }) {
    const roleFilter = filters?.role
      ? {
          OR: [
            { jobRole: { contains: filters.role, mode: 'insensitive' as const } },
            { jobRoles: { has: filters.role } },
          ],
        }
      : {};

    return this.prisma.user.findMany({
      where: {
        role: UserRole.EDUCATOR,
        availableForReplacement: true,
        candidatePoolVisible: true,
        isActive: true,
        approvalStatus: EducatorApprovalStatus.APPROVED,
        ...(filters?.region ? { region: filters.region } : {}),
        ...roleFilter,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobRole: true,
        jobRoles: true,
        region: true,
        skills: true,
        availability: true,
      },
    });
  }
}
