import { Controller, Get, Put, Post, Body, Param, UseGuards, Request, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrincipalService } from '../principal/principal.service';

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
  shortBio?: string;
  avatarAssetId?: string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly principal: PrincipalService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@Request() req) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const user = await this.prisma.user.findFirst({
      where: { clerkId },
      include: {
        avatarAsset: true,
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
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMyProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkId, {
      organizations: {
        include: { organization: true },
      },
    });

    const userId = user.id;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateData.firstName ?? user.firstName,
        lastName: updateData.lastName ?? user.lastName,
        phoneNumber: updateData.phoneNumber ?? user.phoneNumber,
        workExperience: updateData.workExperience ?? user.workExperience,
        education: updateData.education ?? user.education,
        certifications: updateData.certifications ?? user.certifications,
        skills: updateData.skills ?? user.skills,
        availability: updateData.availability ?? user.availability,
        cvUrl: updateData.cvUrl ?? user.cvUrl,
        shortBio: updateData.shortBio !== undefined ? updateData.shortBio : user.shortBio,
        avatarAssetId: updateData.avatarAssetId !== undefined ? updateData.avatarAssetId : user.avatarAssetId,
      },
    });

    if (this.isOrganizationRole(req.context.role)) {
      const userOrganizations = await this.prisma.userOrganization.findMany({
        where: { userId },
        include: { organization: true },
      });

      for (const userOrg of userOrganizations) {
        const organization = userOrg.organization;
        await this.prisma.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: updateData.organizationName ?? organization.name,
            contactPerson: updateData.contactPerson ?? organization.contactPerson,
            phoneNumber: updateData.phoneNumber ?? organization.phoneNumber,
            canton: updateData.canton ?? organization.canton,
            languages: updateData.languages ?? organization.languages,
            capacity: updateData.capacity ?? organization.capacity,
            pedagogy: updateData.pedagogy ?? organization.pedagogy,
            productCategory: updateData.productCategory ?? organization.productCategory,
            serviceType: updateData.serviceType ?? organization.serviceType,
            minimumOrderQuantity: updateData.minimumOrderQuantity ?? organization.minimumOrderQuantity,
            directOrderLink: updateData.directOrderLink ?? organization.directOrderLink,
            catalogUrl: updateData.catalogUrl ?? organization.catalogUrl,
            serviceCategories: updateData.serviceCategories ?? organization.serviceCategories,
            deliveryType: updateData.deliveryType ?? organization.deliveryType,
            bookingLink: updateData.bookingLink ?? organization.bookingLink,
          },
        });
      }
    }

    return {
      success: true,
      data: await this.usersService.findByClerkId(clerkId),
      message: 'Profile updated successfully',
    };
  }

  @Get('me/organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getMyOrganizations(@Request() req) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkId);

    const organizations = await this.prisma.userOrganization.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
      },
    });

    return {
      success: true,
      data: organizations.map(uo => uo.organization),
    };
  }

  @Post('me/organizations')
  @ApiOperation({ summary: 'Create new organization for user' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async createOrganization(@Request() req, @Body() organizationData: CreateOrganizationDto) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkId);

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
      },
    });

    await this.prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: req.context.role,
      },
    });

    return {
      success: true,
      data: organization,
      message: 'Organization created successfully',
    };
  }

  @Get('me/parent-leads')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get parent leads for foundation' })
  @ApiResponse({ status: 200, description: 'Parent leads retrieved successfully' })
  async getMyParentLeads(@Request() req) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkId);

    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    const parentLeads = await this.prisma.parentLead.findMany({
      where: {
        foundationId: { in: organizationIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: parentLeads,
    };
  }

  @Get('organization/:id')
  @ApiOperation({ summary: 'Get organization profile by ID' })
  @ApiResponse({ status: 200, description: 'Organization profile retrieved successfully' })
  async getOrganizationProfile(@Param('id') id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          include: {
            imageAsset: true,
          },
        },
        serviceProviders: {
          include: {
            services: {
              where: { isActive: true },
            },
          },
        },
        jobListings: {
          where: { status: 'PUBLISHED' },
        },
        logoAsset: true,
        coverAsset: true,
        members: {
          include: {
            user: {
              include: {
                avatarAsset: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      data: organization,
    };
  }

  @Put('me/parent-leads/:leadId')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Update parent lead status' })
  @ApiResponse({ status: 200, description: 'Parent lead updated successfully' })
  async updateParentLead(@Request() req, @Param('leadId') leadId: string, @Body() updateData: { status: string }) {
    const clerkId = req.context?.clerkUserId ?? req.user?.clerkId;

    if (!clerkId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }

    const { user } = await this.principal.getOrBootstrapAccountAndProfile(clerkId);

    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    const lead = await this.prisma.parentLead.findFirst({
      where: {
        id: leadId,
        foundationId: { in: organizationIds },
      },
    });

    if (!lead) {
      throw new Error('Parent lead not found or access denied');
    }

    const updatedLead = await this.prisma.parentLead.update({
      where: { id: leadId },
      data: { status: updateData.status },
    });

    return {
      success: true,
      data: updatedLead,
      message: 'Parent lead updated successfully',
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