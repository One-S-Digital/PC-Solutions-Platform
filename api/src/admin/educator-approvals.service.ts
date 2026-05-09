import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EducatorApprovalsService {
  private readonly logger = new Logger(EducatorApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
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

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: EducatorApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvalNotes: null,
      },
    });

    this.logger.log(`Educator ${id} (${educator.email}) approved`);

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
}
