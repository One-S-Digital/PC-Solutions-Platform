import { Controller, Get, Put, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  // Organization fields
  organizationName?: string;
  contactPerson?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  productCategory?: string;
  serviceType?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
  // Parent fields
  childAge?: number;
  preferredLocation?: string;
  preferredLanguages?: string[];
  specialRequirements?: string;
}

export class CreateOrganizationDto {
  name: string;
  type: string;
  contactPerson?: string;
  phoneNumber?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  productCategory?: string;
  serviceType?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
}

@ApiTags('profiles')
@Controller('profiles')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@Request() req) {
    const userId = req.context.userId;
    
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

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: user
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMyProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
    const userId = req.context.userId;
    
    // Update user basic info
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phoneNumber: updateData.phoneNumber,
        workExperience: updateData.workExperience,
        education: updateData.education,
        certifications: updateData.certifications,
        skills: updateData.skills,
        availability: updateData.availability,
        cvUrl: updateData.cvUrl,
      }
    });

    // If user has organizations, update them too
    if (this.isOrganizationRole(req.context.role)) {
      const userOrganizations = await this.prisma.userOrganization.findMany({
        where: { userId },
        include: { organization: true }
      });

      for (const userOrg of userOrganizations) {
        await this.prisma.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: updateData.organizationName || userOrg.organization.name,
            contactPerson: updateData.contactPerson || userOrg.organization.contactPerson,
            phoneNumber: updateData.phoneNumber || userOrg.organization.phoneNumber,
            canton: updateData.canton || userOrg.organization.canton,
            languages: updateData.languages || userOrg.organization.languages,
            capacity: updateData.capacity || userOrg.organization.capacity,
            pedagogy: updateData.pedagogy || userOrg.organization.pedagogy,
            productCategory: updateData.productCategory || userOrg.organization.productCategory,
            serviceType: updateData.serviceType || userOrg.organization.serviceType,
            minimumOrderQuantity: updateData.minimumOrderQuantity || userOrg.organization.minimumOrderQuantity,
            directOrderLink: updateData.directOrderLink || userOrg.organization.directOrderLink,
            catalogUrl: updateData.catalogUrl || userOrg.organization.catalogUrl,
            serviceCategories: updateData.serviceCategories || userOrg.organization.serviceCategories,
            deliveryType: updateData.deliveryType || userOrg.organization.deliveryType,
            bookingLink: updateData.bookingLink || userOrg.organization.bookingLink,
          }
        });
      }
    }

    return {
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    };
  }

  @Get('me/organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getMyOrganizations(@Request() req) {
    const userId = req.context.userId;
    
    const organizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });

    return {
      success: true,
      data: organizations.map(uo => uo.organization)
    };
  }

  @Post('me/organizations')
  @ApiOperation({ summary: 'Create new organization for user' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async createOrganization(@Request() req, @Body() organizationData: CreateOrganizationDto) {
    const userId = req.context.userId;
    
    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: organizationData.name,
        type: this.mapStringToOrganizationType(organizationData.type),
        contactPerson: organizationData.contactPerson,
        phoneNumber: organizationData.phoneNumber,
        canton: organizationData.canton,
        languages: organizationData.languages || [],
        capacity: organizationData.capacity,
        pedagogy: organizationData.pedagogy || [],
        productCategory: organizationData.productCategory,
        serviceType: organizationData.serviceType,
        minimumOrderQuantity: organizationData.minimumOrderQuantity,
        directOrderLink: organizationData.directOrderLink,
        catalogUrl: organizationData.catalogUrl,
        serviceCategories: organizationData.serviceCategories || [],
        deliveryType: organizationData.deliveryType,
        bookingLink: organizationData.bookingLink,
      }
    });

    // Link user to organization
    await this.prisma.userOrganization.create({
      data: {
        userId,
        organizationId: organization.id,
        role: req.context.role,
      }
    });

    return {
      success: true,
      data: organization,
      message: 'Organization created successfully'
    };
  }

  @Get('me/parent-leads')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get parent leads for foundation' })
  @ApiResponse({ status: 200, description: 'Parent leads retrieved successfully' })
  async getMyParentLeads(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Get parent leads for these organizations
    const parentLeads = await this.prisma.parentLead.findMany({
      where: {
        foundationId: { in: organizationIds }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      data: parentLeads
    };
  }

  @Put('me/parent-leads/:leadId')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Update parent lead status' })
  @ApiResponse({ status: 200, description: 'Parent lead updated successfully' })
  async updateParentLead(@Request() req, @Param('leadId') leadId: string, @Body() updateData: { status: string }) {
    const userId = req.context.userId;
    
    // Verify user has access to this lead
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    const lead = await this.prisma.parentLead.findFirst({
      where: {
        id: leadId,
        foundationId: { in: organizationIds }
      }
    });

    if (!lead) {
      throw new Error('Parent lead not found or access denied');
    }

    const updatedLead = await this.prisma.parentLead.update({
      where: { id: leadId },
      data: { status: updateData.status }
    });

    return {
      success: true,
      data: updatedLead,
      message: 'Parent lead updated successfully'
    };
  }

  private isOrganizationRole(role: UserRole): boolean {
    const organizationRoles: UserRole[] = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
    return organizationRoles.includes(role);
  }

  private mapStringToOrganizationType(type: string): any {
    const typeMap: Record<string, any> = {
      'FOUNDATION': 'FOUNDATION',
      'PRODUCT_SUPPLIER': 'PRODUCT_SUPPLIER',
      'SERVICE_PROVIDER': 'SERVICE_PROVIDER',
    };
    return typeMap[type] || 'FOUNDATION';
  }
}