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
  Logger,
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
        contactEmail: user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
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
      await this.validateAssetForUsage(
        tx,
        settings.logoAssetId,
        profileId,
        [AssetKind.LOGO],
        'Logo',
      );
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        profileId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );

      await tx.user.update({
        where: { id: profileId },
        data: {
          email: settings.contactEmail,
        },
      });

      await tx.appUser.update({
        where: { id: accountId },
        data: {
          email: settings.contactEmail,
        },
      });

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
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
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
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
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
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId);

    return {
      success: true,
      data: {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
        skills: user.skills ?? [],
        availability: user.availability ?? '',
        cvUrl: user.cvUrl ?? '',
        shortBio: user.shortBio ?? '',
        avatarAssetId: user.avatarAssetId ?? '',
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
      await this.validateAssetForUsage(
        tx,
        settings.avatarAssetId,
        profileId,
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
          workExperience: settings.workExperience,
          education: settings.education,
        certifications: settings.certifications,
        skills: settings.skills,
        availability: settings.availability,
        cvUrl: settings.cvUrl,
        shortBio: settings.shortBio,
        ...(settings.avatarAssetId !== undefined && { avatarAssetId: settings.avatarAssetId || null }),
      },
      });

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
        contactEmail: user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
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
      await this.validateAssetForUsage(
        tx,
        settings.logoAssetId,
        profileId,
        [AssetKind.LOGO],
        'Logo',
      );
      await this.validateAssetForUsage(
        tx,
        settings.coverAssetId,
        profileId,
        [AssetKind.COVER_IMAGE],
        'Cover image',
      );

      await tx.user.update({
        where: { id: profileId },
        data: {
          email: settings.contactEmail,
        },
      });

      await tx.appUser.update({
        where: { id: accountId },
        data: {
          email: settings.contactEmail,
        },
      });

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
            phoneNumber: settings.phoneNumber,
            contactPerson: settings.contactPerson,
            region: settings.address,
            canton: settings.canton,
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
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
            regionsServed: settings.regionsServed ?? [],
            description: settings.description,
            vatNumber: settings.vatNumber,
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
        contactEmail: user.email,
        phoneNumber: organization.phoneNumber ?? '',
        contactPerson: organization.contactPerson ?? '',
        address: organization.region ?? '',
        canton: organization.canton ?? '',
        regionsServed: (organization as any).regionsServed ?? (organization.canton ? [organization.canton] : []),
        description: organization.description ?? '',
        vatNumber: organization.vatNumber ?? '',
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
    const startTime = Date.now();
    this.logger.log('🔍 [DEBUG] updateServiceProviderSettings - START');
    
    try {
      // Log incoming request data
      this.logger.log('🔍 [DEBUG] Request context extraction', {
        hasRequest: !!req,
        hasContext: !!req?.context,
        contextKeys: req?.context ? Object.keys(req.context) : [],
      });

      const { profileId, accountId } = this.getContext(req);
      
      this.logger.log('🔍 [DEBUG] Context extracted', {
        profileId,
        accountId,
        profileIdType: typeof profileId,
        accountIdType: typeof accountId,
      });

      // Log incoming settings data
      this.logger.log('🔍 [DEBUG] Incoming settings data', {
        companyName: settings.companyName,
        contactEmail: settings.contactEmail,
        phoneNumber: settings.phoneNumber,
        contactPerson: settings.contactPerson,
        address: settings.address,
        canton: settings.canton,
        regionsServed: settings.regionsServed,
        regionsServedType: Array.isArray(settings.regionsServed) ? 'array' : typeof settings.regionsServed,
        regionsServedLength: Array.isArray(settings.regionsServed) ? settings.regionsServed.length : 'N/A',
        description: settings.description,
        vatNumber: settings.vatNumber,
        languages: settings.languages,
        languagesType: Array.isArray(settings.languages) ? 'array' : typeof settings.languages,
        languagesLength: Array.isArray(settings.languages) ? settings.languages.length : 'N/A',
        serviceType: settings.serviceType,
        serviceCategories: settings.serviceCategories,
        serviceCategoriesType: Array.isArray(settings.serviceCategories) ? 'array' : typeof settings.serviceCategories,
        serviceCategoriesLength: Array.isArray(settings.serviceCategories) ? settings.serviceCategories.length : 'N/A',
        deliveryType: settings.deliveryType,
        bookingLink: settings.bookingLink,
        allKeys: Object.keys(settings),
      });

      await this.prisma.$transaction(async (tx) => {
        this.logger.log('🔍 [DEBUG] Transaction started');

        try {
          // Validate asset ownership and kind before updating
          await this.validateAssetForUsage(
            tx,
            settings.logoAssetId,
            profileId,
            [AssetKind.LOGO],
            'Logo',
          );
          await this.validateAssetForUsage(
            tx,
            settings.coverAssetId,
            profileId,
            [AssetKind.COVER_IMAGE],
            'Cover image',
          );

          // Step 1: Update User
          this.logger.log('🔍 [DEBUG] Step 1: Updating User', {
            profileId,
            email: settings.contactEmail,
          });
          
          const updatedUser = await tx.user.update({
            where: { id: profileId },
            data: {
              email: settings.contactEmail,
            },
          });
          
          this.logger.log('🔍 [DEBUG] Step 1: User updated successfully', {
            userId: updatedUser.id,
            email: updatedUser.email,
          });

          // Step 2: Update AppUser
          this.logger.log('🔍 [DEBUG] Step 2: Updating AppUser', {
            accountId,
            email: settings.contactEmail,
          });
          
          const updatedAppUser = await tx.appUser.update({
            where: { id: accountId },
            data: {
              email: settings.contactEmail,
            },
          });
          
          this.logger.log('🔍 [DEBUG] Step 2: AppUser updated successfully', {
            appUserId: updatedAppUser.id,
            email: updatedAppUser.email,
          });

          // Step 3: Find UserOrganization
          this.logger.log('🔍 [DEBUG] Step 3: Finding UserOrganization', {
            userId: profileId,
          });
          
          const userOrg = await tx.userOrganization.findFirst({
            where: { userId: profileId },
            include: { organization: true },
          });
          
          this.logger.log('🔍 [DEBUG] Step 3: UserOrganization query result', {
            found: !!userOrg,
            hasOrganization: !!userOrg?.organization,
            userId: userOrg?.userId,
            organizationId: userOrg?.organizationId,
            role: userOrg?.role,
            organizationName: userOrg?.organization?.name,
          });

          if (userOrg?.organization) {
            // Update existing organization
            this.logger.log('🔍 [DEBUG] Step 4: Updating existing organization', {
              organizationId: userOrg.organizationId,
              updateData: {
                name: settings.companyName,
                phoneNumber: settings.phoneNumber,
                contactPerson: settings.contactPerson,
                region: settings.address,
                canton: settings.canton,
                regionsServed: settings.regionsServed ?? [],
                description: settings.description,
                vatNumber: settings.vatNumber,
                languages: settings.languages ?? [],
                serviceType: settings.serviceType,
                serviceCategories: settings.serviceCategories ?? [],
                deliveryType: settings.deliveryType,
                bookingLink: settings.bookingLink,
              },
            });

            const updateData = {
              name: settings.companyName,
              phoneNumber: settings.phoneNumber,
              contactPerson: settings.contactPerson,
              region: settings.address,
              canton: settings.canton,
              regionsServed: settings.regionsServed ?? [],
              description: settings.description,
              vatNumber: settings.vatNumber,
              languages: settings.languages ?? [],
              serviceType: settings.serviceType,
              serviceCategories: settings.serviceCategories ?? [],
              deliveryType: settings.deliveryType,
              bookingLink: settings.bookingLink,
              ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
              ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
            };

            // Validate array fields
            this.logger.log('🔍 [DEBUG] Validating array fields', {
              regionsServed: {
                value: updateData.regionsServed,
                isArray: Array.isArray(updateData.regionsServed),
                type: typeof updateData.regionsServed,
              },
              languages: {
                value: updateData.languages,
                isArray: Array.isArray(updateData.languages),
                type: typeof updateData.languages,
              },
              serviceCategories: {
                value: updateData.serviceCategories,
                isArray: Array.isArray(updateData.serviceCategories),
                type: typeof updateData.serviceCategories,
              },
            });

            const updatedOrg = await tx.organization.update({
              where: { id: userOrg.organizationId },
              data: updateData,
            });
            
            this.logger.log('🔍 [DEBUG] Step 4: Organization updated successfully', {
              organizationId: updatedOrg.id,
              name: updatedOrg.name,
            });
          } else {
            // Create new organization if it doesn't exist
            this.logger.log('🔍 [DEBUG] Step 4: Creating new organization', {
              createData: {
                name: settings.companyName,
                type: 'SERVICE_PROVIDER',
                phoneNumber: settings.phoneNumber,
                contactPerson: settings.contactPerson,
                region: settings.address,
                canton: settings.canton,
                regionsServed: settings.regionsServed ?? [],
                description: settings.description,
                vatNumber: settings.vatNumber,
                languages: settings.languages ?? [],
                serviceType: settings.serviceType,
                serviceCategories: settings.serviceCategories ?? [],
                deliveryType: settings.deliveryType,
                bookingLink: settings.bookingLink,
                isActive: true,
              },
            });

            const createData = {
              name: settings.companyName,
              type: 'SERVICE_PROVIDER' as const,
              phoneNumber: settings.phoneNumber,
              contactPerson: settings.contactPerson,
              region: settings.address,
              canton: settings.canton,
              regionsServed: settings.regionsServed ?? [],
              description: settings.description,
              vatNumber: settings.vatNumber,
              languages: settings.languages ?? [],
              serviceType: settings.serviceType,
              serviceCategories: settings.serviceCategories ?? [],
              deliveryType: settings.deliveryType,
              bookingLink: settings.bookingLink,
              isActive: true,
              ...(settings.logoAssetId !== undefined && { logoAssetId: settings.logoAssetId || null }),
              ...(settings.coverAssetId !== undefined && { coverAssetId: settings.coverAssetId || null }),
            };

            // Validate array fields
            this.logger.log('🔍 [DEBUG] Validating array fields for creation', {
              regionsServed: {
                value: createData.regionsServed,
                isArray: Array.isArray(createData.regionsServed),
                type: typeof createData.regionsServed,
              },
              languages: {
                value: createData.languages,
                isArray: Array.isArray(createData.languages),
                type: typeof createData.languages,
              },
              serviceCategories: {
                value: createData.serviceCategories,
                isArray: Array.isArray(createData.serviceCategories),
                type: typeof createData.serviceCategories,
              },
            });

            const newOrganization = await tx.organization.create({
              data: createData,
            });
            
            this.logger.log('🔍 [DEBUG] Step 4: Organization created successfully', {
              organizationId: newOrganization.id,
              name: newOrganization.name,
            });

            // Link user to the new organization
            this.logger.log('🔍 [DEBUG] Step 5: Creating UserOrganization link', {
              userId: profileId,
              organizationId: newOrganization.id,
              role: UserRole.SERVICE_PROVIDER,
            });

            const newUserOrg = await tx.userOrganization.create({
              data: {
                userId: profileId,
                organizationId: newOrganization.id,
                role: UserRole.SERVICE_PROVIDER,
              },
            });
            
            this.logger.log('🔍 [DEBUG] Step 5: UserOrganization link created successfully', {
              userId: newUserOrg.userId,
              organizationId: newUserOrg.organizationId,
              role: newUserOrg.role,
            });
          }

          this.logger.log('🔍 [DEBUG] Transaction completed successfully');
        } catch (txError) {
          this.logger.error('🔍 [DEBUG] Error within transaction', {
            error: txError instanceof Error ? txError.message : String(txError),
            errorName: txError instanceof Error ? txError.name : typeof txError,
            errorStack: txError instanceof Error ? txError.stack : undefined,
            errorCode: (txError as any)?.code,
            errorMeta: (txError as any)?.meta,
            fullError: JSON.stringify(txError, Object.getOwnPropertyNames(txError)),
          });
          throw txError;
        }
      });

      const duration = Date.now() - startTime;
      this.logger.log('🔍 [DEBUG] updateServiceProviderSettings - SUCCESS', {
        duration: `${duration}ms`,
      });

      return {
        success: true,
        message: 'Settings updated successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('🔍 [DEBUG] updateServiceProviderSettings - ERROR', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorCode: (error as any)?.code,
        errorMeta: (error as any)?.meta,
        prismaCode: (error as any)?.code?.startsWith('P') ? (error as any).code : undefined,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
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
    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkUserId);

    return {
      success: true,
      data: {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
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
      await this.validateAssetForUsage(
        tx,
        settings.avatarAssetId,
        profileId,
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