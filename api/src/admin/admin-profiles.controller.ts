import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  Delete,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumber,
  IsUrl,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ALLOWED_JOB_ROLES } from '../settings/dto/educator-settings.dto';
import { Type } from 'class-transformer';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, OrganizationType, AssetKind, ServiceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
import { normalizeRegionsServed } from '../common/utils/regions.util';

// Valid organization types for validation
const VALID_ORGANIZATION_TYPES = Object.values(OrganizationType);

// DTOs for admin profile updates with class-validator decorators
class AdminUpdateUserProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.contactEmail)
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.jobRole)
  @IsIn(ALLOWED_JOB_ROLES)
  jobRole?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

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
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  shortBio?: string;

  @IsOptional()
  @IsBoolean()
  candidatePoolVisible?: boolean;

  @IsOptional()
  @IsString()
  avatarAssetId?: string;

  @IsOptional()
  @IsString()
  coverAssetId?: string;
}

class AdminUpdateOrganizationProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  canton?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionsServed?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  // Foundation-specific
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pedagogy?: string[];

  // Supplier-specific
  @IsOptional()
  @IsString()
  productCategory?: string;

  @IsOptional()
  @IsNumber()
  minimumOrderQuantity?: number;

  @IsOptional()
  @IsString()
  directOrderLink?: string;

  @IsOptional()
  @IsString()
  catalogUrl?: string;

  // Public website (canonical field is Organization.websiteUrl)
  // Keep `website` as a backwards-compatible alias for admin UIs that still send it.
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  website?: string;

  // Service Provider-specific
  @IsOptional()
  @IsString()
  serviceType?: string;

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

  // Assets
  @IsOptional()
  @IsString()
  logoAssetId?: string;

  @IsOptional()
  @IsString()
  coverAssetId?: string;
}

class AdminUpsertProductDto {
  @IsString()
  title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class AdminUpsertServiceDto {
  @IsString()
  title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(Object.values(ServiceCategory)) category?: ServiceCategory;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() priceInfo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('admin-profiles')
@Controller('admin')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
export class AdminProfilesController {
  private readonly logger = new Logger(AdminProfilesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper function to build consistent user profile response
   * Extracts duplicated mapping logic into a single reusable method
   */
  private buildUserProfileResponse(
    user: any,
    appUserId: string,
    primaryOrg: any | null,
  ) {
    return {
      success: true,
      data: {
        id: appUserId,
        profileId: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        contactEmail: user.contactInfo?.contactEmail ?? user.email,
        phoneNumber: user.phoneNumber ?? '',
        region: user.region ?? '',
        jobRole: user.jobRole ?? '',
        cities: Array.isArray(user.cities) ? user.cities : [],
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
        workExperienceItems: user.workExperienceItems ?? [],
        educationItems: user.educationItems ?? [],
        certificationItems: user.certificationItems ?? [],
        skills: user.skills ?? [],
        availability: user.availability ?? '',
        cvUrl: user.cvUrl ?? '',
        shortBio: user.shortBio ?? '',
        candidatePoolVisible: user.candidatePoolVisible ?? false,
        avatarUrl: user.avatarAsset?.publicUrl ?? null,
        avatarAssetId: user.avatarAssetId ?? null,
        coverImageUrl: user.coverAsset?.publicUrl ?? null,
        coverAssetId: user.coverAssetId ?? null,
        organization: primaryOrg
          ? {
              id: primaryOrg.id,
              name: primaryOrg.name,
              type: primaryOrg.type,
              logoUrl: primaryOrg.logoAsset?.publicUrl ?? null,
            }
          : null,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // User Profile Management
  // ─────────────────────────────────────────────────────────────

  @Get('users/:id/profile')
  @ApiOperation({ summary: 'Get full user profile (admin)' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getUserProfile(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`[ADMIN] Fetching profile for user: ${id}`);

    // First try to find by AppUser.id
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (appUser) {
      // Found AppUser, now get the User profile by clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId: appUser.clerkId },
        include: {
          avatarAsset: true,
          coverAsset: true,
          contactInfo: true,
          workExperienceItems: { orderBy: { sortOrder: 'asc' } },
          educationItems: { orderBy: { sortOrder: 'asc' } },
          certificationItems: { orderBy: { sortOrder: 'asc' } },
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
        },
      });

      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const primaryOrg = user.organizations?.[0]?.organization;
      return this.buildUserProfileResponse(user, appUser.id, primaryOrg);
    }

    // Try by profile ID (User.id)
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        avatarAsset: true,
        coverAsset: true,
        contactInfo: true,
        workExperienceItems: { orderBy: { sortOrder: 'asc' } },
        educationItems: { orderBy: { sortOrder: 'asc' } },
        certificationItems: { orderBy: { sortOrder: 'asc' } },
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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find AppUser by clerkId
    const relatedAppUser = await this.prisma.appUser.findUnique({
      where: { clerkId: user.clerkId },
    });

    // Build response from User record using helper
    const primaryOrg = user.organizations?.[0]?.organization;
    return this.buildUserProfileResponse(
      user,
      relatedAppUser?.id || user.id,
      primaryOrg,
    );
  }

  @Patch('users/:id/profile')
  @ApiOperation({ summary: 'Update full user profile (admin)' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserProfileDto,
  ) {
    this.logger.log(`[ADMIN] Updating profile for user: ${id}`);

    // Find the user - first try AppUser.id, then User.id
    let profileId: string;
    let clerkId: string;
    
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (appUser) {
      // Found AppUser, now get the User profile by clerkId
      const userProfile = await this.prisma.user.findUnique({
        where: { clerkId: appUser.clerkId },
      });

      if (userProfile) {
        profileId = userProfile.id;
        clerkId = appUser.clerkId;
      } else {
        throw new NotFoundException('User profile not found');
      }
    } else {
      // Try by User.id (profileId)
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      profileId = user.id;
      clerkId = user.clerkId;
    }

    const normalizedWorkExperienceItems = dto.workExperienceItems
      ? normalizeWorkExperienceItems(dto.workExperienceItems)
      : null;
    const normalizedEducationItems = dto.educationItems
      ? normalizeEducationItems(dto.educationItems)
      : null;
    const normalizedCertificationItems = dto.certificationItems
      ? normalizeCertificationItems(dto.certificationItems)
      : null;

    const workExperienceText =
      normalizedWorkExperienceItems !== null
        ? formatWorkExperienceText(normalizedWorkExperienceItems)
        : dto.workExperience;
    const educationText =
      normalizedEducationItems !== null
        ? formatEducationText(normalizedEducationItems)
        : dto.education;
    const certificationNames =
      normalizedCertificationItems !== null
        ? normalizedCertificationItems.map((item) => item.name)
        : dto.certifications;

    await this.prisma.$transaction(async (tx) => {
      // Update user profile
      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          workExperience: workExperienceText,
          education: educationText,
          certifications: certificationNames,
          skills: dto.skills,
          availability: dto.availability,
          cvUrl: dto.cvUrl,
          shortBio: dto.shortBio,
          ...(dto.region !== undefined && { region: dto.region }),
          ...(dto.cities !== undefined && { cities: dto.cities }),
          ...(dto.jobRole !== undefined && { jobRole: dto.jobRole }),
          ...(dto.candidatePoolVisible !== undefined && { candidatePoolVisible: dto.candidatePoolVisible }),
          ...(dto.avatarAssetId !== undefined && { avatarAssetId: dto.avatarAssetId || null }),
          ...(dto.coverAssetId !== undefined && { coverAssetId: dto.coverAssetId || null }),
        },
      });

      // Update contact email separately
      if (dto.contactEmail !== undefined) {
        await tx.userContactInfo.upsert({
          where: { userId: profileId },
          create: {
            userId: profileId,
            contactEmail: dto.contactEmail || null,
          },
          update: {
            contactEmail: dto.contactEmail || null,
          },
        });
      }

      // Update AppUser email if changed (using clerkId to find the AppUser)
      if (dto.email) {
        await tx.appUser.updateMany({
          where: { clerkId },
          data: { email: dto.email },
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

    return {
      success: true,
      message: 'User profile updated successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Organization Profile Management
  // ─────────────────────────────────────────────────────────────

  @Get('organizations/:id/profile')
  @ApiOperation({ summary: 'Get full organization profile (admin)' })
  @ApiResponse({ status: 200, description: 'Organization profile retrieved successfully' })
  async getOrganizationProfile(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`[ADMIN] Fetching profile for organization: ${id}`);

    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        logoAsset: true,
        coverAsset: true,
        contactInfo: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        type: org.type,
        contactEmail: org.contactInfo?.contactEmail ?? '',
        phoneNumber: org.phoneNumber ?? '',
        contactPerson: org.contactPerson ?? '',
        region: org.region ?? '',
        canton: org.canton ?? '',
        city: org.city ?? '',
        regionsServed: org.regionsServed ?? [],
        description: org.description ?? '',
        vatNumber: org.vatNumber ?? '',
        languages: org.languages ?? [],
        // Public website (admin UI historically used `website`)
        websiteUrl: org.websiteUrl ?? '',
        website: org.websiteUrl ?? '',
        logoUrl: org.logoAsset?.publicUrl ?? null,
        logoAssetId: org.logoAssetId ?? null,
        coverImageUrl: org.coverAsset?.publicUrl ?? null,
        coverAssetId: org.coverAssetId ?? null,
        // Foundation-specific
        capacity: org.capacity ?? 0,
        pedagogy: org.pedagogy ?? [],
        // Supplier-specific
        productCategory: org.productCategory ?? '',
        minimumOrderQuantity: org.minimumOrderQuantity ?? 0,
        directOrderLink: org.directOrderLink ?? '',
        catalogUrl: org.catalogUrl ?? '',
        // Service Provider-specific
        serviceType: org.serviceType ?? '',
        serviceCategories: org.serviceCategories ?? [],
        deliveryType: org.deliveryType ?? '',
        bookingLink: org.bookingLink ?? '',
        // Members
        members: org.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email,
          email: m.user?.email,
        })),
      },
    };
  }

  @Patch('organizations/:id/profile')
  @ApiOperation({ summary: 'Update full organization profile (admin)' })
  @ApiResponse({ status: 200, description: 'Organization profile updated successfully' })
  async updateOrganizationProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateOrganizationProfileDto,
  ) {
    this.logger.log(`[ADMIN] Updating profile for organization: ${id}`);

    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Validate organization type if provided
    if (dto.type !== undefined && !VALID_ORGANIZATION_TYPES.includes(dto.type as OrganizationType)) {
      throw new BadRequestException(`Invalid organization type: ${dto.type}. Valid types are: ${VALID_ORGANIZATION_TYPES.join(', ')}`);
    }

    // Normalize website field (support both websiteUrl and legacy website)
    const normalizedWebsiteUrl =
      dto.websiteUrl !== undefined ? dto.websiteUrl : dto.website !== undefined ? dto.website : undefined;

    const normalizedRegionsServed =
      dto.regionsServed !== undefined ? normalizeRegionsServed(dto.regionsServed) : undefined;

    await this.prisma.$transaction(async (tx) => {
      // Update contact email separately
      if (dto.contactEmail !== undefined) {
        await tx.organizationContactInfo.upsert({
          where: { organizationId: id },
          create: {
            organizationId: id,
            contactEmail: dto.contactEmail || null,
          },
          update: {
            contactEmail: dto.contactEmail || null,
          },
        });
      }

      // Update organization
      await tx.organization.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.type !== undefined && { type: dto.type as OrganizationType }),
          ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
          ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
          ...(dto.region !== undefined && { region: dto.region }),
          ...(dto.canton !== undefined && { canton: dto.canton }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(normalizedRegionsServed !== undefined && { regionsServed: normalizedRegionsServed }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
          ...(dto.languages !== undefined && { languages: dto.languages }),
          // Foundation-specific
          ...(dto.capacity !== undefined && { capacity: dto.capacity }),
          ...(dto.pedagogy !== undefined && { pedagogy: dto.pedagogy }),
          // Supplier-specific
          ...(dto.productCategory !== undefined && { productCategory: dto.productCategory }),
          ...(dto.minimumOrderQuantity !== undefined && { minimumOrderQuantity: dto.minimumOrderQuantity }),
          ...(dto.directOrderLink !== undefined && { directOrderLink: dto.directOrderLink }),
          ...(dto.catalogUrl !== undefined && { catalogUrl: dto.catalogUrl }),
          ...(normalizedWebsiteUrl !== undefined && { websiteUrl: normalizedWebsiteUrl }),
          // Service Provider-specific
          ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
          ...(dto.serviceCategories !== undefined && { serviceCategories: dto.serviceCategories }),
          ...(dto.deliveryType !== undefined && { deliveryType: dto.deliveryType }),
          ...(dto.bookingLink !== undefined && { bookingLink: dto.bookingLink }),
          // Assets
          ...(dto.logoAssetId !== undefined && { logoAssetId: dto.logoAssetId || null }),
          ...(dto.coverAssetId !== undefined && { coverAssetId: dto.coverAssetId || null }),
        },
      });
    });

    return {
      success: true,
      message: 'Organization profile updated successfully',
    };
  }

  @Get('organizations/:id/products')
  async getOrganizationProducts(@Param('id', ParseUUIDPipe) id: string) {
    const items = await this.prisma.product.findMany({ where: { supplierId: id }, orderBy: { createdAt: 'desc' } });
    return { success: true, data: items };
  }

  @Post('organizations/:id/products')
  async createOrganizationProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpsertProductDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    const item = await this.prisma.product.create({
      data: { supplierId: id, title: dto.title, description: dto.description, category: dto.category, price: dto.price, isActive: dto.isActive ?? true },
    });
    return { success: true, data: item };
  }

  @Patch('organizations/:orgId/products/:productId')
  async updateOrganizationProduct(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdminUpsertProductDto,
  ) {
    const item = await this.prisma.product.updateMany({
      where: { id: productId, supplierId: orgId },
      data: { title: dto.title, description: dto.description, category: dto.category, price: dto.price, isActive: dto.isActive },
    });
    if (item.count === 0) throw new NotFoundException('Product not found');
    return { success: true };
  }

  @Delete('organizations/:orgId/products/:productId')
  async deleteOrganizationProduct(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('productId', ParseUUIDPipe) productId: string) {
    const deleted = await this.prisma.product.deleteMany({ where: { id: productId, supplierId: orgId } });
    if (!deleted.count) throw new NotFoundException('Product not found');
    return { success: true, message: 'Product hard deleted' };
  }

  @Get('organizations/:id/services')
  async getOrganizationServices(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { organizationId: id } });
    if (!provider) return { success: true, data: [] };
    const items = await this.prisma.service.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: 'desc' } });
    return { success: true, data: items };
  }

  @Post('organizations/:id/services')
  async createOrganizationService(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpsertServiceDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    const provider = await this.prisma.serviceProvider.upsert({
      where: { organizationId: id },
      create: { organizationId: id },
      update: {},
    });
    const item = await this.prisma.service.create({
      data: { providerId: provider.id, title: dto.title, description: dto.description, category: dto.category || ServiceCategory.CONSULTING, price: dto.price, priceInfo: dto.priceInfo, isActive: dto.isActive ?? true },
    });
    return { success: true, data: item };
  }

  @Delete('organizations/:orgId/services/:serviceId')
  async deleteOrganizationService(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('serviceId', ParseUUIDPipe) serviceId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { organizationId: orgId } });
    if (!provider) throw new NotFoundException('Service provider not found');
    const deleted = await this.prisma.service.deleteMany({ where: { id: serviceId, providerId: provider.id } });
    if (!deleted.count) throw new NotFoundException('Service not found');
    return { success: true, message: 'Service hard deleted' };
  }

  @Get('organizations/:id/documents')
  async getOrganizationDocuments(@Param('id', ParseUUIDPipe) id: string) {
    const docs = await this.prisma.organizationDocument.findMany({ where: { organizationId: id }, include: { asset: true }, orderBy: { createdAt: 'desc' } });
    return { success: true, data: docs };
  }

  @Delete('organizations/:orgId/documents/:documentId')
  async deleteOrganizationDocument(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('documentId', ParseUUIDPipe) documentId: string) {
    const deleted = await this.prisma.organizationDocument.deleteMany({ where: { id: documentId, organizationId: orgId } });
    if (!deleted.count) throw new NotFoundException('Document not found');
    return { success: true, message: 'Document hard deleted' };
  }

  // ── Member management ──────────────────────────────────────────────────────

  @Post('organizations/:orgId/members')
  async addOrganizationMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: { userId: string; role: string },
  ) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const role = (Object.values(UserRole) as string[]).includes(dto.role)
      ? (dto.role as UserRole)
      : org.type === OrganizationType.FOUNDATION
        ? UserRole.EDUCATOR
        : org.type === OrganizationType.PRODUCT_SUPPLIER
          ? UserRole.PRODUCT_SUPPLIER
          : UserRole.SERVICE_PROVIDER;

    await this.prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: dto.userId, organizationId: orgId } },
      create: { userId: dto.userId, organizationId: orgId, role },
      update: { role },
    });

    return { success: true, message: 'Member added to organization' };
  }

  @Delete('organizations/:orgId/members/:userId')
  async removeOrganizationMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId') userId: string,
  ) {
    const deleted = await this.prisma.userOrganization.deleteMany({
      where: { userId, organizationId: orgId },
    });
    if (!deleted.count) throw new NotFoundException('Member not found in this organization');
    return { success: true, message: 'Member removed from organization' };
  }
}
