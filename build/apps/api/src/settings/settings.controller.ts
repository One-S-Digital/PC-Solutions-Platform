import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('foundation')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getFoundationSettings(@Request() req) {
    const userId = req.user.id;
    
    // Get user and organization data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.organizations.length) {
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
  async updateFoundationSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    
    // Update user and organization data
    await this.prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: userId },
        data: {
          email: settings.contactEmail,
        }
      });

      // Update organization
      const userOrg = await tx.userOrganization.findFirst({
        where: { userId },
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
    const userId = req.user.id;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

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
  async updateEducatorSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    
    await this.prisma.user.update({
      where: { id: userId },
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
    const userId = req.user.id;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.organizations.length) {
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
  async updateSupplierSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: settings.contactEmail,
        }
      });

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId },
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
    const userId = req.user.id;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.organizations.length) {
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
  async updateServiceProviderSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: settings.contactEmail,
        }
      });

      const userOrg = await tx.userOrganization.findFirst({
        where: { userId },
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
    const userId = req.user.id;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

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
  async updateParentSettings(@Request() req, @Body() settings: any) {
    const userId = req.user.id;
    
    // For now, only update basic user data since ParentLead doesn't have userId relation
    await this.prisma.user.update({
      where: { id: userId },
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
}