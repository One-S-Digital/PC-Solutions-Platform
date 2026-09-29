import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { ConfigService } from '@nestjs/config';
import { SignupLogService } from '../signup-log/signup-log.service';
import { UsersService } from '../users/users.service';
import {
  SignupEvent,
  SignupOutcome,
  SignupSource,
  SignupStage,
} from '../signup-log/signup-log.events';

@Injectable()
export class EducatorApprovalsService {
  private readonly logger = new Logger(EducatorApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
    private readonly signupLog: SignupLogService,
    private readonly usersService: UsersService,
  ) {}

  async listEducators(status?: EducatorApprovalStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      role: UserRole.EDUCATOR,
      ...(status ? { approvalStatus: status } : {}),
    };

    const [educators, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          approvalStatus: true,
          approvalNotes: true,
          approvedAt: true,
          createdAt: true,
          region: true,
          jobRole: true,
          jobRoles: true,
          shortBio: true,
          cvUrl: true,
          skills: true,
          certifications: true,
          workExperience: true,
          education: true,
          avatarAsset: { select: { publicUrl: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      educators,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingCount() {
    return this.prisma.user.count({
      where: { role: UserRole.EDUCATOR, approvalStatus: EducatorApprovalStatus.PENDING_REVIEW },
    });
  }

  /**
   * Educators whose account exists but who never submitted an application.
   * Tracked separately so the review queue only contains real submissions.
   */
  async getIncompleteCount() {
    return this.prisma.user.count({
      where: { role: UserRole.EDUCATOR, approvalStatus: EducatorApprovalStatus.INCOMPLETE },
    });
  }

  async getEducatorById(id: string) {
    const educator = await this.prisma.user.findFirst({
      where: { id, role: UserRole.EDUCATOR },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        approvalStatus: true,
        approvalNotes: true,
        approvedAt: true,
        createdAt: true,
        region: true,
        jobRole: true,
        jobRoles: true,
        cities: true,
        shortBio: true,
        cvUrl: true,
        skills: true,
        certifications: true,
        workExperience: true,
        education: true,
        phoneNumber: true,
        availableForReplacement: true,
        availableForInternship: true,
        avatarAsset: { select: { publicUrl: true } },
      },
    });

    if (!educator) {
      throw new NotFoundException('Educator not found');
    }

    return educator;
  }

  async approveEducator(id: string) {
    const educator = await this.getEducatorById(id);

    if (educator.approvalStatus === EducatorApprovalStatus.APPROVED) {
      throw new BadRequestException('Educator is already approved');
    }

    // Approving an INCOMPLETE account is a deliberate admin override (the UI
    // confirms first): it lets an educator whose submission never arrived in
    // without redoing signup. It is the only way out of INCOMPLETE besides
    // submitting, since RolesGuard keeps INCOMPLETE educators off the app.
    const wasIncomplete = educator.approvalStatus === EducatorApprovalStatus.INCOMPLETE;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: EducatorApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvalNotes: null,
      },
    });

    this.logger.log(`Educator ${id} (${educator.email}) approved`);

    void this.signupLog.record({
      event: SignupEvent.ADMIN_EDUCATOR_APPROVED,
      stage: SignupStage.REVIEW,
      source: SignupSource.ADMIN,
      role: UserRole.EDUCATOR,
      userId: id,
      email: educator.email,
      approvalStatusBefore: educator.approvalStatus ?? null,
      approvalStatusAfter: EducatorApprovalStatus.APPROVED,
      // Marks the override on the timeline, and whether it published an empty
      // profile into the candidate pool.
      detail: wasIncomplete
        ? {
            approvedWhileIncomplete: true,
            hasShortBio: Boolean(educator.shortBio?.trim()),
            hasCvUrl: Boolean(educator.cvUrl?.trim()),
          }
        : null,
    });

    const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || '';

    if (educator.email) {
      this.emailNotificationService.sendNotification({
        event: 'educator_approved',
        recipient: educator.email,
        recipientName: educator.firstName || undefined,
        payload: {
          firstName: educator.firstName || 'Educator',
          dashboardUrl: `${appUrl}/educator/dashboard`,
        },
        bypassPreferences: true,
        allowUnknownRecipient: false,
      }).catch((err: any) => {
        this.logger.warn(`Approval email failed for ${educator.email}: ${err?.message || err}`);
      });
    }

    return updated;
  }

  async rejectEducator(id: string, notes: string) {
    const educator = await this.getEducatorById(id);

    // Same guard as approveEducator: an INCOMPLETE account never submitted an
    // application, so there is nothing to reject. Without this, an admin could
    // formally reject a blank account and send its owner a rejection email for
    // something they never applied for — and the REJECTED status would then
    // lock them out of finishing their signup.
    if (educator.approvalStatus === EducatorApprovalStatus.INCOMPLETE) {
      void this.signupLog.record({
        event: SignupEvent.ADMIN_DECISION_BLOCKED_INCOMPLETE,
        stage: SignupStage.REVIEW,
        source: SignupSource.ADMIN,
        outcome: SignupOutcome.FAIL,
        role: UserRole.EDUCATOR,
        userId: id,
        email: educator.email,
        approvalStatusBefore: EducatorApprovalStatus.INCOMPLETE,
        errorCode: 'REJECT_BLOCKED_INCOMPLETE',
        detail: {
          hasShortBio: Boolean(educator.shortBio?.trim()),
          hasCvUrl: Boolean(educator.cvUrl?.trim()),
        },
      });

      throw new BadRequestException(
        'This educator has not submitted an application yet. Their profile is incomplete.',
      );
    }

    if (!notes?.trim()) {
      throw new BadRequestException('Rejection notes are required');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: EducatorApprovalStatus.REJECTED,
        approvalNotes: notes.trim(),
        approvedAt: null,
      },
    });

    this.logger.log(`Educator ${id} (${educator.email}) rejected: ${notes}`);

    void this.signupLog.record({
      event: SignupEvent.ADMIN_EDUCATOR_REJECTED,
      stage: SignupStage.REVIEW,
      source: SignupSource.ADMIN,
      role: UserRole.EDUCATOR,
      userId: id,
      email: educator.email,
      approvalStatusBefore: educator.approvalStatus ?? null,
      approvalStatusAfter: EducatorApprovalStatus.REJECTED,
    });

    const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || '';

    if (educator.email) {
      this.emailNotificationService.sendNotification({
        event: 'educator_rejected',
        recipient: educator.email,
        recipientName: educator.firstName || undefined,
        payload: {
          firstName: educator.firstName || 'Educator',
          rejectionNotes: notes.trim(),
          supportUrl: `${appUrl}/support`,
        },
        bypassPreferences: true,
        allowUnknownRecipient: false,
      }).catch((err: any) => {
        this.logger.warn(`Rejection email failed for ${educator.email}: ${err?.message || err}`);
      });
    }

    return updated;
  }

  /**
   * Permanently deletes an educator account that never submitted an
   * application. Scoped tightly to INCOMPLETE: `rejectEducator` above
   * refuses to touch these accounts because REJECTED is a decision on an
   * application that was never made, and would permanently lock the person
   * out (RolesGuard blocks REJECTED unconditionally) with no way back in.
   * Deleting the account instead — rather than rejecting it — avoids both
   * problems: no rejection email for something never applied for, and no
   * dead-end account left behind. A submitted application (PENDING_REVIEW,
   * APPROVED, REJECTED) must go through the normal reject flow.
   */
  async removeIncompleteEducator(id: string) {
    const educator = await this.getEducatorById(id);

    if (educator.approvalStatus !== EducatorApprovalStatus.INCOMPLETE) {
      throw new BadRequestException(
        'Only accounts that never submitted an application (Incomplete) can be removed this way. Use Reject for a submitted application.',
      );
    }

    const appUser = await this.prisma.appUser.findUnique({ where: { clerkId: educator.clerkId } });
    if (!appUser) {
      throw new NotFoundException('No auth account found for this educator');
    }

    // Reuses UsersService's hard-delete: it refuses (409) if the account has
    // any dependent data (messages, tickets, subscriptions, ...) rather than
    // silently destroying it, deletes the Clerk account, and is the same
    // path the platform already trusts for permanent user removal.
    await this.usersService.hardRemove(appUser.id);

    this.logger.log(`Incomplete educator ${id} (${educator.email}) removed by admin`);

    void this.signupLog.record({
      event: SignupEvent.ADMIN_EDUCATOR_INCOMPLETE_REMOVED,
      stage: SignupStage.REVIEW,
      source: SignupSource.ADMIN,
      role: UserRole.EDUCATOR,
      userId: id,
      email: educator.email,
      approvalStatusBefore: EducatorApprovalStatus.INCOMPLETE,
      detail: {
        hasShortBio: Boolean(educator.shortBio?.trim()),
        hasCvUrl: Boolean(educator.cvUrl?.trim()),
      },
    });

    return { success: true };
  }
}
