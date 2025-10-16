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
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        role: createUserDto.role as UserRole,
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
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
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

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
    // First try to find in AppUser table (new system)
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (appUser) {
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

    // Fallback to old User table for backward compatibility
    return this.prisma.user.findUnique({
      where: { clerkId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async findByOrganization(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        organizations: {
          some: {
            organizationId: orgId,
          },
        },
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async updateByClerkId(clerkId: string, updateUserDto: UpdateUserDto) {
    // Check if user exists in AppUser table
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (appUser) {
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

    // Fallback to old User table
    const user = await this.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateUserDto,
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async assignRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async removeRole(userId: string, role: UserRole) {
    // Note: This could set to a default role instead of removing
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.PARENT }, // Default role
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: { id },
    });
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

    const existingUser = await this.findByClerkId(clerkData.id);

    if (existingUser) {
      // Update existing user
      return this.prisma.user.update({
        where: { clerkId: clerkData.id },
        data: {
          email,
          firstName: clerkData.first_name,
          lastName: clerkData.last_name,
          updatedAt: new Date(clerkData.updated_at),
        },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });
    } else {
      // Create new user
      return this.prisma.user.create({
        data: {
          clerkId: clerkData.id,
          email,
          firstName: clerkData.first_name,
          lastName: clerkData.last_name,
          role: UserRole.PARENT, // Default role
          createdAt: new Date(clerkData.created_at),
          updatedAt: new Date(clerkData.updated_at),
        },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });
    }
  }
}
