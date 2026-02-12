import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';

type UserPayload<TInclude extends Prisma.UserInclude | undefined> = Prisma.UserGetPayload<
  TInclude extends Prisma.UserInclude ? { include: TInclude } : {}
>;

export type BootstrapResult<TInclude extends Prisma.UserInclude | undefined = undefined> = {
  appUser: {
    id: string;
    clerkId: string;
    email: string | null;
    role: UserRole;
  };
  user: UserPayload<TInclude>;
};

@Injectable()
export class PrincipalService {
  private readonly logger = new Logger(PrincipalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarantees that both the `app_users` (account) and `users` (profile) rows exist.
   * Performs an atomic `upsert` on the `users` table to avoid race conditions when
   * multiple requests hit the API before the Clerk webhook finishes provisioning.
   */
  async getOrBootstrapAccountAndProfile<TInclude extends Prisma.UserInclude | undefined = undefined>(
    clerkId: string | undefined,
    include?: TInclude,
  ): Promise<BootstrapResult<TInclude>> {
    const startTime = Date.now();

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
      },
    });

    if (!appUser) {
      this.logger.error('AppUser not found during bootstrap', { clerkId });
      throw new NotFoundException('User not found in system');
    }

    // If appUser.email is null, check if the User record already has an email
    // This handles the case where User was created before AppUser got its email synced
    let emailForCreate: string | null = appUser.email;
    if (!emailForCreate) {
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId },
        select: { email: true },
      });
      emailForCreate = existingUser?.email ?? null;
    }

    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: {
        email: appUser.email ?? undefined,
        role: appUser.role,
      },
      create: {
        clerkId,
        email: emailForCreate, // Use existing User email if AppUser email is null
        role: appUser.role,
        isActive: true,
      },
      ...(include ? { include } : {}),
    } as Prisma.UserUpsertArgs);

    const duration = Date.now() - startTime;

    if (!include) {
      const createdRecently = user.createdAt instanceof Date && user.createdAt.getTime() >= Date.now() - 5000;
      this.logger.log('Profile bootstrap', {
        clerkId,
        accountId: appUser.id,
        profileId: user.id,
        wasCreated: createdRecently,
        duration,
      });
    }

    return {
      appUser,
      user: user as UserPayload<TInclude>,
    };
  }

  async getOrDefaultNotificationPrefs(userId: string) {
    return this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        // No-op update prevents Prisma from throwing when record exists
        userId,
      },
      create: {
        userId,
        emailNotifications: true,
        authentication: true,
        userManagement: true,
        jobRecruitment: true,
        messaging: true,
        marketplace: false,
        leadManagement: true,
        subscription: true,
        contentModeration: false,
        systemAdmin: false,
        marketing: true, // Default to opted-in; users can opt out explicitly
        frequency: 'immediate',
        quietHoursEnabled: false,
      },
    });
  }

  async getPrivacyPrefs(userId: string) {
    const prefs = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId },
      select: {
        contentModeration: true,
        systemAdmin: true,
      },
    });

    return {
      hidePubliclyToggle: prefs?.contentModeration ?? false,
      gdprDataDeletionRequestMade: prefs?.systemAdmin ?? false,
    };
  }

  async updatePrivacyPrefs(
    userId: string,
    data: { hidePubliclyToggle?: boolean; gdprDataDeletionRequestMade?: boolean },
  ) {
    const prefs = await this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        contentModeration: data.hidePubliclyToggle,
        systemAdmin: data.gdprDataDeletionRequestMade,
      },
      create: {
        userId,
        contentModeration: data.hidePubliclyToggle ?? false,
        systemAdmin: data.gdprDataDeletionRequestMade ?? false,
        },
      });

    return {
      hidePubliclyToggle: prefs.contentModeration ?? false,
      gdprDataDeletionRequestMade: prefs.systemAdmin ?? false,
    };
  }

  async getNotificationSettings(userId: string) {
    const prefs = await this.getOrDefaultNotificationPrefs(userId);

    const frequencyMap: Record<string, 'Daily' | 'Weekly' | 'None'> = {
      daily: 'Daily',
      weekly: 'Weekly',
      none: 'None',
      immediate: 'Daily',
    };

    const digest = prefs.frequency ? frequencyMap[prefs.frequency.toLowerCase()] ?? 'Daily' : 'Daily';

    return {
      newRequestEmailToggle: prefs.leadManagement,
      digestRadio: digest,
      promoRedemptionAlertsToggle: prefs.marketing,
      mailingListOptOut: prefs.mailingListOptOut,
    };
  }

  async updateNotificationSettings(
    userId: string,
    data: {
      newRequestEmailToggle?: boolean;
      digestRadio?: 'Daily' | 'Weekly' | 'None';
      promoRedemptionAlertsToggle?: boolean;
      mailingListOptOut?: boolean;
    },
  ) {
    const frequencyMap: Record<'Daily' | 'Weekly' | 'None', string> = {
      Daily: 'daily',
      Weekly: 'weekly',
      None: 'none',
    };

    const reverseMap: Record<string, 'Daily' | 'Weekly' | 'None'> = {
      daily: 'Daily',
      weekly: 'Weekly',
      none: 'None',
      immediate: 'Daily', // fallback
    };

    const updated = await this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        leadManagement: data.newRequestEmailToggle,
        marketing: data.promoRedemptionAlertsToggle,
        mailingListOptOut: data.mailingListOptOut,
        frequency: data.digestRadio ? frequencyMap[data.digestRadio] : undefined,
      },
      create: {
        userId,
        leadManagement: data.newRequestEmailToggle ?? true,
        marketing: data.promoRedemptionAlertsToggle ?? true,
        mailingListOptOut: data.mailingListOptOut ?? false,
        frequency: data.digestRadio ? frequencyMap[data.digestRadio] : 'immediate',
      },
    });

    return {
      newRequestEmailToggle: updated.leadManagement,
      digestRadio: updated.frequency ? reverseMap[updated.frequency] ?? 'Daily' : 'Daily',
      promoRedemptionAlertsToggle: updated.marketing,
      mailingListOptOut: updated.mailingListOptOut,
    };
  }
}
