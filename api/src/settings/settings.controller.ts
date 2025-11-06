import { Controller, Get, Patch, Body, UseGuards, Request, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
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
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserByClerkId(clerkUserId?: string, include?: any) {
    if (!clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include,
    });

    if (!user) {
      throw new NotFoundException('User record not found');
    }

    return user;
  }

  @Get('foundation')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getFoundationSettings(@Request() req) {
    const clerkUserId = req.context.userId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User record not found');
    }

    if (!user.organizations.length) {
      return {
        success: false,
        message: 'Foundation not found'
      };
    }

    const organization = user.organizations[0].organization;

    const settings = {
      companyName: organization.name,
      contactEmail: user.email,
      phoneNumber: organization.phoneNumber || '',
      address: organization.region || '',
      canton: organization.canton || '',
      languages: organization.languages || [],
      capacity: organization.capacity || 0,
      pedagogy: organization.pedagogy || [],
      emailNotifications: true, // Default values - would be stored in user preferences
      smsNotifications: false,
      teamInviteEnabled: true,
      autoApproveApplications: false,
    };

    return {
      success: true,
      data: settings
    };
  }

  @Patch('foundation')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Update foundation settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateFoundationSettings(@Request() req, @Body() settings: UpdateFoundationSettingsDto) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);
    
    // Update user and organization data
    await this.prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email: settings.contactEmail,
        }
      });

      // Update organization
      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: user.id },
        include: { organization: true }
      });

      if (userOrg) {
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            region: settings.address,
            canton: settings.canton,
            languages: settings.languages,
            capacity: settings.capacity,
            pedagogy: settings.pedagogy,
          }
        });
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  }

  @Get('educator')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Get educator settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getEducatorSettings(@Request() req) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    const settings = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      workExperience: user.workExperience || '',
      education: user.education || '',
      certifications: user.certifications || [],
      skills: user.skills || [],
      availability: user.availability || '',
      cvUrl: user.cvUrl || '',
      emailNotifications: true, // Default values
      smsNotifications: false,
      jobAlerts: true,
      profileVisibility: 'public' as const,
    };

    return {
      success: true,
      data: settings
    };
  }

  @Patch('educator')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Update educator settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateEducatorSettings(@Request() req, @Body() settings: UpdateEducatorSettingsDto) {
    const clerkUserId = req.context.userId;
    await this.getUserByClerkId(clerkUserId);
    
    await this.prisma.user.update({
      where: { clerkId: clerkUserId },
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
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  }

  @Get('supplier')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSupplierSettings(@Request() req) {
    const clerkUserId = req.context.userId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User record not found');
    }

    if (!user.organizations.length) {
      return {
        success: false,
        message: 'Supplier not found'
      };
    }

    const organization = user.organizations[0].organization;

    const settings = {
      companyName: organization.name,
      contactEmail: user.email,
      phoneNumber: organization.phoneNumber || '',
      address: organization.region || '',
      canton: organization.canton || '',
      productCategory: organization.productCategory || '',
      serviceType: organization.serviceType || '',
      minimumOrderQuantity: organization.minimumOrderQuantity || 0,
      directOrderLink: organization.directOrderLink || '',
      catalogUrl: organization.catalogUrl || '',
      emailNotifications: true,
      smsNotifications: false,
      orderAlerts: true,
      inventoryAlerts: true,
    };

    return {
      success: true,
      data: settings
    };
  }

  @Patch('supplier')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Update supplier settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSupplierSettings(@Request() req, @Body() settings: UpdateSupplierSettingsDto) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);
    
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email: settings.contactEmail,
        }
      });

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: user.id },
        include: { organization: true }
      });

      if (userOrg) {
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            region: settings.address,
            canton: settings.canton,
            productCategory: settings.productCategory,
            serviceType: settings.serviceType,
            minimumOrderQuantity: settings.minimumOrderQuantity,
            directOrderLink: settings.directOrderLink,
            catalogUrl: settings.catalogUrl,
          }
        });
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  }

  @Get('service-provider')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getServiceProviderSettings(@Request() req) {
    const clerkUserId = req.context.userId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User record not found');
    }

    if (!user.organizations.length) {
      return {
        success: false,
        message: 'Service provider not found'
      };
    }

    const organization = user.organizations[0].organization;

    const settings = {
      companyName: organization.name,
      contactEmail: user.email,
      phoneNumber: organization.phoneNumber || '',
      address: organization.region || '',
      canton: organization.canton || '',
      serviceCategories: organization.serviceCategories || [],
      deliveryType: organization.deliveryType || '',
      bookingLink: organization.bookingLink || '',
      emailNotifications: true,
      smsNotifications: false,
      bookingAlerts: true,
      availabilityAlerts: true,
    };

    return {
      success: true,
      data: settings
    };
  }

  @Patch('service-provider')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Update service provider settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateServiceProviderSettings(@Request() req, @Body() settings: UpdateServiceProviderSettingsDto) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);
    
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email: settings.contactEmail,
        }
      });

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId: user.id },
        include: { organization: true }
      });

      if (userOrg) {
        await tx.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: settings.companyName,
            phoneNumber: settings.phoneNumber,
            region: settings.address,
            canton: settings.canton,
            serviceCategories: settings.serviceCategories,
            deliveryType: settings.deliveryType,
            bookingLink: settings.bookingLink,
          }
        });
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  }

  @Get('parent')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getParentSettings(@Request() req) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    // For now, return basic user data since ParentLead doesn't have userId relation
    const settings = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      childAge: 0, // Default value - would need to be stored in user preferences
      preferredLocation: '', // Default value
      preferredLanguages: [], // Default value
      specialRequirements: '', // Default value
      emailNotifications: true,
      smsNotifications: false,
      applicationAlerts: true,
      recommendationAlerts: true,
    };

    return {
      success: true,
      data: settings
    };
  }

  @Patch('parent')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Update parent settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateParentSettings(@Request() req, @Body() settings: UpdateParentSettingsDto) {
    const clerkUserId = req.context.userId;
    await this.getUserByClerkId(clerkUserId);
    
    // For now, only update basic user data since ParentLead doesn't have userId relation
    await this.prisma.user.update({
      where: { clerkId: clerkUserId },
      data: {
        firstName: settings.firstName,
        lastName: settings.lastName,
        email: settings.email,
        phoneNumber: settings.phoneNumber,
      }
    });

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  }

  @Get('privacy')
  @ApiOperation({ summary: 'Get privacy & data settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved successfully' })
  async getPrivacySettings(@Request() req) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    const preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId: user.id },
    });

    return {
      success: true,
      data: {
        hidePubliclyToggle: preferences?.contentModeration ?? false,
        gdprDataDeletionRequestMade: preferences?.systemAdmin ?? false,
      },
    };
  }

  @Patch('privacy')
  @ApiOperation({ summary: 'Update privacy & data settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated successfully' })
  async updatePrivacySettings(@Request() req, @Body() payload: UpdatePrivacySettingsDto) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    const updated = await this.prisma.userNotificationPreferences.upsert({
      where: { userId: user.id },
      update: {
        contentModeration: payload.hidePubliclyToggle,
        systemAdmin: payload.gdprDataDeletionRequestMade,
      },
      create: {
        userId: user.id,
        contentModeration: payload.hidePubliclyToggle,
        systemAdmin: payload.gdprDataDeletionRequestMade,
      },
    });

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
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    const preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId: user.id },
    });

    const frequencyMap: Record<string, 'Daily' | 'Weekly' | 'None'> = {
      daily: 'Daily',
      weekly: 'Weekly',
      none: 'None',
      immediate: 'Daily',
    };

    return {
      success: true,
      data: {
        newRequestEmailToggle: preferences?.leadManagement ?? true,
        digestRadio: frequencyMap[preferences?.frequency?.toLowerCase() ?? 'daily'],
        promoRedemptionAlertsToggle: preferences?.marketing ?? false,
      },
    };
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully' })
  async updateNotificationSettings(@Request() req, @Body() payload: UpdateNotificationSettingsDto) {
    const clerkUserId = req.context.userId;
    const user = await this.getUserByClerkId(clerkUserId);

    const frequencyMap: Record<'Daily' | 'Weekly' | 'None', string> = {
      Daily: 'daily',
      Weekly: 'weekly',
      None: 'none',
    };

    const updated = await this.prisma.userNotificationPreferences.upsert({
      where: { userId: user.id },
      update: {
        leadManagement: payload.newRequestEmailToggle,
        marketing: payload.promoRedemptionAlertsToggle,
        frequency: frequencyMap[payload.digestRadio],
      },
      create: {
        userId: user.id,
        leadManagement: payload.newRequestEmailToggle,
        marketing: payload.promoRedemptionAlertsToggle,
        frequency: frequencyMap[payload.digestRadio],
      },
    });

    return {
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        newRequestEmailToggle: updated.leadManagement,
        digestRadio: payload.digestRadio,
        promoRedemptionAlertsToggle: updated.marketing,
      },
    };
  }
}