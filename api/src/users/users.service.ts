import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

export interface FindAllUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findByClerkId(clerkId: string) {
    // Use AppUser as the primary user table
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      return null;
    }

    // Return AppUser data in User format for compatibility
    return {
      id: appUser.id,
      clerkId: appUser.clerkId,
      email: appUser.email,
      firstName: null, // AppUser doesn't have these fields yet
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
      organizations: [], // AppUser doesn't have organizations yet
    };
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
    // Use AppUser as the primary user table
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    // Update AppUser
    const updatedAppUser = await this.prisma.appUser.update({
      where: { id: appUser.id },
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
