import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
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

        await tx.user.create({
          data: {
            clerkId,
            email,
            role: dto.role,
            firstName: firstName || null,
            lastName: lastName || null,
            phoneNumber: dto.phone,
            isActive: true,
          },
        });
      });
      
      // If organization details are provided, we should ideally create the organization here
      // This is a simplification
      if (dto.organisationName) {
         // Logic to create organization would go here
         // For now we rely on the user updating their profile/org later or implement a separate flow
         this.logger.log(`🏢 [COMPLETE PROFILE] Organization name provided: ${dto.organisationName}`);
      }
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
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
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
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
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
          appUserId: id,
          newRole: targetRole,
          changedBy: changedBy || 'system',
          reason: isElevatingToAdmin ? `Role elevation from ${previousRole} to ${targetRole}` : 'Admin user update',
          tx,
        });
      }

      // Update AppUser table (non-role fields)
      const updatedAppUser = await tx.appUser.update({
        where: { id },
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

          if (Object.keys(userUpdateData).length > 0) {
            userProfile = await tx.user.update({
              where: { clerkId: appUser.clerkId },
              data: userUpdateData,
            });
          } else {
            userProfile = existingUser;
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
      this.logger.log(`📧 [UPDATE] Email changed for user ${id}, syncing to Clerk...`);
      await this.syncEmailToClerkWithFallback(appUser.clerkId, updateUserDto.email);
    }

    // Fetch the latest role (in case it was updated by RoleSyncService)
    const latestAppUser = await this.prisma.appUser.findUnique({ where: { id } });

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: userProfile?.firstName || null,
      lastName: userProfile?.lastName || null,
      role: latestAppUser?.role || updatedAppUser.role,
      phoneNumber: userProfile?.phoneNumber || null,
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

    // Delete both User profile and AppUser in a transaction for data consistency
    const deletedAppUser = await this.prisma.$transaction(async (tx) => {
      // Try to delete the User profile table first (if it exists)
      // Using deleteMany to avoid errors if profile doesn't exist
      const deleteResult = await tx.user.deleteMany({
        where: { clerkId: appUser.clerkId },
      });
      
      if (deleteResult.count > 0) {
        console.log(`Deleted User profile for clerkId: ${appUser.clerkId}`);
      } else {
        console.log(`User profile not found for clerkId: ${appUser.clerkId}`);
      }

      // Delete AppUser
      return await tx.appUser.delete({
        where: { id },
      });
    });

    // Return in User format for compatibility
    return {
      id: deletedAppUser.id,
      clerkId: deletedAppUser.clerkId,
      email: deletedAppUser.email,
      firstName: null,
      lastName: null,
      role: deletedAppUser.role,
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
      createdAt: deletedAppUser.createdAt,
      updatedAt: deletedAppUser.updatedAt,
      organizations: [],
    };
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
