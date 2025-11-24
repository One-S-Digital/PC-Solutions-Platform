import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { PrincipalService } from '../principal/principal.service';

const userProfileInclude = {
  avatarAsset: true,
  organizations: {
    include: {
      organization: {
        include: {
          logoAsset: true,
          coverAsset: true,
          products: {
            include: {
              imageAsset: true,
            },
          },
          serviceProviders: {
            include: {
              services: true,
            },
          },
          jobListings: true,
        },
      },
    },
  },
} as const satisfies Prisma.UserInclude;

type UserProfileInclude = typeof userProfileInclude;
type UserWithProfile = Prisma.UserGetPayload<{ include: UserProfileInclude }>;

export interface FindAllUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private readonly principal: PrincipalService) {}

  private serializeDate(value: Date | string | null | undefined): string | null | undefined {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  private buildUserResponse(
    user: UserWithProfile | null,
    appUser: { id: string; clerkId: string; email: string | null; role: UserRole },
  ) {
    if (!user) {
      return {
        id: appUser.id,
        clerkId: appUser.clerkId,
        email: appUser.email,
        firstName: null,
        lastName: null,
        role: appUser.role,
        phoneNumber: null,
        workExperience: null,
        education: null,
        certifications: [],
        skills: [],
        availability: null,
        cvUrl: null,
        shortBio: null,
        avatarAssetId: null,
        stripeCustomerId: null,
        lastActiveAt: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
        organizations: [],
        name: appUser.email ?? 'Unknown User',
        status: 'Active',
        memberSince: null,
        lastLogin: null,
        avatarUrl: null,
        orgId: undefined,
        orgName: undefined,
        orgType: undefined,
        orgLogoUrl: null,
        orgCoverImageUrl: null,
        primaryOrganization: null,
      };
    }

    const organizations = (user.organizations ?? []).map(userOrg => {
      const org = userOrg.organization as any;

      const products = (org.products ?? []).map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        tags: product.tags ?? [],
        status: product.status,
        isActive: product.isActive,
        supplierId: product.supplierId,
        createdAt: this.serializeDate(product.createdAt),
        updatedAt: this.serializeDate(product.updatedAt),
        imageAssetId: product.imageAssetId,
        imageUrl: product.imageAsset?.publicUrl ?? null,
      }));

      const services = (org.serviceProviders ?? []).flatMap((provider: any) =>
        (provider.services ?? []).map((service: any) => ({
          id: service.id,
          title: service.title,
          description: service.description,
          category: service.category,
          price: service.price,
          priceInfo: service.priceInfo,
          availability: service.availability,
          tags: service.tags ?? [],
          imageUrl: service.imageUrl,
          isActive: service.isActive,
          providerId: service.providerId,
          createdAt: this.serializeDate(service.createdAt),
          updatedAt: this.serializeDate(service.updatedAt),
          deliveryType: service.deliveryType ?? provider.deliveryType ?? null,
          bookingLink: provider.bookingLink ?? org.bookingLink ?? null,
        })),
      );

      const jobListings = (org.jobListings ?? []).map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements ?? [],
        responsibilities: job.responsibilities ?? [],
        qualifications: job.qualifications ?? [],
        benefits: job.benefits ?? [],
        location: job.location,
        salary: job.salary,
        salaryRange: job.salaryRange,
        contractType: job.contractType,
        startDate: this.serializeDate(job.startDate),
        status: job.status,
        foundationId: job.foundationId,
        publishedAt: this.serializeDate(job.publishedAt),
        createdAt: this.serializeDate(job.createdAt),
        updatedAt: this.serializeDate(job.updatedAt),
        applicationsCount: job.applicationsCount ?? 0,
      }));

      const logoUrl = org.logoAsset?.publicUrl ?? null;
      const coverImageUrl = org.coverAsset?.publicUrl ?? null;

      return {
        id: org.id,
        name: org.name,
        type: org.type,
        region: org.region,
        description: org.description,
        vatNumber: org.vatNumber,
        contactPerson: org.contactPerson,
        phoneNumber: org.phoneNumber,
        canton: org.canton,
        regionsServed: org.regionsServed ?? (org.canton ? [org.canton] : []),
        languages: org.languages ?? [],
        capacity: org.capacity,
        pedagogy: org.pedagogy ?? [],
        productCategory: org.productCategory,
        serviceType: org.serviceType,
        minimumOrderQuantity: org.minimumOrderQuantity,
        directOrderLink: org.directOrderLink,
        catalogUrl: org.catalogUrl,
        serviceCategories: org.serviceCategories ?? [],
        deliveryType: org.deliveryType,
        bookingLink: org.bookingLink,
        bookingLinkOverride: org.bookingLink,
        createdAt: this.serializeDate(org.createdAt),
        updatedAt: this.serializeDate(org.updatedAt),
        isActive: org.isActive,
        logoAssetId: org.logoAssetId,
        coverAssetId: org.coverAssetId,
        logoUrl,
        coverImageUrl,
        products,
        services,
        jobListings,
        membershipRole: userOrg.role,
      };
    });

    const primaryOrganization = organizations[0] ?? null;
    const firstName = user.firstName ?? undefined;
    const lastName = user.lastName ?? undefined;
    const fullName =
      firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim().replace(/\s+/g, ' ') : undefined;

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email ?? appUser.email,
      firstName,
      lastName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      workExperience: user.workExperience,
      education: user.education,
      certifications: user.certifications ?? [],
      skills: user.skills ?? [],
      availability: user.availability,
      cvUrl: user.cvUrl,
      shortBio: user.shortBio,
      avatarAssetId: user.avatarAssetId,
      stripeCustomerId: user.stripeCustomerId,
      lastActiveAt: this.serializeDate(user.lastActiveAt),
      isActive: user.isActive,
      createdAt: this.serializeDate(user.createdAt),
      updatedAt: this.serializeDate(user.updatedAt),
      organizations,
      name: fullName ?? user.email ?? appUser.email ?? 'Unknown User',
      status: user.isActive ? 'Active' : 'Inactive',
      memberSince: this.serializeDate(user.createdAt),
      lastLogin: this.serializeDate(user.lastActiveAt),
      avatarUrl: user.avatarAsset?.publicUrl ?? primaryOrganization?.logoUrl ?? null,
      orgId: primaryOrganization?.id,
      orgName: primaryOrganization?.name,
      orgType: primaryOrganization?.type,
      orgLogoUrl: primaryOrganization?.logoUrl ?? null,
      orgCoverImageUrl: primaryOrganization?.coverImageUrl ?? null,
      primaryOrganization,
    };
  }

  async completeProfile(clerkId: string, email: string, dto: CompleteProfileDto) {
    console.log(`👤 [COMPLETE PROFILE] Completing profile for ${clerkId}`);
    
    // Check if user already exists
    const existingUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      console.log(`⚠️ [COMPLETE PROFILE] User already exists, updating role...`);
      // Update role if it's different
      if (existingUser.role !== dto.role) {
        await this.prisma.appUser.update({
          where: { id: existingUser.id },
          data: { role: dto.role },
        });
      }
    } else {
      console.log(`🆕 [COMPLETE PROFILE] Creating new user with role ${dto.role}`);
      // Create AppUser
      const appUser = await this.prisma.appUser.create({
        data: {
          clerkId,
          email,
          role: dto.role,
        },
      });

      // Create User profile
      const nameParts = dto.contactPerson ? dto.contactPerson.trim().split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await this.prisma.user.create({
        data: {
          clerkId,
          email,
          role: dto.role,
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: dto.phone,
          isActive: true,
        },
      });
      
      // If organization details are provided, we should ideally create the organization here
      // This is a simplification
      if (dto.organisationName) {
         // Logic to create organization would go here
         // For now we rely on the user updating their profile/org later or implement a separate flow
         console.log(`🏢 [COMPLETE PROFILE] Organization name provided: ${dto.organisationName}`);
      }
    }

    return this.findByClerkId(clerkId);
  }

  async create(createUserDto: CreateUserDto) {
    // Check if user exists
    const existingUser = await this.prisma.appUser.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const appUser = await this.prisma.appUser.create({
      data: {
        clerkId: createUserDto.clerkId,
        email: createUserDto.email,
        role: createUserDto.role as UserRole,
      },
    });

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  async findAll(params: FindAllUsersParams) {
    const { page, limit, role, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { clerkId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [appUsers, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.appUser.count({ where }),
    ]);

    // Convert AppUser to User format for compatibility
    const users = appUsers.map(appUser => ({
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    }));

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAppUserByClerkId(clerkId: string) {
    return this.prisma.appUser.findUnique({
      where: { clerkId },
    });
  }

  async createAppUser(data: { clerkId: string; email?: string; role: string }) {
    return this.prisma.appUser.create({
      data: {
        clerkId: data.clerkId,
        email: data.email,
        role: data.role as any,
      },
    });
  }

  async findByClerkId(clerkId: string) {
    if (!clerkId) {
      return null;
    }

    try {
      const result = await this.principal.getOrBootstrapAccountAndProfile<typeof userProfileInclude>(
        clerkId,
        userProfileInclude,
      );
      return this.buildUserResponse(result.user, {
        id: result.appUser.id,
        clerkId: result.appUser.clerkId,
        email: result.appUser.email,
        role: result.appUser.role,
      });
    } catch (error) {
      console.error('[UsersService] Failed to load user by clerkId', { clerkId, error });
      return null;
    }
  }

  async findOne(id: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  async findByEmail(email: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { email },
    });

    if (!appUser) {
      return null;
    }

    // Return in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null,
      lastName: null,
      role: appUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
    };
  }

  async findByOrganization(orgId: string) {
    // Note: AppUser doesn't have organization relations yet
    // This method returns empty array until organization migration is complete
    return [];
  }

  async updateByClerkId(clerkId: string, updateUserDto: UpdateUserDto) {
    console.log('🔄 [BACKEND UPDATE] Starting updateByClerkId');
    console.log('📝 UpdateUserDto received:', updateUserDto);
    console.log('🔍 ClerkId:', clerkId);
    
    // Check if AppUser exists (required for auth)
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      console.log('❌ AppUser not found for clerkId:', clerkId);
      throw new NotFoundException('User not found');
    }
    
    console.log('✅ AppUser found:', appUser.id);

    try {
      // Try to find or create User profile
      let user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        // Create User profile if it doesn't exist
        console.log('Creating User profile for clerkId:', clerkId);
        user = await this.prisma.user.create({
          data: {
            clerkId,
            email: appUser.email || updateUserDto.email || '',
            firstName: updateUserDto.firstName || null,
            lastName: updateUserDto.lastName || null,
            role: appUser.role,
          },
        });
        console.log('User profile created:', user.id);
      } else {
        // Update existing User profile
        console.log('Updating User profile for clerkId:', clerkId);
        
        // Build update data object with only provided fields
        const updateData: any = {};
        if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
        if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
        if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
        if (updateUserDto.phoneNumber !== undefined) updateData.phoneNumber = updateUserDto.phoneNumber;
        
        console.log('Update data prepared:', updateData);
        
        if (Object.keys(updateData).length === 0) {
          console.log('No fields to update, skipping database update');
          user = await this.prisma.user.findUnique({
            where: { clerkId },
          });
        } else {
          user = await this.prisma.user.update({
            where: { clerkId },
            data: updateData,
          });
          console.log('User profile updated:', user.id);
        }
      }

      // Also update email in AppUser if changed
      if (updateUserDto.email && updateUserDto.email !== appUser.email) {
        await this.prisma.appUser.update({
          where: { id: appUser.id },
          data: { email: updateUserDto.email },
        });
      }

        // Return full User profile
        console.log('📤 [BACKEND UPDATE] Returning user data via enriched response');
        return this.findByClerkId(clerkId);
    } catch (error) {
      console.error('Error updating User profile:', error);
      // If User table operations fail, fall back to updating AppUser only
      console.log('Falling back to AppUser-only update');
      
      // Update AppUser email if provided
      if (updateUserDto.email) {
        await this.prisma.appUser.update({
          where: { id: appUser.id },
          data: { email: updateUserDto.email },
        });
      }
      
        // Return AppUser data in User format
        console.log('📤 [BACKEND UPDATE] Returning fallback user data via enriched response');
        return this.findByClerkId(clerkId);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    const updatedAppUser = await this.prisma.appUser.update({
      where: { id },
      data: {
        email: updateUserDto.email || appUser.email,
        role: updateUserDto.role as UserRole || appUser.role,
      },
    });

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: null,
      lastName: null,
      role: updatedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: updatedAppUser.createdAt,
      updatedAt: updatedAppUser.updatedAt,
      organizations: [],
    };
  }

  async assignRole(userId: string, role: UserRole) {
    const updatedAppUser = await this.prisma.appUser.update({
      where: { id: userId },
      data: { role },
    });

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: null,
      lastName: null,
      role: updatedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: updatedAppUser.createdAt,
      updatedAt: updatedAppUser.updatedAt,
      organizations: [],
    };
  }

  async removeRole(userId: string, role: UserRole) {
    // Note: This could set to a default role instead of removing
    const updatedAppUser = await this.prisma.appUser.update({
      where: { id: userId },
      data: { role: UserRole.PARENT }, // Default role
    });

    // Return in User format for compatibility
    return {
      id: updatedAppUser.id,
      clerkId: updatedAppUser.clerkId,
      email: updatedAppUser.email,
      firstName: null,
      lastName: null,
      role: updatedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: updatedAppUser.createdAt,
      updatedAt: updatedAppUser.updatedAt,
      organizations: [],
    };
  }

  async remove(id: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    const deletedAppUser = await this.prisma.appUser.delete({
      where: { id },
    });

    // Return in User format for compatibility
    return {
      id: deletedAppUser.id,
      clerkId: deletedAppUser.clerkId,
      email: deletedAppUser.email,
      firstName: null,
      lastName: null,
      role: deletedAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: deletedAppUser.createdAt,
      updatedAt: deletedAppUser.updatedAt,
      organizations: [],
    };
  }

  // Sync user with Clerk webhook
  async syncWithClerk(clerkData: {
    id: string;
    email_addresses: any[];
    first_name: string;
    last_name: string;
    created_at: number;
    updated_at: number;
  }) {
    const email = clerkData.email_addresses[0]?.email_address;
    if (!email) {
      throw new Error('No email found in Clerk data');
    }

    try {
      const existingUser = await this.findByClerkId(clerkData.id);

      if (existingUser) {
        // Update existing user
        const updatedAppUser = await this.prisma.appUser.update({
          where: { clerkId: clerkData.id },
          data: {
            email,
            updatedAt: new Date(clerkData.updated_at),
          },
        });

        // Return in User format for compatibility
        return {
          id: updatedAppUser.id,
          clerkId: updatedAppUser.clerkId,
          email: updatedAppUser.email,
          firstName: null,
          lastName: null,
          role: updatedAppUser.role,
          phoneNumber: null,
          workExperience: null,
          education: null,
          certifications: [],
          skills: [],
          availability: null,
          cvUrl: null,
          stripeCustomerId: null,
          lastActiveAt: null,
          isActive: true,
          createdAt: updatedAppUser.createdAt,
          updatedAt: updatedAppUser.updatedAt,
          organizations: [],
        };
      }
    } catch (error) {
      // User not found, create new one
    }

    // Create new user
    const newAppUser = await this.prisma.appUser.create({
      data: {
        clerkId: clerkData.id,
        email,
        role: UserRole.PARENT, // Default role
        createdAt: new Date(clerkData.created_at),
        updatedAt: new Date(clerkData.updated_at),
      },
    });

    // Return in User format for compatibility
    return {
      id: newAppUser.id,
      clerkId: newAppUser.clerkId,
      email: newAppUser.email,
      firstName: null,
      lastName: null,
      role: newAppUser.role,
      phoneNumber: null,
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
      createdAt: newAppUser.createdAt,
      updatedAt: newAppUser.updatedAt,
      organizations: [],
    };
  }
}
