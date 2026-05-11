import { Controller, Get, Put, Post, Body, Param, UseGuards, Request, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { IsOptional, IsString, IsArray, IsUrl, IsInt, IsPositive, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrincipalService } from '../principal/principal.service';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';
import {
  EducatorWorkExperienceItemDto,
  EducatorEducationItemDto,
  EducatorCertificationItemDto,
} from '../settings/dto/educator-settings.dto';
import {
  formatEducationText,
  formatWorkExperienceText,
  normalizeCertificationItems,
  normalizeEducationItems,
  normalizeWorkExperienceItems,
} from '../utils/educator-profile-items';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  workExperience?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducatorWorkExperienceItemDto)
  workExperienceItems?: EducatorWorkExperienceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducatorEducationItemDto)
  educationItems?: EducatorEducationItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducatorCertificationItemDto)
  certificationItems?: EducatorCertificationItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsUrl()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  shortBio?: string;

  @IsOptional()
  @IsString()
  avatarAssetId?: string;

  // Organization fields
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  canton?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pedagogy?: string[];

  @IsOptional()
  @IsString()
  productCategory?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;

  @IsOptional()
  @IsString()
  directOrderLink?: string;

  @IsOptional()
  @IsString()
  catalogUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategories?: string[];

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  bookingLink?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  // Parent fields
  @IsOptional()
  @IsInt()
  @Min(0)
  childAge?: number;

  @IsOptional()
  @IsString()
  preferredLocation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  @IsOptional()
  @IsString()
  specialRequirements?: string;
}

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  canton?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pedagogy?: string[];

  @IsOptional()
  @IsString()
  productCategory?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;

  @IsOptional()
  @IsString()
  directOrderLink?: string;

  @IsOptional()
  @IsString()
  catalogUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategories?: string[];

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  bookingLink?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;
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
    private readonly translationService: TranslationService,
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
        workExperienceItems: { orderBy: { sortOrder: 'asc' } },
        educationItems: { orderBy: { sortOrder: 'asc' } },
        certificationItems: { orderBy: { sortOrder: 'asc' } },
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
      throw new NotFoundException('User not found');
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

    const normalizedWorkExperienceItems = updateData.workExperienceItems
      ? normalizeWorkExperienceItems(updateData.workExperienceItems)
      : null;
    const normalizedEducationItems = updateData.educationItems
      ? normalizeEducationItems(updateData.educationItems)
      : null;
    const normalizedCertificationItems = updateData.certificationItems
      ? normalizeCertificationItems(updateData.certificationItems)
      : null;

    const workExperienceText =
      normalizedWorkExperienceItems !== null
        ? formatWorkExperienceText(normalizedWorkExperienceItems)
        : updateData.workExperience;
    const educationText =
      normalizedEducationItems !== null
        ? formatEducationText(normalizedEducationItems)
        : updateData.education;
    const certificationNames =
      normalizedCertificationItems !== null
        ? normalizedCertificationItems.map((item) => item.name)
        : updateData.certifications;

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const userRecord = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: updateData.firstName ?? user.firstName,
          lastName: updateData.lastName ?? user.lastName,
          phoneNumber: updateData.phoneNumber ?? user.phoneNumber,
          workExperience: workExperienceText ?? user.workExperience,
          education: educationText ?? user.education,
          certifications: certificationNames ?? user.certifications,
          skills: updateData.skills ?? user.skills,
          availability: updateData.availability ?? user.availability,
          cvUrl: updateData.cvUrl ?? user.cvUrl,
          shortBio: updateData.shortBio !== undefined ? updateData.shortBio : user.shortBio,
          avatarAssetId: updateData.avatarAssetId !== undefined ? updateData.avatarAssetId : user.avatarAssetId,
        },
      });

      if (normalizedWorkExperienceItems !== null) {
        await tx.educatorWorkExperience.deleteMany({ where: { userId } });
        if (normalizedWorkExperienceItems.length > 0) {
          await tx.educatorWorkExperience.createMany({
            data: normalizedWorkExperienceItems.map((item, index) => ({
              userId,
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
        await tx.educatorEducation.deleteMany({ where: { userId } });
        if (normalizedEducationItems.length > 0) {
          await tx.educatorEducation.createMany({
            data: normalizedEducationItems.map((item, index) => ({
              userId,
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
        await tx.educatorCertification.deleteMany({ where: { userId } });
        if (normalizedCertificationItems.length > 0) {
          await tx.educatorCertification.createMany({
            data: normalizedCertificationItems.map((item, index) => ({
              userId,
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

      return userRecord;
    });

    // Update user translations if shortBio was changed
    if (updateData.shortBio !== undefined) {
      const translatableFields = FIELDS_BY_ENTITY.user || ['shortBio'];
      const translationPayload: Record<string, any> = {};
      
      // Include all translatable fields from the updated user
      for (const field of translatableFields) {
        if (updatedUser[field] !== undefined && updatedUser[field] !== null) {
          translationPayload[field] = updatedUser[field];
        }
      }

      if (Object.keys(translationPayload).length > 0) {
        try {
          await this.translationService.saveEntityWithTranslations(
            'user',
            updatedUser.id,
            translationPayload,
            translatableFields,
          );
        } catch (error) {
          // Log but don't fail the request
          console.error('Failed to save user translations:', error);
        }
      }
    }

    if (this.isOrganizationRole(req.context.role)) {
      const userOrganizations = await this.prisma.userOrganization.findMany({
        where: { userId },
        include: { organization: true },
      });

      for (const userOrg of userOrganizations) {
        const organization = userOrg.organization;
        const updatedOrganization = await this.prisma.organization.update({
          where: { id: userOrg.organizationId },
          data: {
            name: updateData.organizationName ?? organization.name,
            contactPerson: updateData.contactPerson ?? organization.contactPerson,
            phoneNumber: updateData.phoneNumber ?? organization.phoneNumber,
            canton: updateData.canton ?? organization.canton,
            city: updateData.city ?? organization.city,
            languages: updateData.languages ?? organization.languages,
            capacity: updateData.capacity ?? organization.capacity,
            pedagogy: updateData.pedagogy ?? organization.pedagogy,
            productCategory: updateData.productCategory ?? organization.productCategory,
            serviceType: updateData.serviceType ?? organization.serviceType,
            minimumOrderQuantity: updateData.minimumOrderQuantity ?? organization.minimumOrderQuantity,
            directOrderLink: updateData.directOrderLink ?? organization.directOrderLink,
            catalogUrl: updateData.catalogUrl ?? organization.catalogUrl,
            websiteUrl: updateData.websiteUrl ?? organization.websiteUrl,
            serviceCategories: updateData.serviceCategories ?? organization.serviceCategories,
            deliveryType: updateData.deliveryType ?? organization.deliveryType,
            bookingLink: updateData.bookingLink ?? organization.bookingLink,
            description: updateData.description ?? organization.description,
          },
        });

        // Update organization translations if description was changed (name is not translatable - it's a proper noun)
        if (updateData.description !== undefined) {
          const translatableFields = FIELDS_BY_ENTITY.organization || ['description'];
          const translationPayload: Record<string, any> = {};
          
          for (const field of translatableFields) {
            if (updatedOrganization[field] !== undefined && updatedOrganization[field] !== null) {
              translationPayload[field] = updatedOrganization[field];
            }
          }

          if (Object.keys(translationPayload).length > 0) {
            try {
              await this.translationService.saveEntityWithTranslations(
                'organization',
                updatedOrganization.id,
                translationPayload,
                translatableFields,
              );
            } catch (error) {
              console.error(`Failed to save translations for org ${updatedOrganization.id}:`, error);
            }
          }
        }
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
        city: organizationData.city,
        languages: organizationData.languages || [],
        capacity: organizationData.capacity,
        pedagogy: organizationData.pedagogy || [],
        productCategory: organizationData.productCategory,
        serviceType: organizationData.serviceType,
        minimumOrderQuantity: organizationData.minimumOrderQuantity,
        directOrderLink: organizationData.directOrderLink,
        catalogUrl: organizationData.catalogUrl,
        websiteUrl: organizationData.websiteUrl,
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
        contactInfo: true,
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

    const { contactInfo, members, ...orgRest } = organization as any;
    // Fall back to the primary member's user email when no explicit contact email is set.
    // This mirrors the behaviour of the owner's own settings view, which already falls back
    // to the user's auth email so public and private views stay consistent.
    const primaryMemberEmail: string | null = members?.[0]?.user?.email ?? null;
    return {
      success: true,
      data: {
        ...orgRest,
        members,
        contactEmail: contactInfo?.contactEmail ?? primaryMemberEmail,
      },
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