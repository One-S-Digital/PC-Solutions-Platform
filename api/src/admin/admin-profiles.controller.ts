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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, OrganizationType, AssetKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  jobRole?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobRoles?: string[];

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

  @IsOptional()
  @IsString()
  website?: string;

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
        jobRoles: Array.isArray(user.jobRoles) ? user.jobRoles : [],
        cities: Array.isArray(user.cities) ? user.cities : [],
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
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

    // First try to find by AppUser.id, then by User.id (profileId)
    let appUser = await this.prisma.appUser.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            avatarAsset: true,
            coverAsset: true,
            contactInfo: true,
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
        },
      },
    });

    if (!appUser) {
      // Try by profile ID (User.id)
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          avatarAsset: true,
          coverAsset: true,
          contactInfo: true,
          appUser: true,
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

      // Build response from User record using helper
      const primaryOrg = user.organizations?.[0]?.organization;
      return this.buildUserProfileResponse(
        user,
        user.appUser?.id || user.id,
        primaryOrg,
      );
    }

    const user = appUser.profile;
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const primaryOrg = user.organizations?.[0]?.organization;
    return this.buildUserProfileResponse(user, appUser.id, primaryOrg);
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
    let accountId: string;
    
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (appUser && appUser.profile) {
      profileId = appUser.profile.id;
      accountId = appUser.id;
    } else {
      // Try by User.id (profileId)
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { appUser: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      profileId = user.id;
      accountId = user.appUser?.id || user.id;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update user profile
      await tx.user.update({
        where: { id: profileId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          workExperience: dto.workExperience,
          education: dto.education,
          certifications: dto.certifications,
          skills: dto.skills,
          availability: dto.availability,
          cvUrl: dto.cvUrl,
          shortBio: dto.shortBio,
          ...(dto.region !== undefined && { region: dto.region }),
          ...(dto.cities !== undefined && { cities: dto.cities }),
          ...(dto.jobRoles !== undefined && { jobRoles: dto.jobRoles }),
          ...(dto.jobRole !== undefined && { jobRole: dto.jobRole }),
          ...(dto.jobRoles?.length && dto.jobRole === undefined
            ? { jobRole: dto.jobRoles[0] }
            : {}),
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

      // Update AppUser email if changed
      if (dto.email) {
        await tx.appUser.updateMany({
          where: { profileId },
          data: { email: dto.email },
        });
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
        regionsServed: (org as any).regionsServed ?? [],
        description: org.description ?? '',
        vatNumber: org.vatNumber ?? '',
        languages: org.languages ?? [],
        website: org.website ?? '',
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
          ...(dto.regionsServed !== undefined && { regionsServed: dto.regionsServed }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
          ...(dto.languages !== undefined && { languages: dto.languages }),
          ...(dto.website !== undefined && { website: dto.website }),
          // Foundation-specific
          ...(dto.capacity !== undefined && { capacity: dto.capacity }),
          ...(dto.pedagogy !== undefined && { pedagogy: dto.pedagogy }),
          // Supplier-specific
          ...(dto.productCategory !== undefined && { productCategory: dto.productCategory }),
          ...(dto.minimumOrderQuantity !== undefined && { minimumOrderQuantity: dto.minimumOrderQuantity }),
          ...(dto.directOrderLink !== undefined && { directOrderLink: dto.directOrderLink }),
          ...(dto.catalogUrl !== undefined && { catalogUrl: dto.catalogUrl }),
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
}
