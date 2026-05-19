import {
  Body,
  Controller,
  Get,
  Patch,
  Delete,
  Request,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { AssetKind, EducatorApprovalStatus, NotificationType, UserRole as PrismaUserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnsureProfileInterceptor } from '../principal/ensure-profile.interceptor';
import { PrincipalService } from '../principal/principal.service';
import { UploadService } from '../upload/upload.service';
import { UpdateFoundationSettingsDto } from './dto/foundation-settings.dto';
import { UpdateEducatorSettingsDto } from './dto/educator-settings.dto';
import {
  formatEducationText,
  formatWorkExperienceText,
  normalizeCertificationItems,
  normalizeEducationItems,
  normalizeWorkExperienceItems,
} from '../utils/educator-profile-items';
import { UpdateSupplierSettingsDto } from './dto/supplier-settings.dto';
import { UpdateServiceProviderSettingsDto } from './dto/service-provider-settings.dto';
import { UpdateParentSettingsDto } from './dto/parent-settings.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';
import { normalizeRegionsServed } from '../common/utils/regions.util';
import { AllowPendingEducator } from '../auth/decorators/allow-pending-educator.decorator';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('settings')
@Controller('settings')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(EnsureProfileInterceptor)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly principal: PrincipalService,
    private readonly translationService: TranslationService,
    private readonly uploadService: UploadService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Try to resolve an Asset (by publicUrl or storageKey) for a given user and kind.
   * This is used for "full delete" flows where the profile stores only a URL.
   */
  private async resolveUserAssetByUrl(
    accountId: string,
    fileUrl: string,
    kind: AssetKind,
  ): Promise<{ id: string } | null> {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    // First try direct match on publicUrl
    const byPublicUrl = await this.prisma.asset.findFirst({
      where: {
        uploadedById: accountId,
        kind,
        publicUrl: fileUrl,
      },
      select: { id: true },
    });
    if (byPublicUrl) return byPublicUrl;

    // Then try to infer storageKey from known URL formats
    const storageKey = this.extractStorageKeyFromFileUrl(fileUrl);
    if (!storageKey) return null;

    return await this.prisma.asset.findFirst({
      where: {
        uploadedById: accountId,
        kind,
        storageKey,
      },
      select: { id: true },
    });
  }

  /**
   * Extracts a storageKey from various file URL formats:
   * - /api/upload/download/<storageKey>
   * - https://.../api/upload/download/<storageKey>
   * - https://assets.../<storageKey>
   */
  private extractStorageKeyFromFileUrl(fileUrl: string): string | null {
    try {
      const url = new URL(fileUrl, 'http://localhost');
      const pathname = url.pathname || '';

      const downloadPrefix = '/api/upload/download/';
      const idx = pathname.indexOf(downloadPrefix);
      if (idx !== -1) {
        const key = pathname.substring(idx + downloadPrefix.length);
        return key && key.trim() ? key : null;
      }

      // Otherwise treat path as "<storageKey>" (strip leading slash)
      const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      return key && key.trim() ? key : null;
    } catch {
      return null;
    }
  }

  private getContext(request: any) {
    const context = request?.context ?? {};
    const { profileId, accountId, clerkUserId } = context;
    if (!profileId || !accountId || !clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }
    return { profileId, accountId, clerkUserId };
  }

  private async isFeatureEnabled(flagKey: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: flagKey } });
    return flag ? flag.isActive : true;
  }

  /**
   * Validates that an asset exists, belongs to the user, and has the correct kind.
   * @param tx Prisma transaction client
   * @param assetId The asset ID to validate
   * @param userId The user ID who should own the asset
   * @param allowedKinds Array of allowed AssetKind values
   * @param fieldName Name of the field for error messages
   */
  private async validateAssetForUsage(
    tx: any,
    assetId: string | null | undefined,
    userId: string,
    allowedKinds: AssetKind[],
    fieldName: string,
  ): Promise<void> {
    if (!assetId) return; // Skip validation if no asset ID provided

    const asset = await tx.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new BadRequestException(`${fieldName} asset not found`);
    }

    if (asset.uploadedById !== userId) {
      throw new BadRequestException(`Unauthorized to use this ${fieldName.toLowerCase()} asset`);
    }

    if (!allowedKinds.includes(asset.kind)) {
      throw new BadRequestException(
        `Asset must be of kind ${allowedKinds.join(' or ')} for ${fieldName.toLowerCase()}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Foundation
  // ─────────────────────────────────────────────────────────────

  @Get('foundation')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getFoundationSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);

    const { user, appUser } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
            },
          },
        },
      },
    });

    const organizations = (user as any).organizations ?? [];

    if (!organizations.length || !organizations[0].organization) {
      return {
        success: false,
        message: 'Foundation not found',
      };
    }

    const organization = organizations[0].organization;

    return {
      success: true,
      data: {
        companyName: organization.name,
        // Fall back to the user's auth email when no contact email has been set.
        contactEmail: organization.contactEmail ?? user.email ?? appUser.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: normalizeRegionsServed(
          (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        ),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
        websiteUrl: (organization as any).websiteUrl ?? '',
        languages: organization.languages ?? [],
        capacity: organization.capacity ?? 0,
        pedagogy: organization.pedagogy ?? [],
        logoUrl: (organization as any).logoAsset?.publicUrl ?? null,
        coverImageUrl: (organization as any).coverAsset?.publicUrl ?? null,
      },
    };
  }

  @Patch('foundation')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Update foundation settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateFoundationSettings(@Request() req, @Body() settings: UpdateFoundationSettingsDto) {
    const { profileId, accountId } = this.getContext(req);

    await this.prisma.$transaction(async (tx) => {
      // Validate asset ownership and kind before updating
      // Use accountId (AppUser.id) since Asset.uploadedById references AppUser
      await this.validateAssetForUsage(
        tx,
        settings.logoAssetId,
        accountId,
        [AssetKind.LOGO],
        'Logo',
      );
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        accountId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: profileId },
        include: { organization: true },
      });

      if (userOrg?.organization) {
        // Update existing organization
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            ...(settings.contactEmail !== undefined && { contactEmail: settings.contactEmail || null }),
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: normalizeRegionsServed(settings.regionsServed),
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            capacity: settings.capacity,
            pedagogy: settings.pedagogy ?? [],
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });
      } else {
        // Create new organization if it doesn't exist
        const newOrganization = await tx.organization.create({
          data: {
            name: settings.companyName,
            type: 'FOUNDATION',
            contactEmail: settings.contactEmail || null,
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: normalizeRegionsServed(settings.regionsServed),
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            capacity: settings.capacity,
            pedagogy: settings.pedagogy ?? [],
            isActive: true,
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });

        // Link user to the new organization
        await tx.userOrganization.create({
          data: {
            userId: profileId,
            organizationId: newOrganization.id,
            role: UserRole.FOUNDATION,
          },
        });
      }
    });

    // Update organization translations after transaction
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: profileId },
      include: { organization: true },
    });

    if (userOrg?.organization) {
      // Update organization translations (only description - name is a proper noun/identifier)
      const translatableFields = FIELDS_BY_ENTITY.organization || ['description'];
      const translationPayload: Record<string, any> = {
        description: userOrg.organization.description || '',
      };

      if (translationPayload.description && translationPayload.description.trim().length > 0) {
        await this.translationService.saveEntityWithTranslations(
          'organization',
          userOrg.organization.id,
          translationPayload,
          translatableFields,
        );
      }
    }

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Educator
  // ─────────────────────────────────────────────────────────────

  @Get('educator')
  @Roles(UserRole.EDUCATOR)
  @AllowPendingEducator()
  @ApiOperation({ summary: 'Get educator settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getEducatorSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      avatarAsset: true, // Include avatar asset relation
      coverAsset: true, // Include cover asset relation
      cvAsset: true, // Include CV asset relation
      contactInfo: true,
      workExperienceItems: { orderBy: { sortOrder: 'asc' } },
      educationItems: { orderBy: { sortOrder: 'asc' } },
      certificationItems: { orderBy: { sortOrder: 'asc' } },
    });

    return {
      success: true,
      data: {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        // Contact email is stored separately from authentication email.
        // For backward compatibility, fall back to the user's auth email if unset.
        contactEmail: (user as any).contactInfo?.contactEmail ?? user.email,
        phoneNumber: user.phoneNumber ?? '',
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
        workExperienceItems: user.workExperienceItems ?? [],
        educationItems: user.educationItems ?? [],
        certificationItems: user.certificationItems ?? [],
        skills: user.skills ?? [],
        availability: user.availability ?? '',
        availabilitySettings: (user as any).availabilitySettings ?? null,
        cvUrl: user.cvUrl ?? '',
        documents: (user as any).documents ?? [],
        shortBio: user.shortBio ?? '',
        candidatePoolVisible: !!(user as any).candidatePoolVisible,
        availableForReplacement: !!(user as any).availableForReplacement,
        region: (user as any).region ?? '',
        jobRole: (user as any).jobRole ?? '',
        cities: Array.isArray((user as any).cities) ? (user as any).cities : [],
        avatarAssetId: user.avatarAssetId ?? '',
        avatarUrl: (user as any).avatarAsset?.publicUrl ?? '', // Compute from asset relation
        coverAssetId: (user as any).coverAssetId ?? '',
        coverImageUrl: (user as any).coverAsset?.publicUrl ?? null,
      },
    };
  }

  @Patch('educator')
  @Roles(UserRole.EDUCATOR)
  @AllowPendingEducator()
  @ApiOperation({ summary: 'Update educator settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateEducatorSettings(@Request() req, @Body() settings: UpdateEducatorSettingsDto) {
    const { profileId, accountId } = this.getContext(req);

    // If the user removes their CV (cvUrl=""), we perform a full delete:
    // 1) clear cvUrl on the profile
    // 2) delete the underlying uploaded asset (best-effort)
    const existingCv = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: { cvUrl: true, shortBio: true, approvalStatus: true, email: true, firstName: true },
    });
    const previousCvUrl = existingCv?.cvUrl || '';
    const normalizedIncomingCvUrl =
      settings.cvUrl !== undefined && typeof settings.cvUrl === 'string' && settings.cvUrl.trim().length === 0
        ? null
        : settings.cvUrl;
    const shouldDeletePreviousCv =
      settings.cvUrl !== undefined &&
      normalizedIncomingCvUrl === null &&
      typeof previousCvUrl === 'string' &&
      previousCvUrl.trim().length > 0;

    const normalizedWorkExperienceItems = settings.workExperienceItems
      ? normalizeWorkExperienceItems(settings.workExperienceItems)
      : null;
    const normalizedEducationItems = settings.educationItems
      ? normalizeEducationItems(settings.educationItems)
      : null;
    const normalizedCertificationItems = settings.certificationItems
      ? normalizeCertificationItems(settings.certificationItems)
      : null;

    const workExperienceText =
      normalizedWorkExperienceItems !== null
        ? formatWorkExperienceText(normalizedWorkExperienceItems)
        : settings.workExperience;
    const educationText =
      normalizedEducationItems !== null
        ? formatEducationText(normalizedEducationItems)
        : settings.education;
    const certificationNames =
      normalizedCertificationItems !== null
        ? normalizedCertificationItems.map((item) => item.name)
        : settings.certifications;

    await this.prisma.$transaction(async (tx) => {
      // Validate asset ownership and kind before updating
      // Use accountId (AppUser.id) since Asset.uploadedById references AppUser
      await this.validateAssetForUsage(
        tx,
        settings.avatarAssetId,
        accountId,
        [AssetKind.AVATAR],
        'Avatar',
      );
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        accountId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );
      await this.validateAssetForUsage(
        tx,
        settings.cvAssetId,
        accountId,
        [AssetKind.CV],
        'CV',
      );

      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.email,
          phoneNumber: settings.phoneNumber,
          workExperience: workExperienceText,
          education: educationText,
          certifications: certificationNames,
          skills: settings.skills,
          availability: settings.availability,
          ...(settings.cvUrl !== undefined && { cvUrl: normalizedIncomingCvUrl }),
          ...(settings.cvAssetId !== undefined && { cvAssetId: settings.cvAssetId || null }),
          shortBio: settings.shortBio,
          region: settings.region,
          ...(settings.cities !== undefined && { cities: settings.cities }),
          ...(settings.jobRole !== undefined && { jobRole: settings.jobRole }),
          ...(settings.candidatePoolVisible !== undefined && { candidatePoolVisible: settings.candidatePoolVisible }),
          ...(settings.availableForReplacement !== undefined && { availableForReplacement: settings.availableForReplacement }),
          ...(settings.availabilitySettings !== undefined && { availabilitySettings: settings.availabilitySettings as any }),
          ...(settings.documents !== undefined && { documents: settings.documents as any }),
          ...(settings.avatarAssetId !== undefined && { avatarAssetId: settings.avatarAssetId || null }),
          ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
        },
      });

      // Store contact email separately (does NOT touch auth email).
      if (settings.contactEmail !== undefined) {
        await tx.userContactInfo.upsert({
          where: { userId: profileId },
          create: {
            userId: profileId,
            contactEmail: settings.contactEmail || null,
          },
          update: {
            contactEmail: settings.contactEmail || null,
          },
        });
      }

      if (settings.email) {
        await tx.appUser.update({
          where: { id: accountId },
          data: { email: settings.email },
        });
      }

      if (normalizedWorkExperienceItems !== null) {
        await tx.educatorWorkExperience.deleteMany({
          where: { userId: profileId },
        });
        if (normalizedWorkExperienceItems.length > 0) {
          await tx.educatorWorkExperience.createMany({
            data: normalizedWorkExperienceItems.map((item, index) => ({
              userId: profileId,
              jobTitle: item.jobTitle || 'Experience',
              institutionName: item.institutionName || '',
              startDate: item.startDate,
              endDate: item.endDate,
              descriptionPoints: item.descriptionPoints,
              sortOrder: index,
            })),
          });
        }
      }

      if (normalizedEducationItems !== null) {
        await tx.educatorEducation.deleteMany({
          where: { userId: profileId },
        });
        if (normalizedEducationItems.length > 0) {
          await tx.educatorEducation.createMany({
            data: normalizedEducationItems.map((item, index) => ({
              userId: profileId,
              degree: item.degree || 'Education',
              institutionName: item.institutionName || '',
              graduationYear: item.graduationYear,
              description: item.description,
              sortOrder: index,
            })),
          });
        }
      }

      if (normalizedCertificationItems !== null) {
        await tx.educatorCertification.deleteMany({
          where: { userId: profileId },
        });
        if (normalizedCertificationItems.length > 0) {
          await tx.educatorCertification.createMany({
            data: normalizedCertificationItems.map((item, index) => ({
              userId: profileId,
              name: item.name,
              issuingOrganization: item.issuingOrganization,
              issueDate: item.issueDate,
              expiryDate: item.expiryDate,
              credentialUrl: item.credentialUrl,
              sortOrder: index,
            })),
          });
        }
      }
    });

    if (shouldDeletePreviousCv) {
      try {
        const asset = await this.resolveUserAssetByUrl(accountId, previousCvUrl, AssetKind.CV);
        if (asset?.id) {
          await this.uploadService.deleteAsset(asset.id, accountId);
        }
      } catch (e: any) {
        // Do not fail settings update if deletion fails; leaving an orphaned file is preferable
        // to blocking the user from updating their profile.
      }
    }

    // Send "application received" email the first time an educator submits their profile.
    // Fires when: profile was blank (no shortBio) and is now being filled in,
    // AND the educator has not yet been approved or rejected.
    // This covers the email/password signup path; OAuth educators get it via completeProfile.
    const isFirstSubmission =
      !existingCv?.shortBio?.trim() &&
      settings.shortBio?.trim() &&
      existingCv?.approvalStatus !== EducatorApprovalStatus.APPROVED &&
      existingCv?.approvalStatus !== EducatorApprovalStatus.REJECTED;

    // Use settings values (post-update) for name/email, falling back to pre-update snapshot.
    const recipientEmail = settings.email ?? existingCv?.email;
    const recipientName = settings.firstName ?? existingCv?.firstName;

    if (isFirstSubmission && recipientEmail) {
      const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || '';

      // educator_pending email — gated by v2_staffing_emails (defaults enabled when flag absent)
      this.isFeatureEnabled('v2_staffing_emails').then(async (enabled) => {
        if (!enabled) return;
        await this.emailNotificationService.sendNotification({
          event: 'educator_pending',
          recipient: recipientEmail,
          recipientName: recipientName ?? undefined,
          payload: {
            firstName: recipientName || 'Educator',
            supportUrl: appUrl ? `${appUrl}/support` : '',
          },
          bypassPreferences: true,
          allowUnknownRecipient: false,
        });
      }).catch((err: any) => {
        this.logger.warn(`Educator pending email failed: ${(err as Error)?.message || err}`);
      });

      // Admin in-app notifications — gated by v2_in_app_notifications
      this.isFeatureEnabled('v2_in_app_notifications').then(async (enabled) => {
        if (!enabled) return;
        const admins = await this.prisma.user.findMany({
          where: {
            role: { in: [PrismaUserRole.ADMIN, PrismaUserRole.SUPER_ADMIN] },
            isActive: { not: false },
          },
          select: { id: true },
        });
        const educatorName = [recipientName, existingCv?.firstName].find(Boolean) || 'An educator';
        const adminLink = appUrl ? `${appUrl}/admin/content-dashboard` : '/admin/content-dashboard';
        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: NotificationType.GENERAL,
              title: 'New Educator Application',
              body: `${educatorName} has submitted their profile and is awaiting approval.`,
              link: adminLink,
            },
          }).catch(() => {});
        }
      }).catch((err: any) => {
        this.logger.warn(`Admin notification for educator signup failed: ${(err as Error)?.message || err}`);
      });
    }

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }

  @Delete('educator/cv')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Delete educator CV (full delete)' })
  @ApiResponse({ status: 200, description: 'CV deleted successfully' })
  async deleteEducatorCv(@Request() req) {
    const { profileId, accountId } = this.getContext(req);

    const user = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: { cvUrl: true },
    });

    const cvUrl = user?.cvUrl || '';
    if (!cvUrl || !cvUrl.trim()) {
      return { success: true, message: 'No CV to delete' };
    }

    // Clear cvUrl first, then delete the underlying asset best-effort.
    await this.prisma.user.update({
      where: { id: profileId },
      data: { cvUrl: null },
    });

    try {
      const asset = await this.resolveUserAssetByUrl(accountId, cvUrl, AssetKind.CV);
      if (asset?.id) {
        await this.uploadService.deleteAsset(asset.id, accountId);
      }
    } catch {
      // Best-effort delete; profile is already unlinked.
    }

    return { success: true, message: 'CV deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────
  // Supplier
  // ─────────────────────────────────────────────────────────────

  @Get('supplier')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSupplierSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);
    const { user, appUser } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
            },
          },
        },
      },
    });

    const organizations = (user as any).organizations ?? [];

    if (!organizations.length || !organizations[0].organization) {
      return {
        success: false,
        message: 'Supplier not found',
      };
    }

    const organization = organizations[0].organization;

    return {
      success: true,
      data: {
        companyName: organization.name,
        // Fall back to the user's auth email when no contact email has been set.
        contactEmail: organization.contactEmail ?? user.email ?? appUser.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: normalizeRegionsServed(
          (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        ),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
        websiteUrl: (organization as any).websiteUrl ?? '',
        languages: organization.languages ?? [],
        productCategory: organization.productCategory ?? '',
        productCategories:
          Array.isArray((organization as any).productCategories) &&
          (organization as any).productCategories.length > 0
            ? (organization as any).productCategories
            : organization.productCategory
              ? [organization.productCategory]
              : [],
        serviceType: organization.serviceType ?? '',
        // Optional: when unset, return null (no default minimum).
        minimumOrderQuantity: organization.minimumOrderQuantity ?? null,
        directOrderLink: organization.directOrderLink ?? '',
        catalogUrl: organization.catalogUrl ?? '',
        logoUrl: (organization as any).logoAsset?.publicUrl ?? null,
        coverImageUrl: (organization as any).coverAsset?.publicUrl ?? null,
      },
    };
  }

  @Patch('supplier')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Update supplier settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSupplierSettings(@Request() req, @Body() settings: UpdateSupplierSettingsDto) {
    const { profileId, accountId } = this.getContext(req);

    await this.prisma.$transaction(async (tx) => {
      // Validate asset ownership and kind before updating
      // Use accountId (AppUser.id) since Asset.uploadedById references AppUser
      await this.validateAssetForUsage(
        tx,
        settings.logoAssetId,
        accountId,
        [AssetKind.LOGO],
        'Logo',
      );
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        accountId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: profileId },
        include: { organization: true },
      });

      if (userOrg?.organization) {
        // Update existing organization
        const updatedOrganization = await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            ...(settings.contactEmail !== undefined && { contactEmail: settings.contactEmail || null }),
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: normalizeRegionsServed(settings.regionsServed),
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            productCategory: settings.productCategory,
            ...(settings.productCategories !== undefined && {
              productCategories: settings.productCategories ?? [],
            }),
            serviceType: settings.serviceType,
            ...(settings.minimumOrderQuantity !== undefined && {
              minimumOrderQuantity: settings.minimumOrderQuantity,
            }),
            directOrderLink: settings.directOrderLink,
            catalogUrl: settings.catalogUrl,
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });
      } else {
        // Create new organization if it doesn't exist
        const newOrganization = await tx.organization.create({
          data: {
            name: settings.companyName,
            type: 'PRODUCT_SUPPLIER',
            contactEmail: settings.contactEmail || null,
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: normalizeRegionsServed(settings.regionsServed),
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            productCategory: settings.productCategory,
            productCategories: settings.productCategories ?? [],
            serviceType: settings.serviceType,
            ...(settings.minimumOrderQuantity !== undefined && {
              minimumOrderQuantity: settings.minimumOrderQuantity,
            }),
            directOrderLink: settings.directOrderLink,
            catalogUrl: settings.catalogUrl,
            isActive: true,
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });

        // Link user to the new organization
        await tx.userOrganization.create({
          data: {
            userId: profileId,
            organizationId: newOrganization.id,
            role: UserRole.PRODUCT_SUPPLIER,
          },
        });
      }
    });

    // Update translations after transaction completes
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: profileId },
      include: { organization: true },
    });
    
    if (userOrg?.organization && userOrg.organization.description?.trim()) {
      const translatableFields = FIELDS_BY_ENTITY.organization || ['description'];
      const translationPayload: Record<string, any> = {
        description: userOrg.organization.description,
      };
      
      await this.translationService.saveEntityWithTranslations(
        'organization',
        userOrg.organization.id,
        translationPayload,
        translatableFields,
      );
    }

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Service Provider
  // ─────────────────────────────────────────────────────────────

  @Get('service-provider')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getServiceProviderSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);
    const { user, appUser } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
            },
          },
        },
      },
    });

    const organizations = (user as any).organizations ?? [];

    if (!organizations.length || !organizations[0].organization) {
      return {
        success: false,
        message: 'Service provider not found',
      };
    }

    const organization = organizations[0].organization;

    return {
      success: true,
      data: {
        companyName: organization.name,
        // Fall back to the user's auth email when no contact email has been set.
        contactEmail: organization.contactEmail ?? user.email ?? appUser.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: normalizeRegionsServed(
          (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        ),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
        websiteUrl: (organization as any).websiteUrl ?? '',
        languages: organization.languages ?? [],
        serviceType: organization.serviceType ?? '',
        serviceCategories: organization.serviceCategories ?? [],
        deliveryType: organization.deliveryType ?? '',
        bookingLink: organization.bookingLink ?? '',
        logoUrl: (organization as any).logoAsset?.publicUrl ?? null,
        coverImageUrl: (organization as any).coverAsset?.publicUrl ?? null,
      },
    };
  }

  @Patch('service-provider')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Update service provider settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateServiceProviderSettings(@Request() req, @Body() settings: UpdateServiceProviderSettingsDto) {
    const { profileId, accountId } = this.getContext(req);

    await this.prisma.$transaction(async (tx) => {
      // Validate asset ownership and kind before updating
      // Use accountId (AppUser.id) since Asset.uploadedById references AppUser
      await this.validateAssetForUsage(tx, settings.logoAssetId, accountId, [AssetKind.LOGO], 'Logo');
      await this.validateAssetForUsage(tx, settings.coverAssetId, accountId, [AssetKind.COVER_IMAGE], 'Cover image');

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: profileId },
        include: { organization: true },
      });

      if (userOrg?.organization) {
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            ...(settings.contactEmail !== undefined && { contactEmail: settings.contactEmail || null }),
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: normalizeRegionsServed(settings.regionsServed),
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            serviceType: settings.serviceType,
            serviceCategories: settings.serviceCategories ?? [],
            deliveryType: settings.deliveryType,
            bookingLink: settings.bookingLink,
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });

        return;
      }

      const newOrganization = await tx.organization.create({
        data: {
          name: settings.companyName,
          type: 'SERVICE_PROVIDER',
          contactEmail: settings.contactEmail || null,
          phoneNumber: settings.phoneNumber,
          contactPerson: settings.contactPerson,
          region: settings.address,
          canton: settings.canton,
          city: settings.city,
          regionsServed: normalizeRegionsServed(settings.regionsServed),
          description: settings.description,
          vatNumber: settings.vatNumber,
          websiteUrl: settings.websiteUrl,
          languages: settings.languages ?? [],
          serviceType: settings.serviceType,
          serviceCategories: settings.serviceCategories ?? [],
          deliveryType: settings.deliveryType,
          bookingLink: settings.bookingLink,
          isActive: true,
          ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
          ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
        },
      });

      // Link user to the new organization
      await tx.userOrganization.create({
        data: {
          userId: profileId,
          organizationId: newOrganization.id,
          role: UserRole.SERVICE_PROVIDER,
        },
      });
    });

    // Update translations after transaction completes
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: profileId },
      include: { organization: true },
    });

    if (userOrg?.organization && userOrg.organization.description?.trim()) {
      const translatableFields = FIELDS_BY_ENTITY.organization || ['description'];
      const translationPayload: Record<string, any> = {
        description: userOrg.organization.description,
      };

      await this.translationService.saveEntityWithTranslations(
        'organization',
        userOrg.organization.id,
        translationPayload,
        translatableFields,
      );
    }

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Parent
  // ─────────────────────────────────────────────────────────────

  @Get('parent')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getParentSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      contactInfo: true,
    });

    return {
      success: true,
      data: {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        // Contact email is stored separately from authentication email.
        // For backward compatibility, fall back to the user's auth email if unset.
        contactEmail: (user as any).contactInfo?.contactEmail ?? user.email,
        phoneNumber: user.phoneNumber ?? '',
        childAge: 0,
        preferredLocation: '',
        preferredLanguages: [],
        specialRequirements: '',
      },
    };
  }

  @Patch('parent')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Update parent settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateParentSettings(@Request() req, @Body() settings: UpdateParentSettingsDto) {
    const { profileId, accountId } = this.getContext(req);

    await this.prisma.$transaction(async (tx) => {
      // Validate asset ownership and kind before updating
      // Use accountId (AppUser.id) since Asset.uploadedById references AppUser
      await this.validateAssetForUsage(
        tx,
        settings.avatarAssetId,
        accountId,
        [AssetKind.AVATAR],
        'Avatar',
      );

      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.email,
          phoneNumber: settings.phoneNumber,
          ...(settings.avatarAssetId !== undefined && { avatarAssetId: settings.avatarAssetId || null }),
        },
      });

      // Store contact email separately (does NOT touch auth email).
      if (settings.contactEmail !== undefined) {
        await tx.userContactInfo.upsert({
          where: { userId: profileId },
          create: {
            userId: profileId,
            contactEmail: settings.contactEmail || null,
          },
          update: {
            contactEmail: settings.contactEmail || null,
          },
        });
      }

      if (settings.email) {
        await tx.appUser.update({
          where: { id: accountId },
          data: { email: settings.email },
        });
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Privacy & Notification Settings
  // ─────────────────────────────────────────────────────────────

  @Get('privacy')
  @ApiOperation({ summary: 'Get privacy & data settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved successfully' })
  async getPrivacySettings(@Request() req) {
    const { profileId } = this.getContext(req);
    const prefs = await this.principal.getPrivacyPrefs(profileId);
    return {
      success: true,
      data: prefs,
    };
  }

  @Patch('privacy')
  @ApiOperation({ summary: 'Update privacy & data settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated successfully' })
  async updatePrivacySettings(@Request() req, @Body() payload: UpdatePrivacySettingsDto) {
    const { profileId } = this.getContext(req);
    const updated = await this.principal.updatePrivacyPrefs(profileId, payload);
    return {
      success: true,
      message: 'Privacy settings updated successfully',
      data: updated,
    };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved successfully' })
  async getNotificationSettings(@Request() req) {
    const { profileId } = this.getContext(req);
    const data = await this.principal.getNotificationSettings(profileId);
    return {
      success: true,
      data,
    };
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully' })
  async updateNotificationSettings(@Request() req, @Body() payload: UpdateNotificationSettingsDto) {
    const { profileId } = this.getContext(req);
    const data = await this.principal.updateNotificationSettings(profileId, payload);
    return {
      success: true,
      message: 'Notification settings updated successfully',
      data,
    };
  }
}
