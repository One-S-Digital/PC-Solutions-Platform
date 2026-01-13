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
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AssetKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// DTOs for admin profile updates
class AdminUpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  contactEmail?: string;
  phoneNumber?: string;
  region?: string;
  jobRole?: string;
  jobRoles?: string[];
  cities?: string[];
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  shortBio?: string;
  candidatePoolVisible?: boolean;
  avatarAssetId?: string;
  coverAssetId?: string;
}

class AdminUpdateOrganizationProfileDto {
  name?: string;
  type?: string;
  contactEmail?: string;
  phoneNumber?: string;
  contactPerson?: string;
  region?: string;
  canton?: string;
  city?: string;
  regionsServed?: string[];
  description?: string;
  vatNumber?: string;
  languages?: string[];
  website?: string;
  // Foundation-specific
  capacity?: number;
  pedagogy?: string[];
  // Supplier-specific
  productCategory?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  // Service Provider-specific
  serviceType?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
  // Assets
  logoAssetId?: string;
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

      // Build response from User record
      const primaryOrg = user.organizations?.[0]?.organization;
      
      return {
        success: true,
        data: {
          id: user.appUser?.id || user.id,
          profileId: user.id,
          clerkId: user.clerkId,
          role: user.role,
          email: user.email,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          contactEmail: user.contactInfo?.contactEmail ?? user.email,
          phoneNumber: user.phoneNumber ?? '',
          region: (user as any).region ?? '',
          jobRole: (user as any).jobRole ?? '',
          jobRoles: Array.isArray((user as any).jobRoles) ? (user as any).jobRoles : [],
          cities: Array.isArray((user as any).cities) ? (user as any).cities : [],
          workExperience: user.workExperience ?? '',
          education: user.education ?? '',
          certifications: user.certifications ?? [],
          skills: user.skills ?? [],
          availability: user.availability ?? '',
          cvUrl: user.cvUrl ?? '',
          shortBio: user.shortBio ?? '',
          candidatePoolVisible: (user as any).candidatePoolVisible ?? false,
          avatarUrl: user.avatarAsset?.publicUrl ?? null,
          avatarAssetId: user.avatarAssetId ?? null,
          coverImageUrl: user.coverAsset?.publicUrl ?? null,
          coverAssetId: (user as any).coverAssetId ?? null,
          // Organization info if exists
          organization: primaryOrg ? {
            id: primaryOrg.id,
            name: primaryOrg.name,
            type: primaryOrg.type,
            logoUrl: (primaryOrg as any).logoAsset?.publicUrl ?? null,
          } : null,
        },
      };
    }

    const user = appUser.profile;
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const primaryOrg = user.organizations?.[0]?.organization;

    return {
      success: true,
      data: {
        id: appUser.id,
        profileId: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        contactEmail: user.contactInfo?.contactEmail ?? user.email,
        phoneNumber: user.phoneNumber ?? '',
        region: (user as any).region ?? '',
        jobRole: (user as any).jobRole ?? '',
        jobRoles: Array.isArray((user as any).jobRoles) ? (user as any).jobRoles : [],
        cities: Array.isArray((user as any).cities) ? (user as any).cities : [],
        workExperience: user.workExperience ?? '',
        education: user.education ?? '',
        certifications: user.certifications ?? [],
        skills: user.skills ?? [],
        availability: user.availability ?? '',
        cvUrl: user.cvUrl ?? '',
        shortBio: user.shortBio ?? '',
        candidatePoolVisible: (user as any).candidatePoolVisible ?? false,
        avatarUrl: user.avatarAsset?.publicUrl ?? null,
        avatarAssetId: user.avatarAssetId ?? null,
        coverImageUrl: user.coverAsset?.publicUrl ?? null,
        coverAssetId: (user as any).coverAssetId ?? null,
        // Organization info if exists
        organization: primaryOrg ? {
          id: primaryOrg.id,
          name: primaryOrg.name,
          type: primaryOrg.type,
          logoUrl: (primaryOrg as any).logoAsset?.publicUrl ?? null,
        } : null,
      },
    };
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
          ...(dto.type !== undefined && { type: dto.type as any }),
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
