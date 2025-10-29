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
      accountEnabled: true,
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
      accountEnabled: true,
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
    // First check if AppUser exists (required for auth)
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      return null;
    }

    // Try to get full User profile
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (user) {
        // Return full User profile with organizations as empty array
        return {
          ...user,
          organizations: [],
        };
      }
    } catch (error) {
      // Log error but continue to return AppUser minimal data
      console.error('Error querying User table:', error);
    }

    // User profile doesn't exist yet, return minimal data from AppUser
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
      accountEnabled: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt,
      organizations: [],
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
      accountEnabled: true,
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
      accountEnabled: true,
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
      const result = {
        ...user,
        organizations: [],
      };
      console.log('📤 [BACKEND UPDATE] Returning user data:', result);
      return result;
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
      const fallbackResult = {
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
        accountEnabled: true,
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
        organizations: [],
      };
      console.log('📤 [BACKEND UPDATE] Returning fallback user data:', fallbackResult);
      return fallbackResult;
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
      accountEnabled: true,
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
      accountEnabled: true,
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
      accountEnabled: true,
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
      accountEnabled: true,
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
          accountEnabled: true,
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
      accountEnabled: true,
      createdAt: newAppUser.createdAt,
      updatedAt: newAppUser.updatedAt,
      organizations: [],
    };
  }
}
