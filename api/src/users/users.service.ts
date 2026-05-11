import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Prisma, UserRole, SubscriptionStatus, EducatorApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AssignUserOrganizationDto } from './dto/assign-user-organization.dto';
import * as crypto from 'crypto';
import { PrincipalService } from '../principal/principal.service';
import { RoleSyncService } from '../sync/role-sync.service';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/clerk-sdk-node';

/**
 * Roles considered "admin-level" roles in the system.
 */
const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

const userProfileInclude = {
  avatarAsset: true,
  organizations: {
    include: {
      organization: {
        include: {
          logoAsset: true,
          coverAsset: true,
          contactInfo: true,
          products: {
            include: {
              imageAsset: true,
            },
          },
          serviceProviders: {
            include: {
              services: true,
            },
          },
          jobListings: true,
        },
      },
    },
  },
} as const satisfies Prisma.UserInclude;

type UserProfileInclude = typeof userProfileInclude;
type UserWithProfile = Prisma.UserGetPayload<{ include: UserProfileInclude }>;

export interface FindAllUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private clerk: any;

  constructor(
    private prisma: PrismaService,
    private readonly principal: PrincipalService,
    private readonly roleSyncService: RoleSyncService,
    private readonly configService: ConfigService,
  ) {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (clerkSecretKey) {
      this.clerk = createClerkClient({ secretKey: clerkSecretKey });
    }
  }

  /** Subscription statuses that represent an "in-use" subscription. */
  private static readonly LIVE_SUB_STATUSES = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.GRACE_PERIOD,
    SubscriptionStatus.PAST_DUE,
  ];

  /**
   * Cascade deactivation to a user's organizations and subscriptions.
   * Shared by the single-user `update()` (INACTIVE path) and `remove()` (soft-delete).
   *
   * Runs inside the caller-provided transaction client (`tx`).
   */
  private async cascadeUserDeactivation(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    profileUserId: string,
    orgIds: string[],
    cancellationReason: string,
    logPrefix: string,
    entityId: string,
  ) {
    // Deactivate related organizations
    if (orgIds.length > 0) {
      const orgDeactivateResult = await tx.organization.updateMany({
        where: { id: { in: orgIds } },
        data: { isActive: false },
      });
      this.logger.log(
        `🏢 [${logPrefix}] Cascaded deactivation to ${orgDeactivateResult.count} organization(s) for user ${entityId}`,
      );

      // Cancel org-based subscriptions
      const orgSubResult = await tx.subscription.updateMany({
        where: {
          organizationId: { in: orgIds },
          status: { in: UsersService.LIVE_SUB_STATUSES },
        },
        data: {
          status: SubscriptionStatus.CANCELLED,
          canceledAt: new Date(),
          cancellationReason,
        },
      });
      if (orgSubResult.count > 0) {
        this.logger.log(
          `💳 [${logPrefix}] Cancelled ${orgSubResult.count} organization subscription(s) for user ${entityId}`,
        );
      }
    }

    // Cancel user-based subscriptions
    const userSubResult = await tx.subscription.updateMany({
      where: {
        userId: profileUserId,
        status: { in: UsersService.LIVE_SUB_STATUSES },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        canceledAt: new Date(),
        cancellationReason,
      },
    });
    if (userSubResult.count > 0) {
      this.logger.log(
        `💳 [${logPrefix}] Cancelled ${userSubResult.count} user subscription(s) for user ${entityId}`,
      );
    }
  }

  /**
   * Sync a user's email to Clerk authentication provider.
   * This ensures the login email matches the database email when an admin updates it.
   * 
   * Clerk handles emails specially - each user can have multiple email addresses.
   * To update the primary email, we need to:
   * 1. Create a new email address for the user
   * 2. Set it as primary
   * 3. Schedule old email for deletion after grace period
   * 
   * @param clerkId - The Clerk user ID
   * @param newEmail - The new email address to set
   * @param skipVerification - Whether to skip email verification (true for admin updates)
   * @throws Error if sync fails (caller should handle by creating outbox entry)
   */
  private async syncEmailToClerk(clerkId: string, newEmail: string, skipVerification = true): Promise<void> {
    if (!this.clerk) {
      this.logger.warn(`⚠️ [EMAIL SYNC] Clerk not configured, skipping email sync for ${clerkId}`);
      return;
    }

    this.logger.log(`📧 [EMAIL SYNC] Syncing email to Clerk for user ${clerkId}: ${newEmail}`);
    
    // Get the current user from Clerk to find existing email addresses
    const clerkUser = await this.clerk.users.getUser(clerkId);
    const oldPrimaryEmailId = clerkUser.primaryEmailAddressId;
    const oldPrimaryEmail = clerkUser.emailAddresses?.find(
      (ea: any) => ea.id === oldPrimaryEmailId
    )?.emailAddress;
    
    // Check if the new email already exists for this user
    const existingEmailAddress = clerkUser.emailAddresses?.find(
      (ea: any) => ea.emailAddress.toLowerCase() === newEmail.toLowerCase()
    );
    
    if (existingEmailAddress) {
      // Email already exists, just make sure it's set as primary
      if (clerkUser.primaryEmailAddressId !== existingEmailAddress.id) {
        this.logger.log(`📧 [EMAIL SYNC] Setting existing email as primary for ${clerkId}`);
        await this.clerk.users.updateUser(clerkId, {
          primaryEmailAddressId: existingEmailAddress.id,
        });
      } else {
        this.logger.log(`📧 [EMAIL SYNC] Email ${newEmail} is already the primary email for ${clerkId}`);
      }
      return;
    }
    
    // Create a new email address for the user
    this.logger.log(`📧 [EMAIL SYNC] Creating new email address ${newEmail} for ${clerkId}`);
    await this.clerk.emailAddresses.createEmailAddress({
      userId: clerkId,
      emailAddress: newEmail,
      verified: skipVerification, // Admin updates should skip verification
      primary: true, // Set as primary immediately
    });
    
    // Schedule old email for deletion after grace period
    // This allows users time to verify the new email works and recover if needed
    if (oldPrimaryEmailId) {
      await this.scheduleOldEmailDeletion(clerkId, oldPrimaryEmailId, oldPrimaryEmail);
    }
    
    this.logger.log(`✅ [EMAIL SYNC] Email sync completed for ${clerkId}`);
  }

  /**
   * Schedule the old email address for deletion after a grace period.
   * Default grace period is 7 days, configurable via System Settings in admin dashboard.
   * Setting key: email.grace_period_days (category: email)
   */
  private async scheduleOldEmailDeletion(
    clerkId: string, 
    emailAddressId: string, 
    emailAddress?: string
  ): Promise<void> {
    // Get grace period from system settings, fallback to env var, then default to 7 days
    let gracePeriodDays = 7;
    
    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key: 'email.grace_period_days' },
      });
      if (setting?.value) {
        gracePeriodDays = Number(setting.value) || 7;
      } else {
        // Fallback to env var for backwards compatibility
        gracePeriodDays = this.configService.get<number>('EMAIL_GRACE_PERIOD_DAYS') || 7;
      }
    } catch {
      // If system settings table doesn't exist yet, use env var fallback
      gracePeriodDays = this.configService.get<number>('EMAIL_GRACE_PERIOD_DAYS') || 7;
    }
    
    const deletionDate = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
    
    try {
      await this.prisma.outbox.create({
        data: {
          topic: 'clerk.email.delete',
          payload: { 
            clerkId, 
            emailAddressId,
            emailAddress: emailAddress || 'unknown',
            reason: 'Grace period expired after email change',
            scheduledAt: new Date().toISOString(),
          },
          nextRunAt: deletionDate, // Won't be processed until this date
        },
      });
      
      this.logger.log(
        `📅 [EMAIL SYNC] Old email ${emailAddress || emailAddressId} scheduled for deletion ` +
        `after ${gracePeriodDays} days (${deletionDate.toISOString()}) for user ${clerkId}`
      );
    } catch (error: any) {
      // Non-critical error - the new email is already working
      this.logger.warn(
        `⚠️ [EMAIL SYNC] Could not schedule old email deletion: ${error.message}. ` +
        `Manual cleanup may be needed for user ${clerkId}`
      );
    }
  }

  /**
   * Queue a failed email sync for retry via the outbox pattern.
   * This ensures eventual consistency between the database and Clerk.
   */
  private async queueEmailSyncForRetry(clerkId: string, newEmail: string, errorMessage: string): Promise<void> {
    try {
      await this.prisma.outbox.create({
        data: {
          topic: 'clerk.email.sync',
          payload: { 
            clerkId, 
            newEmail, 
            errorMessage,
            attemptedAt: new Date().toISOString(),
          },
        },
      });
      this.logger.log(`📤 [EMAIL SYNC] Queued email sync for retry: ${clerkId} -> ${newEmail}`);
    } catch (outboxError: any) {
      // If we can't even create the outbox entry, log it prominently
      this.logger.error(`🚨 [EMAIL SYNC] CRITICAL: Failed to queue email sync for retry: ${outboxError.message}`);
      this.logger.error(`🚨 [EMAIL SYNC] Manual intervention required for user ${clerkId} email: ${newEmail}`);
    }
  }

  /**
   * Safely sync email to Clerk with outbox fallback for failures.
   * This method handles errors gracefully by queuing failed syncs for retry.
   */
  private async syncEmailToClerkWithFallback(clerkId: string, newEmail: string): Promise<void> {
    try {
      await this.syncEmailToClerk(clerkId, newEmail);
    } catch (error: any) {
      this.logger.error(`❌ [EMAIL SYNC] Failed to sync email to Clerk for ${clerkId}: ${error.message}`);
      
      // Log more details for debugging
      if (error.errors) {
        this.logger.error(`❌ [EMAIL SYNC] Clerk errors: ${JSON.stringify(error.errors)}`);
      }
      
      // Queue for retry via outbox pattern
      await this.queueEmailSyncForRetry(clerkId, newEmail, error.message);
    }
  }

  /**
   * Systematically links orphan parent leads to a profile user by email.
   * Safe to run repeatedly; only links leads that are not already attached.
   */
  private async linkParentLeadsToProfile(
    profileUserId: string | null,
    email: string | null | undefined,
  ): Promise<void> {
    if (!profileUserId || !email) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const result = await this.prisma.parentLead.updateMany({
      where: {
        parentUserId: null,
        parentEmail: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      data: {
        parentUserId: profileUserId,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `🔗 [PARENT LEAD LINK] Linked ${result.count} lead(s) to profile user ${profileUserId}`,
      );
    }
  }

  private serializeDate(value: Date | string | null | undefined): string | null | undefined {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  private buildUserResponse(
    user: UserWithProfile | null,
    appUser: { id: string; clerkId: string; email: string | null; role: UserRole },
  ) {
    if (!user) {
      return {
        id: appUser.id,
        clerkId: appUser.clerkId,
        email: appUser.email,
        firstName: null,
        lastName: null,
        role: appUser.role,
        phoneNumber: null,
        workExperience: null,
        education: null,
        certifications: [],
        skills: [],
        availability: null,
        cvUrl: null,
        shortBio: null,
        avatarAssetId: null,
        stripeCustomerId: null,
        lastActiveAt: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
        organizations: [],
        name: appUser.email ?? 'Unknown User',
        status: 'Active',
        memberSince: null,
        lastLogin: null,
        avatarUrl: null,
        orgId: undefined,
        orgName: undefined,
        orgType: undefined,
        orgLogoUrl: null,
        orgCoverImageUrl: null,
        primaryOrganization: null,
      };
    }

    const organizations = (user.organizations ?? []).map(userOrg => {
      const org = userOrg.organization as any;

      const products = (org.products ?? []).map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        tags: product.tags ?? [],
        status: product.status,
        isActive: product.isActive,
        supplierId: product.supplierId,
        createdAt: this.serializeDate(product.createdAt),
        updatedAt: this.serializeDate(product.updatedAt),
        imageAssetId: product.imageAssetId,
        imageUrl: product.imageAsset?.publicUrl ?? null,
      }));

      const services = (org.serviceProviders ?? []).flatMap((provider: any) =>
        (provider.services ?? []).map((service: any) => ({
          id: service.id,
          title: service.title,
          description: service.description,
          category: service.category,
          price: service.price,
          priceInfo: service.priceInfo,
          availability: service.availability,
          tags: service.tags ?? [],
          imageUrl: service.imageUrl,
          isActive: service.isActive,
          providerId: service.providerId,
          createdAt: this.serializeDate(service.createdAt),
          updatedAt: this.serializeDate(service.updatedAt),
          deliveryType: service.deliveryType ?? provider.deliveryType ?? null,
          bookingLink: provider.bookingLink ?? org.bookingLink ?? null,
        })),
      );

      const jobListings = (org.jobListings ?? []).map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements ?? [],
        responsibilities: job.responsibilities ?? [],
        qualifications: job.qualifications ?? [],
        benefits: job.benefits ?? [],
        location: job.location,
        salary: job.salary,
        salaryRange: job.salaryRange,
        contractType: job.contractType,
        startDate: this.serializeDate(job.startDate),
        status: job.status,
        foundationId: job.foundationId,
        publishedAt: this.serializeDate(job.publishedAt),
        createdAt: this.serializeDate(job.createdAt),
        updatedAt: this.serializeDate(job.updatedAt),
        applicationsCount: job.applicationsCount ?? 0,
      }));

      const logoUrl = org.logoAsset?.publicUrl ?? null;
      const coverImageUrl = org.coverAsset?.publicUrl ?? null;

      return {
        id: org.id,
        name: org.name,
        type: org.type,
        region: org.region,
        description: org.description,
        vatNumber: org.vatNumber,
        contactPerson: org.contactPerson,
        contactEmail: (org as any).contactInfo?.contactEmail ?? null,
        phoneNumber: org.phoneNumber,
        canton: org.canton,
        regionsServed: org.regionsServed ?? (org.canton ? [org.canton] : []),
        languages: org.languages ?? [],
        capacity: org.capacity,
        pedagogy: org.pedagogy ?? [],
        productCategory: org.productCategory,
        serviceType: org.serviceType,
        minimumOrderQuantity: org.minimumOrderQuantity,
        directOrderLink: org.directOrderLink,
        catalogUrl: org.catalogUrl,
        serviceCategories: org.serviceCategories ?? [],
        deliveryType: org.deliveryType,
        bookingLink: org.bookingLink,
        bookingLinkOverride: org.bookingLink,
        createdAt: this.serializeDate(org.createdAt),
        updatedAt: this.serializeDate(org.updatedAt),
        isActive: org.isActive,
        logoAssetId: org.logoAssetId,
        coverAssetId: org.coverAssetId,
        logoUrl,
        coverImageUrl,
        products,
        services,
        jobListings,
        membershipRole: userOrg.role,
      };
    });

    const primaryOrganization = organizations[0] ?? null;
    const firstName = user.firstName ?? undefined;
    const lastName = user.lastName ?? undefined;
    const fullName =
      firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim().replace(/\s+/g, ' ') : undefined;

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email ?? appUser.email,
      firstName,
      lastName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      workExperience: user.workExperience,
      education: user.education,
      certifications: user.certifications ?? [],
      skills: user.skills ?? [],
      availability: user.availability,
      cvUrl: user.cvUrl,
      shortBio: user.shortBio,
      avatarAssetId: user.avatarAssetId,
      stripeCustomerId: user.stripeCustomerId,
      lastActiveAt: this.serializeDate(user.lastActiveAt),
      isActive: user.isActive,
      approvalStatus: (user as any).approvalStatus ?? null,
      approvalNotes: (user as any).approvalNotes ?? null,
      approvedAt: this.serializeDate((user as any).approvedAt),
      createdAt: this.serializeDate(user.createdAt),
      updatedAt: this.serializeDate(user.updatedAt),
      organizations,
      name: fullName ?? user.email ?? appUser.email ?? 'Unknown User',
      status: user.isActive ? 'Active' : 'Inactive',
      memberSince: this.serializeDate(user.createdAt),
      lastLogin: this.serializeDate(user.lastActiveAt),
      avatarUrl: user.avatarAsset?.publicUrl ?? primaryOrganization?.logoUrl ?? null,
      orgId: primaryOrganization?.id,
      orgName: primaryOrganization?.name,
      orgType: primaryOrganization?.type,
      orgLogoUrl: primaryOrganization?.logoUrl ?? null,
      orgCoverImageUrl: primaryOrganization?.coverImageUrl ?? null,
      primaryOrganization,
    };
  }

  async completeProfile(clerkId: string, email: string, dto: CompleteProfileDto) {
    this.logger.log(`👤 [COMPLETE PROFILE] Completing profile for ${clerkId}`);
    let profileUserIdToLink: string | null = null;
    
    // Check if user already exists by clerkId
    const existingUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      this.logger.log(`⚠️ [COMPLETE PROFILE] User already exists, updating role...`);
      // Update role if it's different - use RoleSyncService for proper Clerk sync
      if (existingUser.role !== dto.role) {
        await this.roleSyncService.changeRole({
          appUserId: existingUser.id,
          newRole: dto.role,
          changedBy: clerkId,
          reason: 'Profile completion role update',
        });
      }
      
      // Sync email to both AppUser and User if provided and AppUser email is missing
      if (email && !existingUser.email) {
        this.logger.log(`📧 [COMPLETE PROFILE] Syncing email to existing user...`);
        await this.prisma.appUser.update({
          where: { id: existingUser.id },
          data: { email },
        });
        // Also update User table if it exists
        await this.prisma.user.updateMany({
          where: { clerkId },
          data: { email },
        });
        
        // Sync email to Clerk so login email matches database email
        this.logger.log(`📧 [COMPLETE PROFILE] Syncing email to Clerk for ${clerkId}...`);
        await this.syncEmailToClerkWithFallback(clerkId, email);
      }

      const existingProfile = await this.prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      profileUserIdToLink = existingProfile?.id || null;
    } else {
      // Check if an account with this email already exists (for a DIFFERENT clerkId)
      // This can happen when:
      // 1. User starts Google SSO signup on Device A but doesn't complete it
      // 2. User signs up with email/password on Device B (creates a new account)
      // 3. User returns to Device A and tries to complete the Google SSO signup
      // 4. The email already belongs to the account created on Device B
      const existingEmailUser = await this.prisma.appUser.findFirst({
        where: { 
          email: email,
          clerkId: { not: clerkId },
        },
      });

      if (existingEmailUser) {
        // Mask email in logs for PII protection (show first 3 chars + domain)
        const maskedEmail = email ? `${email.substring(0, 3)}***@${email.split('@')[1] || '***'}` : '***';
        this.logger.warn(`🚫 [COMPLETE PROFILE] Email conflict detected! Email ${maskedEmail} already exists for a different account (existing clerkId: ${existingEmailUser.clerkId}, new clerkId: ${clerkId}).`);
        throw new ConflictException({
          message: 'An account with this email address already exists. Please sign out and sign in with your existing account.',
          code: 'EMAIL_ALREADY_EXISTS',
          existingAccountType: 'email_password',
        });
      }
      
      this.logger.log(`🆕 [COMPLETE PROFILE] Creating new user with role ${dto.role}`);
      // Create AppUser and User atomically with audit trail and Clerk sync
      const nameParts = dto.contactPerson ? dto.contactPerson.trim().split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await this.prisma.$transaction(async (tx) => {
        const appUser = await tx.appUser.create({
          data: {
            clerkId,
            email,
            role: dto.role,
          },
        });

        // Create role history for audit trail
        await tx.appUserRoleHistory.create({
          data: {
            userId: appUser.id,
            previousRole: null as any, // No previous role for new user
            newRole: dto.role,
            changedBy: clerkId,
            reason: 'Profile completion - new user',
          },
        });

        // Create outbox entry for Clerk sync
        await tx.outbox.create({
          data: {
            topic: 'mirror.role',
            payload: { clerkUserId: clerkId, role: dto.role },
          },
        });

        const user = await tx.user.create({
          data: {
            clerkId,
            email,
            role: dto.role,
            firstName: firstName || null,
            lastName: lastName || null,
            phoneNumber: dto.phone,
            isActive: true,
            ...(dto.role === UserRole.EDUCATOR && {
              approvalStatus: EducatorApprovalStatus.PENDING_REVIEW,
            }),
          },
        });
        profileUserIdToLink = user.id;

        // Create organization and link user for organization-based roles
        const orgBasedRoles: UserRole[] = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
        if (orgBasedRoles.includes(dto.role)) {
          // Determine organization type from user role
          const orgTypeMap: Record<string, 'FOUNDATION' | 'PRODUCT_SUPPLIER' | 'SERVICE_PROVIDER'> = {
            [UserRole.FOUNDATION]: 'FOUNDATION',
            [UserRole.PRODUCT_SUPPLIER]: 'PRODUCT_SUPPLIER',
            [UserRole.SERVICE_PROVIDER]: 'SERVICE_PROVIDER',
          };
          const orgType = orgTypeMap[dto.role];
          
          // Create the organization with signup data
          const organization = await tx.organization.create({
            data: {
              name: dto.organisationName || `${firstName} ${lastName}`.trim() || 'New Organization',
              type: orgType,
              contactPerson: dto.contactPerson || `${firstName} ${lastName}`.trim() || null,
              phoneNumber: dto.phone || null,
              canton: dto.canton || null,
              region: dto.canton || null,
              // Role-specific fields
              ...(dto.role === UserRole.FOUNDATION && dto.capacity ? { capacity: dto.capacity } : {}),
              ...(dto.role === UserRole.PRODUCT_SUPPLIER && dto.category ? { productCategory: dto.category } : {}),
              ...(dto.role === UserRole.SERVICE_PROVIDER && dto.serviceType ? { serviceType: dto.serviceType } : {}),
              isActive: true,
            },
          });

          // Link user to organization
          await tx.userOrganization.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              role: dto.role,
            },
          });

          this.logger.log(`🏢 [COMPLETE PROFILE] Created organization "${organization.name}" (${orgType}) and linked to user ${user.id}`);
        }
      });
    }

    if (dto.role === UserRole.PARENT) {
      await this.linkParentLeadsToProfile(profileUserIdToLink, email);
    }

    return this.findByClerkId(clerkId);
  }

  async create(createUserDto: CreateUserDto) {
    // Check if user exists
    const existingUser = await this.prisma.appUser.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const appUser = await this.prisma.appUser.create({
      data: {
        clerkId: createUserDto.clerkId,
        email: createUserDto.email,
        role: createUserDto.role as UserRole,
      },
    });

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  /**
   * Directly create a user account in both Clerk and the database.
   * The email is pre-verified, so the account is usable immediately.
   * If the DB insert fails after Clerk creation, the Clerk user is rolled back.
   */
  async adminCreateUser(dto: AdminCreateUserDto, changedBy = 'admin'): Promise<{
    clerkId: string;
    dbUserId: string;
    email: string;
    role: UserRole;
    temporaryPassword?: string;
  }> {
    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }

    const maskedEmail = dto.email ? `${dto.email.substring(0, 3)}***@${dto.email.split('@')[1] || '***'}` : '***';

    // Generate a random password if none provided
    const autoGenerated = !dto.temporaryPassword;
    const password = dto.temporaryPassword ?? (crypto.randomBytes(18).toString('base64').slice(0, 24) + 'Aa1!');

    // Step 1: Create in Clerk
    let clerkUser: any;
    try {
      clerkUser = await (this.clerk as any).users.createUser({
        emailAddress: [dto.email],
        emailAddressVerified: true,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password,
        publicMetadata: { role: dto.role, adminCreated: true },
      });
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const code = error?.errors?.[0]?.code ?? error?.code;
      const message = error?.errors?.[0]?.message ?? error?.message ?? 'Unknown Clerk error';

      this.logger.error('Failed to create Clerk user', { maskedEmail, role: dto.role, status, code, message });

      if (status === 422 || code === 'form_identifier_exists' || code === 'duplicate_record') {
        throw new ConflictException('A user with this email already exists');
      }

      throw new InternalServerErrorException('Failed to create user in Clerk. Please try again.');
    }

    const clerkId: string = clerkUser.id;

    // Step 2: Create AppUser + User profile in DB
    let dbUserId = '';
    try {
      await this.prisma.$transaction(async (tx) => {
        const appUser = await tx.appUser.create({
          data: { clerkId, email: dto.email, role: dto.role },
        });
        dbUserId = appUser.id;

        await tx.appUserRoleHistory.create({
          data: {
            userId: appUser.id,
            previousRole: null as any,
            newRole: dto.role,
            changedBy,
            reason: 'Admin direct user creation',
          },
        });

        await tx.outbox.create({
          data: {
            topic: 'mirror.role',
            payload: { clerkUserId: clerkId, role: dto.role },
          },
        });

        await tx.user.create({
          data: {
            clerkId,
            email: dto.email,
            role: dto.role,
            firstName: dto.firstName ?? null,
            lastName: dto.lastName ?? null,
            isActive: true,
          },
        });
      });
    } catch (error: any) {
      // Rollback: delete the Clerk user to avoid orphaned accounts
      this.logger.error(`DB insert failed after Clerk user created (${clerkId}). Rolling back Clerk user.`, error?.message);
      let rollbackSucceeded = false;
      try {
        await (this.clerk as any).users.deleteUser(clerkId);
        rollbackSucceeded = true;
      } catch (rollbackErr: any) {
        this.logger.error(
          `Failed to roll back Clerk user ${clerkId} — the Clerk account may still exist. DB error: ${error?.message}. Rollback error: ${rollbackErr?.message}`,
        );
      }
      throw new InternalServerErrorException(
        rollbackSucceeded
          ? 'Failed to save user to database. The Clerk account has been removed.'
          : `Failed to save user to database. The Clerk account (${clerkId}) may still exist and require manual removal.`,
      );
    }

    this.logger.log(`✅ [ADMIN CREATE USER] Created user ${maskedEmail} with role ${dto.role}, clerkId=${clerkId}`);

    return {
      clerkId,
      dbUserId,
      email: dto.email,
      role: dto.role,
      ...(autoGenerated ? { temporaryPassword: password } : {}),
    };
  }

  async findAll(params: FindAllUsersParams) {
    const { page, limit, role, search } = params;
    const skip = (page - 1) * limit;

    // If there's a search term, we need to search in both AppUser and User tables
    let matchingClerkIds: string[] | null = null;
    
    if (search && search.length >= 2) {
      // First, find User profiles that match the search (firstName, lastName)
      // Limit to 500 results to prevent performance issues with broad searches
      const matchingProfiles = await this.prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { clerkId: true },
        take: 500,
      });
      matchingClerkIds = matchingProfiles.map(p => p.clerkId);
    }

    const where: any = {};
    
    if (role) {
      where.role = role;
    }

    if (search) {
      const orConditions: any[] = [
        { email: { contains: search, mode: 'insensitive' } },
        { clerkId: { contains: search, mode: 'insensitive' } },
      ];
      
      // Include clerkIds that match from User table search (only if search >= 2 chars)
      if (matchingClerkIds && matchingClerkIds.length > 0) {
        orConditions.push({ clerkId: { in: matchingClerkIds } });
      }
      
      where.OR = orConditions;
    }

    const [appUsers, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.appUser.count({ where }),
    ]);

    // Get all clerkIds to fetch User profiles in bulk
    const clerkIds = appUsers.map(u => u.clerkId);
    
    // Fetch User profiles to get firstName/lastName
    const userProfiles = await this.prisma.user.findMany({
      where: {
        clerkId: { in: clerkIds },
      },
      include: {
        avatarAsset: true,
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Create a map of clerkId -> userProfile for quick lookup
    const profileMap = new Map(userProfiles.map(u => [u.clerkId, u]));

    // Convert AppUser to User format with profile data
    const users = appUsers.map(appUser => {
      const profile = profileMap.get(appUser.clerkId);
      
      // Build display name from firstName/lastName or fall back to email
      const firstName = profile?.firstName || null;
      const lastName = profile?.lastName || null;
      let displayName: string;
      
      if (firstName || lastName) {
        displayName = `${firstName || ''} ${lastName || ''}`.trim();
      } else if (appUser.email) {
        displayName = appUser.email;
      } else {
        displayName = 'Unknown User';
      }

      // Get primary organization if available
      const primaryOrg = profile?.organizations?.[0]?.organization;

      return {
        id: appUser.id,
        // IMPORTANT: profileId is the User.id used for subscriptions
        // This is different from id (AppUser.id) - subscriptions must use profileId
        profileId: profile?.id || null,
        clerkId: appUser.clerkId,
        email: appUser.email || profile?.email || null,
        firstName,
        lastName,
        name: displayName,
        role: appUser.role,
        phoneNumber: profile?.phoneNumber || null,
        workExperience: profile?.workExperience || null,
        education: profile?.education || null,
        certifications: profile?.certifications || [],
        skills: profile?.skills || [],
        availability: profile?.availability || null,
        cvUrl: profile?.cvUrl || null,
        shortBio: profile?.shortBio || null,
        stripeCustomerId: profile?.stripeCustomerId || null,
        lastActiveAt: profile?.lastActiveAt || null,
        lastLogin: profile?.lastActiveAt || null,
        isActive: profile?.isActive ?? true,
        status: profile?.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
        avatarUrl: profile?.avatarAsset?.publicUrl || null,
        avatarAssetId: profile?.avatarAssetId || null,
        orgId: primaryOrg?.id || null,
        orgName: primaryOrg?.name || null,
        orgType: primaryOrg?.type || null,
        organizations: profile?.organizations?.map(uo => ({
          id: uo.organization.id,
          name: uo.organization.name,
          type: uo.organization.type,
          role: uo.role,
        })) || [],
      };
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAppUserByClerkId(clerkId: string) {
    return this.prisma.appUser.findUnique({
      where: { clerkId },
    });
  }

  async createAppUser(data: { clerkId: string; email?: string; role: string }) {
    return this.prisma.appUser.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        role: data.role as any,
      },
    });
  }

  async findByClerkId(clerkId: string) {
    if (!clerkId) {
      return null;
    }

    try {
      const result = await this.principal.getOrBootstrapAccountAndProfile<typeof userProfileInclude>(
        clerkId,
        userProfileInclude,
      );
      return this.buildUserResponse(result.user, {
        id: result.appUser.id,
        clerkId: result.appUser.clerkId,
        email: result.appUser.email,
        role: result.appUser.role,
      });
    } catch (error) {
      console.error('[UsersService] Failed to load user by clerkId', { clerkId, error });
      return null;
    }
  }

  async findOne(id: string) {
    // Historically, various admin UIs have passed either:
    // - AppUser.id (account id) OR
    // - User.id (profile id)
    //
    // For admin candidate editing, we need an enriched response and we need to
    // gracefully handle profiles that exist without a corresponding AppUser row
    // (e.g., admin-created candidate records).

    const appUser = await this.prisma.appUser.findUnique({ where: { id } });
    if (appUser) {
      const enriched = await this.findByClerkId(appUser.clerkId);
      if (!enriched) {
        throw new NotFoundException('User not found');
      }
      return enriched;
    }

    const profile = await this.prisma.user.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException('User not found');
    }

    // Ensure an AppUser exists so downstream admin operations (/users/:id PATCH)
    // can function consistently.
    const existingAppUser = await this.prisma.appUser.findUnique({ where: { clerkId: profile.clerkId } });
    if (!existingAppUser) {
      await this.prisma.appUser.create({
        data: {
          clerkId: profile.clerkId,
          email: profile.email,
          role: profile.role,
        },
      });
    }

    const enriched = await this.findByClerkId(profile.clerkId);
    if (!enriched) {
      throw new NotFoundException('User not found');
    }
    return enriched;
  }

  async findByEmail(email: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { email },
    });

    if (!appUser) {
      return null;
    }

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  async findByOrganization(orgId: string) {
    // Note: AppUser doesn't have organization relations yet
    // This method returns empty array until organization migration is complete
    return [];
  }

  /**
   * Resolve the User (profile) id from either an AppUser.id or User.id.
   * Most controller actions receive AppUser.id, but the UserOrganization
   * junction table references User.id.
   */
  private async resolveProfileUserId(id: string): Promise<string> {
    const appUser = await this.prisma.appUser.findUnique({ where: { id }, select: { clerkId: true } });
    if (appUser) {
      const profile = await this.prisma.user.findUnique({ where: { clerkId: appUser.clerkId }, select: { id: true } });
      if (!profile) throw new NotFoundException('User profile not found');
      return profile.id;
    }
    const profile = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!profile) throw new NotFoundException('User not found');
    return profile.id;
  }

  async getUserOrganizations(id: string) {
    const profileUserId = await this.resolveProfileUserId(id);
    const records = await this.prisma.userOrganization.findMany({
      where: { userId: profileUserId },
      include: { organization: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((uo) => ({
      organizationId: uo.organizationId,
      name: uo.organization.name,
      type: uo.organization.type,
      role: uo.role,
      assignedAt: uo.createdAt,
    }));
  }

  async assignUserToOrganization(id: string, dto: AssignUserOrganizationDto) {
    const profileUserId = await this.resolveProfileUserId(id);
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true } });
    if (!org) throw new NotFoundException('Organization not found');
    const profile = await this.prisma.user.findUnique({ where: { id: profileUserId }, select: { role: true } });
    if (!profile) throw new NotFoundException('User profile not found');
    const orgRole = dto.role ?? profile.role;
    await this.prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: profileUserId, organizationId: dto.organizationId } },
      create: { userId: profileUserId, organizationId: dto.organizationId, role: orgRole },
      update: { role: orgRole },
    });
    return { success: true };
  }

  async removeUserFromOrganization(id: string, organizationId: string) {
    const profileUserId = await this.resolveProfileUserId(id);
    const result = await this.prisma.userOrganization.deleteMany({
      where: { userId: profileUserId, organizationId },
    });
    return { success: true, removed: result.count > 0 };
  }

  async touchLastActive(clerkId: string): Promise<void> {
    const now = new Date();
    await this.prisma.user.updateMany({
      where: { clerkId },
      data: { lastActiveAt: now },
    });
  }

  async updateByClerkId(clerkId: string, updateUserDto: UpdateUserDto) {
    console.log('🔄 [BACKEND UPDATE] Starting updateByClerkId');
    console.log('📝 UpdateUserDto received:', updateUserDto);
    console.log('🔍 ClerkId:', clerkId);
    
    // Check if AppUser exists (required for auth)
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      console.log('❌ AppUser not found for clerkId:', clerkId);
      throw new NotFoundException('User not found');
    }
    
    console.log('✅ AppUser found:', appUser.id);

    try {
      // Try to find or create User profile
      let user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        // Create User profile if it doesn't exist
        console.log('Creating User profile for clerkId:', clerkId);
        user = await this.prisma.user.create({
          data: {
            clerkId,
            email: appUser.email || updateUserDto.email || null, // Allow NULL - do not use empty string
            firstName: updateUserDto.firstName || null,
            lastName: updateUserDto.lastName || null,
            role: appUser.role,
          },
        });
        console.log('User profile created:', user.id);
      } else {
        // Update existing User profile
        console.log('Updating User profile for clerkId:', clerkId);
        
        // Build update data object with only provided fields
        const updateData: any = {};
        if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
        if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
        if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
        if (updateUserDto.phoneNumber !== undefined) updateData.phoneNumber = updateUserDto.phoneNumber;
        
        console.log('Update data prepared:', updateData);
        
        if (Object.keys(updateData).length === 0) {
          console.log('No fields to update, skipping database update');
          user = await this.prisma.user.findUnique({
            where: { clerkId },
          });
        } else {
          user = await this.prisma.user.update({
            where: { clerkId },
            data: updateData,
          });
          console.log('User profile updated:', user.id);
        }
      }

      // Also update email in AppUser if changed
      const isEmailChanging = updateUserDto.email && updateUserDto.email !== appUser.email;
      if (isEmailChanging) {
        await this.prisma.appUser.update({
          where: { id: appUser.id },
          data: { email: updateUserDto.email },
        });
        
        // Sync email to Clerk so login email matches database email
        this.logger.log(`📧 [updateByClerkId] Email changed for user ${clerkId}, syncing to Clerk...`);
        await this.syncEmailToClerkWithFallback(clerkId, updateUserDto.email!);
      }

      if (user?.role === UserRole.PARENT) {
        await this.linkParentLeadsToProfile(
          user.id,
          updateUserDto.email || user.email || appUser.email || undefined,
        );
      }

        // Return full User profile
        console.log('📤 [BACKEND UPDATE] Returning user data via enriched response');
        return this.findByClerkId(clerkId);
    } catch (error) {
      console.error('Error updating User profile:', error);
      // If User table operations fail, fall back to updating AppUser only
      console.log('Falling back to AppUser-only update');
      
      // Update AppUser email if provided
      const isEmailChangingFallback = updateUserDto.email && updateUserDto.email !== appUser.email;
      if (isEmailChangingFallback) {
        await this.prisma.appUser.update({
          where: { id: appUser.id },
          data: { email: updateUserDto.email },
        });
        
        // Still try to sync email to Clerk even if User table update failed
        this.logger.log(`📧 [updateByClerkId fallback] Email changed for user ${clerkId}, syncing to Clerk...`);
        await this.syncEmailToClerkWithFallback(clerkId, updateUserDto.email!);
      }
      
        // Return AppUser data in User format
        console.log('📤 [BACKEND UPDATE] Returning fallback user data via enriched response');
        return this.findByClerkId(clerkId);
    }
  }

  /**
   * Validate if a role change is allowed based on the caller's role.
   *
   * Rules (per admin dashboard requirements):
   * - SUPER_ADMIN can assign any role.
   * - ADMIN can assign ADMIN and any non-super-admin role, but cannot assign SUPER_ADMIN.
   * - ADMIN cannot change (demote) an existing SUPER_ADMIN.
   * 
   * @param targetRole - The role to assign
   * @param callerRole - The role of the user making the change
   * @param previousRole - Optional: current role of the target user (for demotion protection)
   * @throws ForbiddenException if the caller cannot assign the target role
   */
  validateRoleElevation(targetRole: UserRole, callerRole?: UserRole, previousRole?: UserRole): void {
    // Default-deny only the most privileged escalation if callerRole is missing
    if (!callerRole) {
      if (targetRole === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
      }
      return;
    }

    // Admin cannot create/promote SUPER_ADMIN
    if (callerRole === UserRole.ADMIN && targetRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }

    // Admin cannot demote an existing SUPER_ADMIN
    if (callerRole === UserRole.ADMIN && previousRole === UserRole.SUPER_ADMIN && targetRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can change a SUPER_ADMIN role');
    }
  }

  /**
   * Elevate a user to admin role with full profile reset.
   * This is a specialized method for role elevation that ensures
   * proper audit trail, Clerk synchronization, and profile cleanup.
   * 
   * When elevating from a general role (EDUCATOR, PARENT, etc.) to an admin role,
   * the user's profile is reset to treat them as a fresh admin account:
   * - Profile-specific data is cleared (workExperience, education, skills, etc.)
   * - Organization associations are removed
   * - Basic identity info is preserved (email, firstName, lastName)
   * 
   * @param userId - The AppUser ID to elevate
   * @param targetRole - The admin role to assign (ADMIN or SUPER_ADMIN)
   * @param changedBy - The clerkId or identifier of who made the change
   * @param reason - Optional reason for the role change
   */
  async elevateToAdmin(
    userId: string,
    targetRole: UserRole,
    changedBy: string,
    reason?: string,
  ) {
    // Validate the target role is an admin role
    if (!ADMIN_ROLES.includes(targetRole)) {
      throw new ForbiddenException('This method is only for elevating to admin roles');
    }

    const appUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    // Don't allow re-elevation to the same role
    if (appUser.role === targetRole) {
      this.logger.log(`User ${userId} already has role ${targetRole}`);
      return this.findByClerkId(appUser.clerkId);
    }

    const previousRole = appUser.role;
    const isElevatingFromGeneralRole = !ADMIN_ROLES.includes(previousRole);
    
    this.logger.log(`🔺 [ELEVATE TO ADMIN] Elevating user ${userId} from ${previousRole} to ${targetRole}`);

    // Perform role change and profile reset in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Use RoleSyncService for proper Clerk sync and audit trail
      await this.roleSyncService.changeRole({
        appUserId: userId,
        newRole: targetRole,
        changedBy,
        reason: reason || `Role elevation to ${targetRole}`,
        tx,
      });

      // If elevating from a general role to admin, reset the profile
      if (isElevatingFromGeneralRole) {
        this.logger.log(`🔄 [ELEVATE TO ADMIN] Resetting profile for user ${userId} (was ${previousRole})`);

        // Check if User profile exists
        const userProfile = await tx.user.findUnique({
          where: { clerkId: appUser.clerkId },
        });

        if (userProfile) {
          // Reset profile-specific fields but preserve identity info
          await tx.user.update({
            where: { clerkId: appUser.clerkId },
            data: {
              role: targetRole,
              // Clear profile-specific data
              workExperience: null,
              education: null,
              certifications: [],
              skills: [],
              availability: null,
              cvUrl: null,
              shortBio: null,
              // Keep: email, firstName, lastName, phoneNumber, avatarAssetId
            },
          });
          this.logger.log(`✅ [ELEVATE TO ADMIN] Profile data cleared for user ${userId}`);

          // Remove all organization associations
          const deletedOrgs = await tx.userOrganization.deleteMany({
            where: { userId: userProfile.id },
          });
          
          if (deletedOrgs.count > 0) {
            this.logger.log(`✅ [ELEVATE TO ADMIN] Removed ${deletedOrgs.count} organization association(s) for user ${userId}`);
          }
        }
      } else {
        // Just update the role in User profile if it exists (switching between admin roles)
        await tx.user.updateMany({
          where: { clerkId: appUser.clerkId },
          data: { role: targetRole },
        });
      }
    });

    this.logger.log(`✅ [ELEVATE TO ADMIN] User ${userId} elevated from ${previousRole} to ${targetRole}`);

    // Return the fully refreshed user profile
    return this.findByClerkId(appUser.clerkId);
  }

  async update(id: string, updateUserDto: UpdateUserDto, changedBy?: string, callerRole?: UserRole) {
    // Admin UIs may pass either AppUser.id (account id) OR User.id (profile id).
    // Support both to keep edit flows (e.g. candidate pool) reliable.
    let appUser = await this.prisma.appUser.findUnique({ where: { id } });
    let appUserId = id;

    if (!appUser) {
      const profile = await this.prisma.user.findUnique({ where: { id } });
      if (!profile) {
        throw new NotFoundException('User not found');
      }

      // Ensure an AppUser exists for the profile's clerkId so updates can proceed.
      const existingAppUser = await this.prisma.appUser.findUnique({
        where: { clerkId: profile.clerkId },
      });

      appUser =
        existingAppUser ??
        (await this.prisma.appUser.create({
          data: {
            clerkId: profile.clerkId,
            email: profile.email,
            role: profile.role,
          },
        }));

      appUserId = appUser.id;
    }

    // Check if role is changing - if so, validate and use RoleSyncService for proper Clerk sync
    const isRoleChanging = updateUserDto.role && updateUserDto.role !== appUser.role;
    const previousRole = appUser.role;
    const targetRole = updateUserDto.role;
    
    // Check if we're elevating from a general role to an admin role
    const isElevatingToAdmin = isRoleChanging && 
      targetRole && 
      ADMIN_ROLES.includes(targetRole) && 
      !ADMIN_ROLES.includes(previousRole);
    
    // Validate role elevation if changing to an admin role
    if (isRoleChanging && updateUserDto.role) {
      this.validateRoleElevation(updateUserDto.role, callerRole, previousRole);
    }

    // Update both AppUser and User profile in a transaction for data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Handle role change through RoleSyncService (includes Clerk sync)
      if (isRoleChanging && targetRole) {
        await this.roleSyncService.changeRole({
          appUserId: appUserId,
          newRole: targetRole,
          changedBy: changedBy || 'system',
          reason: isElevatingToAdmin ? `Role elevation from ${previousRole} to ${targetRole}` : 'Admin user update',
          tx,
        });
      }

      // Update AppUser table (non-role fields)
      const updatedAppUser = await tx.appUser.update({
        where: { id: appUserId },
        data: {
          email: updateUserDto.email || appUser.email,
          // Role is already handled by RoleSyncService above
        },
      });

      // Also try to update the User profile table if it exists
      let userProfile = null;
      const existingUser = await tx.user.findUnique({
        where: { clerkId: appUser.clerkId },
      });

      if (existingUser) {
        // If elevating to admin from a general role, reset profile-specific data
        if (isElevatingToAdmin) {
          this.logger.log(`🔄 [UPDATE] Resetting profile for user ${id} during elevation from ${previousRole} to ${targetRole}`);
          
          userProfile = await tx.user.update({
            where: { clerkId: appUser.clerkId },
            data: {
              role: targetRole,
              email: updateUserDto.email || existingUser.email,
              firstName: updateUserDto.firstName !== undefined ? updateUserDto.firstName : existingUser.firstName,
              lastName: updateUserDto.lastName !== undefined ? updateUserDto.lastName : existingUser.lastName,
              phoneNumber: updateUserDto.phoneNumber !== undefined ? updateUserDto.phoneNumber : existingUser.phoneNumber,
              // Clear profile-specific data
              workExperience: null,
              education: null,
              certifications: [],
              skills: [],
              availability: null,
              cvUrl: null,
              shortBio: null,
            },
          });
          
          // Remove all organization associations
          const deletedOrgs = await tx.userOrganization.deleteMany({
            where: { userId: existingUser.id },
          });
          
          if (deletedOrgs.count > 0) {
            this.logger.log(`✅ [UPDATE] Removed ${deletedOrgs.count} organization association(s) for user ${id}`);
          }
        } else {
          // Normal update - just update the provided fields
          const userUpdateData: any = {};
          if (updateUserDto.email !== undefined) userUpdateData.email = updateUserDto.email;
          if (updateUserDto.firstName !== undefined) userUpdateData.firstName = updateUserDto.firstName;
          if (updateUserDto.lastName !== undefined) userUpdateData.lastName = updateUserDto.lastName;
          if (updateUserDto.phoneNumber !== undefined) userUpdateData.phoneNumber = updateUserDto.phoneNumber;
          if (isRoleChanging && targetRole) userUpdateData.role = targetRole;
          if (updateUserDto.status !== undefined) {
            userUpdateData.isActive = updateUserDto.status === 'ACTIVE';
            if (updateUserDto.status === 'INACTIVE') {
              userUpdateData.deactivatedAt = new Date();
              if (updateUserDto.deactivatedReasonCode !== undefined) {
                userUpdateData.deactivatedReasonCode = updateUserDto.deactivatedReasonCode;
              }
              if (updateUserDto.deactivatedReasonText !== undefined) {
                userUpdateData.deactivatedReasonText = updateUserDto.deactivatedReasonText;
              }
            }
            if (updateUserDto.status === 'ACTIVE') {
              userUpdateData.deactivatedAt = null;
              userUpdateData.deactivatedReasonCode = null;
              userUpdateData.deactivatedReasonText = null;
            }
          }
          if (updateUserDto.candidatePoolVisible !== undefined) {
            // Only applies to educator/candidate profiles; safe to set anyway since field exists
            userUpdateData.candidatePoolVisible = updateUserDto.candidatePoolVisible;
          }

          if (Object.keys(userUpdateData).length > 0) {
            userProfile = await tx.user.update({
              where: { clerkId: appUser.clerkId },
              data: userUpdateData,
            });
          } else {
            userProfile = existingUser;
          }

          // Cascade user active status to their organizations and subscriptions.
          // When a user is deactivated, their organizations should also be hidden
          // from the frontend so inactive users' profiles don't appear in listings.
          // Their active subscriptions should also be suspended so the subscription
          // status doesn't create a visibility loophole in marketplace gates.
          if (updateUserDto.status !== undefined && existingUser) {
            const userOrgLinks = await tx.userOrganization.findMany({
              where: { userId: existingUser.id },
              select: { organizationId: true },
            });
            const orgIds = userOrgLinks.map((link) => link.organizationId);

            if (updateUserDto.status === 'INACTIVE') {
              // cascadeUserDeactivation handles org deactivation + subscription cancellation
              await this.cascadeUserDeactivation(
                tx, existingUser.id, orgIds,
                'User account deactivated by admin', 'UPDATE', id,
              );
            } else if (updateUserDto.status === 'ACTIVE' && orgIds.length > 0) {
              // Only reactivate orgs where ALL member users are now active.
              // This prevents blindly reactivating an org that another inactive
              // member originally caused to be deactivated.
              // Subscriptions are NOT auto-restored — an admin must manually
              // re-activate them to prevent accidental billing issues.
              const orgsWithInactiveMembers = await tx.userOrganization.findMany({
                where: {
                  organizationId: { in: orgIds },
                  user: { isActive: false },
                },
                select: { organizationId: true },
              });
              const blockedOrgIds = new Set(orgsWithInactiveMembers.map((l) => l.organizationId));
              const safeToReactivate = orgIds.filter((oid) => !blockedOrgIds.has(oid));

              if (safeToReactivate.length > 0) {
                const orgActivateResult = await tx.organization.updateMany({
                  where: { id: { in: safeToReactivate } },
                  data: { isActive: true },
                });
                this.logger.log(
                  `🏢 [UPDATE] Cascaded user reactivation to ${orgActivateResult.count} organization(s) for user ${id}` +
                    (blockedOrgIds.size > 0 ? ` (skipped ${blockedOrgIds.size} with other inactive members)` : ''),
                );
              }
            }
          }
        }
      }

      return { updatedAppUser, userProfile };
    });

    const { updatedAppUser, userProfile } = result;

    // Sync email to Clerk if it was changed
    // This ensures the user can log in with their new email
    const isEmailChanging = updateUserDto.email && updateUserDto.email !== appUser.email;
    if (isEmailChanging && updateUserDto.email) {
      this.logger.log(`📧 [UPDATE] Email changed for user ${appUserId}, syncing to Clerk...`);
      await this.syncEmailToClerkWithFallback(appUser.clerkId, updateUserDto.email);
    }

    // Fetch the latest role (in case it was updated by RoleSyncService)
    const latestAppUser = await this.prisma.appUser.findUnique({ where: { id: appUserId } });

    // Return the fully refreshed user profile (ensures status/isActive/candidatePoolVisible are correct)
    return this.findByClerkId(updatedAppUser.clerkId);
  }

  async assignRole(userId: string, role: UserRole, changedBy?: string) {
    // Use RoleSyncService for proper Clerk sync
    await this.roleSyncService.changeRole({
      appUserId: userId,
      newRole: role,
      changedBy: changedBy || 'system',
      reason: 'Role assignment',
    });

    // Fetch updated user
    const updatedAppUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!updatedAppUser) {
      throw new NotFoundException('User not found');
    }

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: null,
      lastName: null,
      role: updatedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: updatedAppUser.createdAt,
      updatedAt: updatedAppUser.updatedAt,
      organizations: [],
    };
  }

  /**
   * Update a user's role by Clerk ID.
   * Used for syncing admin roles from Clerk publicMetadata to the database.
   */
  async updateRoleByClerkId(clerkId: string, newRole: UserRole, changedBy: string, reason?: string) {
    this.logger.log(`🔄 [UPDATE ROLE BY CLERK ID] Updating role for ${clerkId} to ${newRole}`);
    
    await this.roleSyncService.changeRoleByClerkId({
      clerkId,
      newRole,
      changedBy,
      reason: reason || 'Role update by Clerk ID',
    });
    
    this.logger.log(`✅ [UPDATE ROLE BY CLERK ID] Role updated for ${clerkId} to ${newRole}`);
  }

  async removeRole(userId: string, role: UserRole, changedBy?: string) {
    // Use RoleSyncService for proper Clerk sync - sets to default PARENT role
    await this.roleSyncService.changeRole({
      appUserId: userId,
      newRole: UserRole.PARENT,
      changedBy: changedBy || 'system',
      reason: `Role removal (was: ${role})`,
    });

    // Fetch updated user
    const updatedAppUser = await this.prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!updatedAppUser) {
      throw new NotFoundException('User not found');
    }

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: null,
      lastName: null,
      role: updatedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: updatedAppUser.createdAt,
      updatedAt: updatedAppUser.updatedAt,
      organizations: [],
    };
  }

  async remove(id: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    // Soft delete = suspend account (do not change role; do not hard-delete).
    // This blocks login via ClerkAuthGuard (checks User.isActive).
    const now = new Date();

    const updatedProfile = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.user.findUnique({ where: { clerkId: appUser.clerkId } });

      let result;
      if (profile) {
        result = await tx.user.update({
          where: { id: profile.id },
          data: {
            isActive: false,
            deactivatedAt: now,
            deactivatedReasonCode: 'ADMIN_SUSPENDED',
            deactivatedReasonText: 'User suspended by admin',
          },
        });
      } else {
        // Ensure there is a profile row to enforce suspension in ClerkAuthGuard.
        result = await tx.user.create({
          data: {
            clerkId: appUser.clerkId,
            email: appUser.email,
            role: appUser.role,
            isActive: false,
            deactivatedAt: now,
            deactivatedReasonCode: 'ADMIN_SUSPENDED',
            deactivatedReasonText: 'User suspended by admin',
          },
        });
      }

      // Cascade suspension to organizations and subscriptions
      const profileId = result.id;
      const userOrgLinks = await tx.userOrganization.findMany({
        where: { userId: profileId },
        select: { organizationId: true },
      });
      const orgIds = userOrgLinks.map((link) => link.organizationId);

      await this.cascadeUserDeactivation(
        tx, profileId, orgIds,
        'User account suspended by admin', 'REMOVE', id,
      );

      return result;
    });

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: updatedProfile.firstName ?? null,
      lastName: updatedProfile.lastName ?? null,
      role: appUser.role,
      phoneNumber: updatedProfile.phoneNumber ?? null,
      workExperience: updatedProfile.workExperience ?? null,
      education: updatedProfile.education ?? null,
      certifications: updatedProfile.certifications ?? [],
      skills: updatedProfile.skills ?? [],
      availability: updatedProfile.availability ?? null,
      cvUrl: updatedProfile.cvUrl ?? null,
      stripeCustomerId: updatedProfile.stripeCustomerId ?? null,
      lastActiveAt: updatedProfile.lastActiveAt ?? null,
      isActive: updatedProfile.isActive,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  /**
   * Hard delete (best-effort) — only allowed when it is safe.
   *
   * This is intentionally strict: if the user has dependent records that would
   * break referential integrity (messages, subscriptions, uploaded assets, etc.),
   * we refuse with a 409 and provide counts so an admin can decide what to do.
   */
  async hardRemove(id: string, opts?: { force?: boolean }) {
    const force = Boolean(opts?.force);
    const appUser = await this.prisma.appUser.findUnique({ where: { id } });
    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.prisma.user.findUnique({ where: { clerkId: appUser.clerkId } });

    // Helper: safely count records in a table that might not exist yet (P2021).
    const safeCount = async (query: Promise<number>): Promise<number> => {
      try {
        return await query;
      } catch (error: any) {
        if (error?.code === 'P2021') return 0;
        throw error;
      }
    };

    // Preflight dependency counts. We only allow hard-delete for "clean" users
    // (typically newly created accounts) to avoid blowing away important history.
    const [
      assetCount,
      courseCount,
      orgMembershipCount,
      contactInfoCount,
      messageCount,
      conversationParticipantCount,
      subscriptionCount,
      jobApplicationCount,
      supportTicketCount,
      ticketResponseCount,
    ] = await Promise.all([
      safeCount(this.prisma.asset.count({ where: { uploadedById: appUser.id } })),
      safeCount(this.prisma.course.count({ where: { createdBy: appUser.id } })),
      profile ? safeCount(this.prisma.userOrganization.count({ where: { userId: profile.id } })) : Promise.resolve(0),
      profile ? safeCount(this.prisma.userContactInfo.count({ where: { userId: profile.id } })) : Promise.resolve(0),
      profile
        ? safeCount(this.prisma.message.count({
            where: { OR: [{ senderId: profile.id }, { receiverId: profile.id }] },
          }))
        : Promise.resolve(0),
      profile ? safeCount(this.prisma.conversationParticipant.count({ where: { userId: profile.id } })) : Promise.resolve(0),
      profile ? safeCount(this.prisma.subscription.count({ where: { userId: profile.id } })) : Promise.resolve(0),
      profile ? safeCount(this.prisma.jobApplication.count({ where: { candidateId: profile.id } })) : Promise.resolve(0),
      profile ? safeCount(this.prisma.supportTicket.count({ where: { OR: [{ userId: profile.id }, { assignedTo: profile.id }] } })) : Promise.resolve(0),
      profile ? safeCount(this.prisma.ticketResponse.count({ where: { userId: profile.id } })) : Promise.resolve(0),
    ]);

    // Allow deleting trivial link tables (memberships/contact) automatically,
    // but refuse when the user has any "real" dependent data.
    const blocking: Record<string, number> = {
      assetsUploaded: assetCount,
      coursesCreated: courseCount,
      messages: messageCount,
      conversationParticipants: conversationParticipantCount,
      subscriptions: subscriptionCount,
      jobApplications: jobApplicationCount,
      supportTickets: supportTicketCount,
      ticketResponses: ticketResponseCount,
    };

    const hasBlocking = Object.values(blocking).some((n) => n > 0);
    if (hasBlocking && !force) {
      throw new ConflictException({
        message:
          'User cannot be hard-deleted because dependent records exist. Use soft delete, or manually purge dependent data first.',
        code: 'HARD_DELETE_BLOCKED',
        blocking,
        nonBlocking: {
          orgMemberships: orgMembershipCount,
          contactInfo: contactInfoCount,
        },
      });
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
        // Helper: run a deleteMany that might target a table not yet migrated.
        // Uses a SAVEPOINT so that a P2021 (table-not-found) error can be swallowed
        // without leaving the PostgreSQL transaction in an aborted state — which
        // would cause every subsequent statement to fail with error 25P02.
        const safeDeleteMany = async (model: any, where: any): Promise<void> => {
          const sp = `sp_${Math.random().toString(36).slice(2, 10)}`;
          await tx.$executeRawUnsafe(`SAVEPOINT "${sp}"`);
          try {
            await model.deleteMany({ where });
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT "${sp}"`);
          } catch (error: any) {
            await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT "${sp}"`);
            if (error?.code === 'P2021') return; // table does not exist, skip safely
            throw error;
          }
        };
        // Helper: run an updateMany that might target a table not yet migrated.
        // Uses the same SAVEPOINT pattern as safeDeleteMany.
        const safeUpdateMany = async (model: any, where: any, data: any): Promise<void> => {
          const sp = `sp_${Math.random().toString(36).slice(2, 10)}`;
          await tx.$executeRawUnsafe(`SAVEPOINT "${sp}"`);
          try {
            await model.updateMany({ where, data });
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT "${sp}"`);
          } catch (error: any) {
            await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT "${sp}"`);
            if (error?.code === 'P2021') return; // table does not exist, skip safely
            throw error;
          }
        };

        // In force mode, aggressively delete dependent data so the user can be removed.
        if (force && profile) {
          // Track conversation IDs that might become orphaned after we remove this user's
          // messages and participant membership, so we can clean them up safely.
          const [participantConversations, messageConversations] = await Promise.all([
            tx.conversationParticipant.findMany({
              where: { userId: profile.id },
              select: { conversationId: true },
            }),
            tx.message.findMany({
              where: {
                OR: [{ senderId: profile.id }, { receiverId: profile.id }],
                conversationId: { not: null },
              },
              select: { conversationId: true },
            }),
          ]);
          const candidateConversationIds = Array.from(
            new Set(
              [
                ...participantConversations.map((c) => c.conversationId),
                ...messageConversations.map((m) => m.conversationId as string),
              ].filter(Boolean),
            ),
          );

          // Messaging
          await tx.message.deleteMany({ where: { OR: [{ senderId: profile.id }, { receiverId: profile.id }] } });
          await tx.conversationParticipant.deleteMany({ where: { userId: profile.id } });

          // Remove conversations that were only kept alive by this user's participation/messages.
          // We restrict deletion to conversations we touched to avoid sweeping unrelated records.
          if (candidateConversationIds.length > 0) {
            await tx.conversation.deleteMany({
              where: {
                id: { in: candidateConversationIds },
                participants: { none: {} },
                messages: { none: {} },
              },
            });
          }

          // Jobs / support / subscriptions
          await safeDeleteMany(tx.jobApplication, { candidateId: profile.id });
          await safeDeleteMany(tx.ticketResponse, { userId: profile.id });
          await safeDeleteMany(tx.supportTicket, { OR: [{ userId: profile.id }, { assignedTo: profile.id }] });
          await safeDeleteMany(tx.userSubscription, { userId: profile.id });

          // billing_transactions.subscriptionId has ON DELETE RESTRICT, so we must
          // delete billing transactions before we can delete the subscriptions themselves.
          // The findMany is wrapped in its own SAVEPOINT so that a P2021 (table-not-found)
          // on either subscriptions or billing_transactions in a partially-migrated
          // environment does not abort the outer transaction (mirroring safeDeleteMany).
          {
            const sp = `sp_${Math.random().toString(36).slice(2, 10)}`;
            await tx.$executeRawUnsafe(`SAVEPOINT "${sp}"`);
            try {
              const userSubIds = await tx.subscription
                .findMany({ where: { userId: profile.id }, select: { id: true } })
                .then((rows) => rows.map((r) => r.id));
              if (userSubIds.length > 0) {
                await safeDeleteMany(tx.billingTransaction, { subscriptionId: { in: userSubIds } });
              }
              await tx.$executeRawUnsafe(`RELEASE SAVEPOINT "${sp}"`);
            } catch (error: any) {
              await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT "${sp}"`);
              if (error?.code !== 'P2021') throw error;
              // subscriptions table absent; safeDeleteMany below will also skip gracefully
            }
          }
          await safeDeleteMany(tx.subscription, { userId: profile.id });

          // E-learning
          await safeDeleteMany(tx.certificate, { userId: profile.id });
          // Note: DiscussionReply has onDelete: Cascade from CourseDiscussion,
          // so deleting discussions auto-cascades to their replies.
          await safeDeleteMany(tx.courseDiscussion, { userId: profile.id });
          await safeDeleteMany(tx.courseEnrollment, { userId: profile.id });

          // ── Relations that were previously missing, causing P2003 / 500 ──

          // Licensing
          await safeDeleteMany(tx.license, { userId: profile.id });

          // Content moderation (moderatorId is required → Restrict)
          await safeDeleteMany(tx.moderationAction, { moderatorId: profile.id });

          // Notification preferences (userId is required → Restrict)
          await safeDeleteMany(tx.userNotificationPreferences, { userId: profile.id });

          // Admin content items created by the user (uploadedBy is required → Restrict)
          await safeDeleteMany(tx.contentItem, { uploadedBy: profile.id });

          // Policy alerts created by the user (createdBy is required → Restrict)
          await safeDeleteMany(tx.policyAlert, { createdBy: profile.id });

          // API keys created by the user (createdBy is required → Restrict)
          await safeDeleteMany(tx.apiKey, { createdBy: profile.id });

          // Webhooks created by the user (createdBy is required → Restrict).
          // WebhookLog has onDelete: Cascade on webhookId, so deleting
          // the webhook cascades to its logs automatically.
          await safeDeleteMany(tx.webhook, { createdBy: profile.id });

          // Calendar events the user created (createdBy is optional → SetNull,
          // but clean up explicitly for data hygiene)
          await safeUpdateMany(tx.calendarEvent, { createdBy: profile.id }, { createdBy: null });

          // Subscription requests / cancellation requests (userId is optional → SetNull,
          // but nullify explicitly to be safe)
          await safeUpdateMany(tx.subscriptionRequest, { userId: profile.id }, { userId: null });
          await safeUpdateMany(tx.subscriptionCancellationRequest, { userId: profile.id }, { userId: null });

          // Vendor client marks (markedByUserId is optional → SetNull)
          await safeUpdateMany(tx.vendorClient, { markedByUserId: profile.id }, { markedByUserId: null });

          // Content moderation reports/reviews (optional FKs → SetNull)
          await safeUpdateMany(tx.contentModeration, { reporterId: profile.id }, { reporterId: null });
          await safeUpdateMany(tx.contentModeration, { moderatorId: profile.id }, { moderatorId: null });

          // Email logs (optional FK → SetNull)
          await safeUpdateMany(tx.emailLog, { userId: profile.id }, { userId: null });

          // Audit logs (optional FK → SetNull).
          // Nullifying actorId is intentional for hard-delete: the admin
          // explicitly chose permanent removal.  The audit row itself is
          // retained (action, timestamp, metadata) — only the actor
          // linkage is severed so the User row can be dropped.
          await safeUpdateMany(tx.auditLog, { actorId: profile.id }, { actorId: null });

          // Platform settings last-updated-by (optional FK → SetNull)
          await safeUpdateMany(tx.platformSettings, { updatedBy: profile.id }, { updatedBy: null });
        }

        // If the AppUser has uploaded assets, we cannot delete it due to onDelete: Restrict.
        // Courses also reference AppUser via Course.createdBy (non-nullable), so we must
        // reassign ownership before deleting the AppUser.
        //
        // NOTE: `clerkId: 'system'` is a reserved placeholder and must never be used for
        // real authentication flows.
        if (force && (assetCount > 0 || courseCount > 0)) {
          const systemAppUser = await tx.appUser.upsert({
            where: { clerkId: 'system' },
            update: {},
            create: {
              clerkId: 'system',
              email: null,
              role: UserRole.PARENT, // minimal privileges; only an ownership placeholder
            },
          });
          if (assetCount > 0) {
            await tx.asset.updateMany({
              where: { uploadedById: appUser.id },
              data: { uploadedById: systemAppUser.id },
            });
          }
          if (courseCount > 0) {
            await tx.course.updateMany({
              where: { createdBy: appUser.id },
              data: { createdBy: systemAppUser.id },
            });
          }
        }

        if (profile) {
          // userOrganization is a core table guaranteed to exist in every
          // environment, so it does not need the P2021 safeDeleteMany guard.
          await tx.userOrganization.deleteMany({ where: { userId: profile.id } });
          await safeDeleteMany(tx.userContactInfo, { userId: profile.id });
          await tx.user.delete({ where: { id: profile.id } });
        } else {
          // Fall back to clerkId-based cleanup if profile row doesn't exist.
          await tx.user.deleteMany({ where: { clerkId: appUser.clerkId } });
        }

        await tx.appUser.delete({ where: { id: appUser.id } });
        },
        // Force-delete performs ~35 sequential DB operations; increase
        // the timeout well beyond Prisma's default 5 s to avoid spurious
        // transaction timeouts on larger accounts.
        { timeout: 30_000 },
      );
    } catch (err: any) {
      // Log the full error so the specific FK constraint is visible in server logs.
      this.logger.error(`[HARD DELETE] Transaction failed for user ${id}`, {
        code: err?.code,
        meta: err?.meta,
        message: err?.message,
      });

      // Guard against FK races: even after a "clean" preflight, a dependent record may be
      // created before we delete, resulting in a FK constraint error. Translate to 409.
      if (err?.code === 'P2003') {
        throw new ConflictException({
          message:
            'User cannot be hard-deleted because dependent records exist. Use soft delete, or manually purge dependent data first.',
          code: 'HARD_DELETE_BLOCKED',
          detail: err?.meta?.field_name || err?.message,
          blocking,
          nonBlocking: {
            orgMemberships: orgMembershipCount,
            contactInfo: contactInfoCount,
          },
        });
      }
      throw err;
    }

    // Delete from Clerk too (best-effort). If Clerk deletion fails, queue a retry via outbox.
    if (!this.clerk) {
      throw new BadRequestException('Clerk is not configured on the API');
    }

    try {
      await (this.clerk as any).users.deleteUser(appUser.clerkId);
    } catch (error: any) {
      if (error?.status === 404) {
        // Already deleted in Clerk.
      } else {
        this.logger.error('Failed to delete user from Clerk, queuing retry', {
          clerkId: appUser.clerkId,
          message: error?.message,
          status: error?.status,
        });
        await this.prisma.outbox.create({
          data: {
            topic: 'clerk.user.delete',
            payload: {
              clerkId: appUser.clerkId,
              reason: 'Hard delete requested by admin',
              requestedAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    return { success: true };
  }

  // Sync user with Clerk webhook
  async syncWithClerk(clerkData: {
    id: string;
    email_addresses: any[];
    first_name: string;
    last_name: string;
    created_at: number;
    updated_at: number;
  }) {
    const email = clerkData.email_addresses[0]?.email_address;
    if (!email) {
      throw new Error('No email found in Clerk data');
    }

    try {
      const existingUser = await this.findByClerkId(clerkData.id);

      if (existingUser) {
        // Update existing user
        const updatedAppUser = await this.prisma.appUser.update({
          where: { clerkId: clerkData.id },
          data: {
            email,
            updatedAt: new Date(clerkData.updated_at),
          },
        });

        // Return in User format for compatibility
        return {
          id: updatedAppUser.id,
          clerkId: updatedAppUser.clerkId,
          email: updatedAppUser.email,
          firstName: null,
          lastName: null,
          role: updatedAppUser.role,
          phoneNumber: null,
          workExperience: null,
          education: null,
          certifications: [],
          skills: [],
          availability: null,
          cvUrl: null,
          stripeCustomerId: null,
          lastActiveAt: null,
          isActive: true,
          createdAt: updatedAppUser.createdAt,
          updatedAt: updatedAppUser.updatedAt,
          organizations: [],
        };
      }
    } catch (error) {
      // User not found, create new one
    }

    // Create new user
    const newAppUser = await this.prisma.appUser.create({
      data: {
        clerkId: clerkData.id,
        email,
        role: UserRole.PARENT, // Default role
        createdAt: new Date(clerkData.created_at),
        updatedAt: new Date(clerkData.updated_at),
      },
    });

    // Return in User format for compatibility
    return {
      id: newAppUser.id,
      clerkId: newAppUser.clerkId,
      email: newAppUser.email,
      firstName: null,
      lastName: null,
      role: newAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: newAppUser.createdAt,
      updatedAt: newAppUser.updatedAt,
      organizations: [],
    };
  }
}
