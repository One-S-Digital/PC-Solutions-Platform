import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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

      let userOrg = await tx.userOrganization.findFirst({
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
        avatarAssetId: settings.avatarAssetId,
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

      let userOrg = await tx.userOrganization.findFirst({
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
    const { profileId, accountId } = this.getContext(req);

    await this.prisma.$transaction(async (tx) => {
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

      let userOrg = await tx.userOrganization.findFirst({
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
            serviceType: settings.serviceType,
            serviceCategories: settings.serviceCategories ?? [],
            deliveryType: settings.deliveryType,
            bookingLink: settings.bookingLink,
          },
        });
      } else {
        // Create new organization if it doesn't exist
        const newOrganization = await tx.organization.create({
          data: {
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

        // Link user to the new organization
        await tx.userOrganization.create({
          data: {
            userId: profileId,
            organizationId: newOrganization.id,
            role: UserRole.SERVICE_PROVIDER,
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
      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.email,
          phoneNumber: settings.phoneNumber,
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
    const data = await this.principal.getPrivacyPrefs(profileId);
    return {
      success: true,
      data,
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
      data: {
        hidePubliclyToggle: updated.contentModeration,
        gdprDataDeletionRequestMade: updated.systemAdmin,
      },
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