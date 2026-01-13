import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AssetKind } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnsureProfileInterceptor } from '../principal/ensure-profile.interceptor';
import { PrincipalService } from '../principal/principal.service';
import { UpdateFoundationSettingsDto } from './dto/foundation-settings.dto';
import { UpdateEducatorSettingsDto } from './dto/educator-settings.dto';
import { UpdateSupplierSettingsDto } from './dto/supplier-settings.dto';
import { UpdateServiceProviderSettingsDto } from './dto/service-provider-settings.dto';
import { UpdateParentSettingsDto } from './dto/parent-settings.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';

@ApiTags('settings')
@Controller('settings')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(EnsureProfileInterceptor)
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly principal: PrincipalService,
    private readonly translationService: TranslationService,
  ) {}

  private getContext(request: any) {
    const context = request?.context ?? {};
    const { profileId, accountId, clerkUserId } = context;
    if (!profileId || !accountId || !clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }
    return { profileId, accountId, clerkUserId };
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

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
              contactInfo: true,
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
        // Contact email is stored separately from authentication email.
        // For backward compatibility, fall back to the user's auth email if unset.
        contactEmail: (organization as any).contactInfo?.contactEmail ?? user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
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
        // PATCH semantics: only update contactEmail when provided.
        // Store contact email separately (does NOT touch auth email).
        if (settings.contactEmail !== undefined) {
          await tx.organizationContactInfo.upsert({
            where: { organizationId: userOrg.organizationId },
            create: {
              organizationId: userOrg.organizationId,
              contactEmail: settings.contactEmail || null,
            },
            update: {
              contactEmail: settings.contactEmail || null,
            },
          });
        }

        // Update existing organization
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: settings.regionsServed ?? [],
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
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: settings.regionsServed ?? [],
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

        // Create contact info record for the new org (does NOT touch auth email).
        await tx.organizationContactInfo.create({
          data: {
            organizationId: newOrganization.id,
            contactEmail: settings.contactEmail,
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
  @ApiOperation({ summary: 'Get educator settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getEducatorSettings(@Request() req) {
    const { clerkUserId } = this.getContext(req);
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      avatarAsset: true, // Include avatar asset relation
      coverAsset: true, // Include cover asset relation
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
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
        skills: user.skills ?? [],
        availability: user.availability ?? '',
        cvUrl: user.cvUrl ?? '',
        shortBio: user.shortBio ?? '',
        candidatePoolVisible: !!(user as any).candidatePoolVisible,
        region: (user as any).region ?? '',
        jobRole: (user as any).jobRole ?? '',
        jobRoles: Array.isArray((user as any).jobRoles)
          ? (user as any).jobRoles
          : ((user as any).jobRole ? [(user as any).jobRole] : []),
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
  @ApiOperation({ summary: 'Update educator settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateEducatorSettings(@Request() req, @Body() settings: UpdateEducatorSettingsDto) {
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
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        accountId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );

      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.email,
          phoneNumber: settings.phoneNumber,
          workExperience: settings.workExperience,
          education: settings.education,
          certifications: settings.certifications,
          skills: settings.skills,
          availability: settings.availability,
          cvUrl: settings.cvUrl,
          shortBio: settings.shortBio,
          region: settings.region,
          ...(settings.cities !== undefined && { cities: settings.cities }),
          ...(settings.jobRoles !== undefined && { jobRoles: settings.jobRoles }),
          ...(settings.jobRole !== undefined && { jobRole: settings.jobRole }),
          ...(settings.jobRoles?.length && settings.jobRole === undefined
            ? { jobRole: settings.jobRoles[0] }
            : {}),
          ...(settings.candidatePoolVisible !== undefined && { candidatePoolVisible: settings.candidatePoolVisible }),
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
    });

    return {
      success: true,
      message: 'Settings updated successfully',
    };
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
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
              contactInfo: true,
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
        // Contact email is stored separately from authentication email.
        // For backward compatibility, fall back to the user's auth email if unset.
        contactEmail: (organization as any).contactInfo?.contactEmail ?? user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
        websiteUrl: (organization as any).websiteUrl ?? '',
        languages: organization.languages ?? [],
        productCategory: organization.productCategory ?? '',
        serviceType: organization.serviceType ?? '',
        minimumOrderQuantity: organization.minimumOrderQuantity ?? 0,
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
        // PATCH semantics: only update contactEmail when provided.
        // Store contact email separately (does NOT touch auth email).
        if (settings.contactEmail !== undefined) {
          await tx.organizationContactInfo.upsert({
            where: { organizationId: userOrg.organizationId },
            create: {
              organizationId: userOrg.organizationId,
              contactEmail: settings.contactEmail || null,
            },
            update: {
              contactEmail: settings.contactEmail || null,
            },
          });
        }

        // Update existing organization
        const updatedOrganization = await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            productCategory: settings.productCategory,
            serviceType: settings.serviceType,
            minimumOrderQuantity: settings.minimumOrderQuantity,
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
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
            websiteUrl: settings.websiteUrl,
            languages: settings.languages ?? [],
            productCategory: settings.productCategory,
            serviceType: settings.serviceType,
            minimumOrderQuantity: settings.minimumOrderQuantity,
            directOrderLink: settings.directOrderLink,
            catalogUrl: settings.catalogUrl,
            isActive: true,
            ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
            ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
          },
        });

        // Create contact info record for the new org (does NOT touch auth email).
        await tx.organizationContactInfo.create({
          data: {
            organizationId: newOrganization.id,
            contactEmail: settings.contactEmail,
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
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId, {
      organizations: {
        include: {
          organization: {
            include: {
              logoAsset: true,
              coverAsset: true,
              contactInfo: true,
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
        // Contact email is stored separately from authentication email.
        // For backward compatibility, fall back to the user's auth email if unset.
        contactEmail: (organization as any).contactInfo?.contactEmail ?? user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
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
        // PATCH semantics: only update contactEmail when provided.
        // Store contact email separately (does NOT touch auth email).
        if (settings.contactEmail !== undefined) {
          await tx.organizationContactInfo.upsert({
            where: { organizationId: userOrg.organizationId },
            create: {
              organizationId: userOrg.organizationId,
              contactEmail: settings.contactEmail || null,
            },
            update: {
              contactEmail: settings.contactEmail || null,
            },
          });
        }

        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            city: settings.city,
            regionsServed: settings.regionsServed ?? [],
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
          phoneNumber: settings.phoneNumber,
          contactPerson: settings.contactPerson,
          region: settings.address,
          canton: settings.canton,
          city: settings.city,
          regionsServed: settings.regionsServed ?? [],
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

      // Store contact email separately (does NOT touch auth email).
      await tx.organizationContactInfo.create({
        data: {
          organizationId: newOrganization.id,
          contactEmail: settings.contactEmail,
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
