import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompensationType,
  InternPoolApplicationStatus,
  InternPoolRequestStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { CreateInternPoolRequestDto } from './dto/create-intern-pool-request.dto';
import { ApplyInternPoolDto, RespondInternApplicationDto } from './dto/apply-intern-pool.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class InternPoolService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  private async notify(userId: string, type: NotificationType, title: string, body: string, link?: string) {
    const notification = await this.notificationsService.create({ userId, type, title, body, link });
    this.notificationsGateway.pushNotification(userId, notification);
    return notification;
  }

  // ── Requests ──────────────────────────────────────────────────────────────

  async createRequest(dto: CreateInternPoolRequestDto, foundationId: string, userId: string) {
    return this.prisma.internPoolRequest.create({
      data: {
        foundationId,
        postedById: userId,
        title: dto.title,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        role: dto.role,
        description: dto.description,
        location: dto.location,
        supervisorName: dto.supervisorName,
        compensationType: dto.compensationType ?? CompensationType.UNPAID,
        weeklyHours: dto.weeklyHours,
      },
      include: { applications: { include: { applicant: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
  }

  async findAllRequests(filters: { foundationId?: string; status?: string; isAdmin?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filters.foundationId) where.foundationId = filters.foundationId;
    if (filters.status) where.status = filters.status;

    return this.prisma.internPoolRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        foundation: { select: { id: true, name: true } },
        applications: {
          include: {
            applicant: { select: { id: true, firstName: true, lastName: true, jobRole: true, region: true } },
          },
        },
      },
    });
  }

  async findRequestById(id: string) {
    const request = await this.prisma.internPoolRequest.findUnique({
      where: { id },
      include: {
        foundation: { select: { id: true, name: true } },
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobRole: true,
                region: true,
                skills: true,
                cvUrl: true,
                shortBio: true,
              },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Intern pool request not found');
    return request;
  }

  async cancelRequest(id: string, foundationId: string, isAdmin: boolean) {
    const request = await this.prisma.internPoolRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Intern pool request not found');
    if (!isAdmin && request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only cancel your own intern pool requests');
    }
    if (request.status === InternPoolRequestStatus.FILLED) {
      throw new BadRequestException('Cannot cancel a filled intern pool request');
    }
    return this.prisma.internPoolRequest.update({
      where: { id },
      data: { status: InternPoolRequestStatus.CANCELLED },
    });
  }

  // ── Applications (intern self-applies) ───────────────────────────────────

  async applyToRequest(requestId: string, applicantId: string, dto: ApplyInternPoolDto) {
    const request = await this.prisma.internPoolRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Intern pool request not found');
    if (request.status !== InternPoolRequestStatus.OPEN && request.status !== InternPoolRequestStatus.REVIEWING) {
      throw new BadRequestException('This placement request is no longer accepting applications');
    }

    const existing = await this.prisma.internPoolApplication.findUnique({
      where: { requestId_applicantId: { requestId, applicantId } },
    });
    if (existing) throw new BadRequestException('You have already applied to this placement');

    const application = await this.prisma.internPoolApplication.create({
      data: { requestId, applicantId, motivationLetter: dto.motivationLetter },
      include: { applicant: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Move request to REVIEWING
    if (request.status === InternPoolRequestStatus.OPEN) {
      await this.prisma.internPoolRequest.update({
        where: { id: requestId },
        data: { status: InternPoolRequestStatus.REVIEWING },
      });
    }

    // Notify foundation
    await this.notify(
      request.postedById,
      NotificationType.INTERN_APPLICATION_RECEIVED,
      'New intern application',
      `An intern has applied to your placement: ${request.title}`,
      `/foundation/intern-pool`,
    );

    return application;
  }

  async getMyApplications(applicantId: string) {
    return this.prisma.internPoolApplication.findMany({
      where: { applicantId },
      orderBy: { appliedAt: 'desc' },
      include: {
        request: {
          include: { foundation: { select: { id: true, name: true } } },
        },
      },
    });
  }

  // ── Foundation responds to an application ────────────────────────────────

  async respondToApplication(
    applicationId: string,
    dto: RespondInternApplicationDto,
    foundationId: string,
    isAdmin: boolean,
  ) {
    const application = await this.prisma.internPoolApplication.findUnique({
      where: { id: applicationId },
      include: { request: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (!isAdmin && application.request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only respond to applications for your own requests');
    }

    const terminal: InternPoolApplicationStatus[] = [
      InternPoolApplicationStatus.CONFIRMED,
      InternPoolApplicationStatus.DECLINED,
    ];
    if (terminal.includes(application.status)) {
      throw new BadRequestException(`Application is already ${application.status.toLowerCase()} and cannot be changed`);
    }

    const updated = await this.prisma.internPoolApplication.update({
      where: { id: applicationId },
      data: { status: dto.status, note: dto.note, respondedAt: new Date() },
    });

    // When confirmed → fill the request
    if (dto.status === InternPoolApplicationStatus.CONFIRMED) {
      await this.prisma.internPoolRequest.update({
        where: { id: application.requestId },
        data: { status: InternPoolRequestStatus.FILLED },
      });
    }

    const notifType =
      dto.status === InternPoolApplicationStatus.ACCEPTED
        ? NotificationType.INTERN_APPLICATION_ACCEPTED
        : dto.status === InternPoolApplicationStatus.DECLINED
          ? NotificationType.INTERN_APPLICATION_DECLINED
          : NotificationType.INTERN_APPLICATION_CONFIRMED;

    await this.notify(
      application.applicantId,
      notifType,
      `Internship application ${dto.status.toLowerCase()}`,
      `Your application for "${application.request.title}" has been ${dto.status.toLowerCase()}.`,
      `/educator/intern-pool`,
    );

    return updated;
  }

  // ── Foundation proposes directly to a specific intern ────────────────────

  async proposeToIntern(requestId: string, applicantId: string, foundationId: string, isAdmin: boolean, note?: string) {
    const request = await this.prisma.internPoolRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Intern pool request not found');
    if (!isAdmin && request.foundationId !== foundationId) {
      throw new ForbiddenException('You can only propose interns for your own placement requests');
    }
    if (request.status !== InternPoolRequestStatus.OPEN && request.status !== InternPoolRequestStatus.REVIEWING) {
      throw new BadRequestException('Cannot propose to a placement that is no longer accepting applications');
    }

    const existing = await this.prisma.internPoolApplication.findUnique({
      where: { requestId_applicantId: { requestId, applicantId } },
    });
    if (existing) throw new BadRequestException('This intern already has an application for this request');

    const application = await this.prisma.internPoolApplication.create({
      data: {
        requestId,
        applicantId,
        status: InternPoolApplicationStatus.REVIEWING,
      },
      include: { applicant: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Notify intern of the proposal
    await this.notify(
      applicantId,
      NotificationType.INTERN_REQUEST_POSTED,
      'Internship placement proposed',
      `You have been invited to apply for an internship: ${request.title}`,
      `/educator/intern-pool`,
    );

    return application;
  }

  // ── Available interns pool ────────────────────────────────────────────────

  async findAvailableInterns(filters?: { role?: string; region?: string }) {
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
        availableForInternship: true,
        candidatePoolVisible: true,
        isActive: true,
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
        shortBio: true,
        cvUrl: true,
      },
    });
  }

  // ── KPI / signals ─────────────────────────────────────────────────────────

  async getSignals(foundationId?: string) {
    const where = foundationId ? { foundationId } : {};
    const [open, reviewing, filled, poolSize] = await this.prisma.$transaction([
      this.prisma.internPoolRequest.count({ where: { ...where, status: InternPoolRequestStatus.OPEN } }),
      this.prisma.internPoolRequest.count({ where: { ...where, status: InternPoolRequestStatus.REVIEWING } }),
      this.prisma.internPoolRequest.count({ where: { ...where, status: InternPoolRequestStatus.FILLED } }),
      this.prisma.user.count({ where: { availableForInternship: true, isActive: true } }),
    ]);
    return { openRequests: open, reviewingRequests: reviewing, filledRequests: filled, internPoolSize: poolSize };
  }

  async toggleInternAvailability(userId: string, available: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { availableForInternship: available },
      select: { id: true, availableForInternship: true },
    });
  }
}
