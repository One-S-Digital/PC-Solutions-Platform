import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AppUser, UserRole } from '@prisma/client';
import { createClerkClient } from '@clerk/clerk-sdk-node';

export interface FindAllUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly clerkClient: ReturnType<typeof createClerkClient> | null;

  constructor(private prisma: PrismaService) {
    const secret = process.env.CLERK_SECRET_KEY;
    if (secret) {
      this.clerkClient = createClerkClient({ secretKey: secret });
    } else {
      this.logger.warn('CLERK_SECRET_KEY not configured. Manual Clerk sync is disabled.');
      this.clerkClient = null;
    }
  }

  private buildUserResponse(appUser: AppUser) {
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

  private normalizeClerkPayload(clerkData: any) {
    if (!clerkData || typeof clerkData !== 'object') {
      throw new Error('Invalid Clerk data payload');
    }

    const primaryId =
      clerkData.primary_email_address_id ||
      clerkData.primaryEmailAddressId ||
      null;

    const normalizeEmailRecord = (record: any) => {
      if (!record || typeof record !== 'object') {
        return null;
      }
      const id = record.id ?? null;
      const email =
        record.email_address ??
        record.emailAddress ??
        record.email ??
        record.address ??
        null;
      const primary =
        typeof record.primary === 'boolean'
          ? record.primary
          : id
          ? id === primaryId
          : false;
      return {
        id,
        email_address: email,
        primary,
      };
    };

    let emailAddresses: any[] = [];
    if (Array.isArray(clerkData.email_addresses)) {
      emailAddresses = clerkData.email_addresses
        .map(normalizeEmailRecord)
        .filter((entry): entry is { id: string | null; email_address: string | null; primary: boolean } => Boolean(entry));
    } else if (Array.isArray(clerkData.emailAddresses)) {
      emailAddresses = clerkData.emailAddresses
        .map(normalizeEmailRecord)
        .filter((entry): entry is { id: string | null; email_address: string | null; primary: boolean } => Boolean(entry));
    }

    if (!emailAddresses.length && clerkData.emailAddress) {
      const email = normalizeEmailRecord({ email_address: clerkData.emailAddress, primary: true });
      if (email) {
        emailAddresses = [email];
      }
    }

    return {
      id: clerkData.id,
      email_addresses: emailAddresses,
      primary_email_address_id: primaryId,
      first_name: clerkData.first_name ?? clerkData.firstName ?? '',
      last_name: clerkData.last_name ?? clerkData.lastName ?? '',
      created_at: clerkData.created_at ?? clerkData.createdAt ?? new Date().toISOString(),
      updated_at: clerkData.updated_at ?? clerkData.updatedAt ?? new Date().toISOString(),
      public_metadata: clerkData.public_metadata ?? clerkData.publicMetadata ?? {},
      unsafe_metadata: clerkData.unsafe_metadata ?? clerkData.unsafeMetadata ?? {},
    };
  }

  private extractPrimaryEmail(
    emailAddresses: Array<{ id: string | null; email_address: string | null; primary: boolean }>,
    primaryId?: string | null,
  ): string | null {
    if (!Array.isArray(emailAddresses) || emailAddresses.length === 0) {
      return null;
    }

    let target = emailAddresses.find(address => address.primary);
    if (!target && primaryId) {
      target = emailAddresses.find(address => address.id === primaryId);
    }
    if (!target) {
      target = emailAddresses[0];
    }
    return target?.email_address ?? null;
  }

  private resolveRoleFromMetadata(publicMetadata: Record<string, any>, unsafeMetadata: Record<string, any>): UserRole {
    const candidates = [
      publicMetadata?.role,
      unsafeMetadata?.pendingRole,
      unsafeMetadata?.role,
      unsafeMetadata?.signupType,
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'string') {
        continue;
      }
      const normalized = candidate.toUpperCase();
      switch (normalized) {
        case 'SUPER_ADMIN':
          return UserRole.SUPER_ADMIN;
        case 'ADMIN':
          return UserRole.ADMIN;
        case 'FOUNDATION':
          return UserRole.FOUNDATION;
        case 'PRODUCT_SUPPLIER':
        case 'SUPPLIER':
          return UserRole.PRODUCT_SUPPLIER;
        case 'SERVICE_PROVIDER':
          return UserRole.SERVICE_PROVIDER;
        case 'EDUCATOR':
          return UserRole.EDUCATOR;
        case 'PARENT':
          return UserRole.PARENT;
        default:
          break;
      }
    }

    return UserRole.PARENT;
  }

  private ensureClerkClient() {
    if (!this.clerkClient) {
      throw new Error('Clerk client is not configured. Set CLERK_SECRET_KEY to enable syncing.');
    }
    return this.clerkClient;
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

    return this.buildUserResponse(appUser);
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
    const users = appUsers.map(appUser => this.buildUserResponse(appUser));

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
    return this.buildUserResponse(appUser);
  }

  async findOne(id: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
    });

    if (!appUser) {
      throw new NotFoundException('User not found');
    }

    return this.buildUserResponse(appUser);
  }

  async findByEmail(email: string) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { email },
    });

    if (!appUser) {
      return null;
    }

    return this.buildUserResponse(appUser);
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
        isActive: true,
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

    return this.buildUserResponse(updatedAppUser);
  }

  async assignRole(userId: string, role: UserRole) {
    const updatedAppUser = await this.prisma.appUser.update({
      where: { id: userId },
      data: { role },
    });

    return this.buildUserResponse(updatedAppUser);
  }

  async removeRole(userId: string, role: UserRole) {
    // Note: This could set to a default role instead of removing
    const updatedAppUser = await this.prisma.appUser.update({
      where: { id: userId },
      data: { role: UserRole.PARENT }, // Default role
    });

    return this.buildUserResponse(updatedAppUser);
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

    return this.buildUserResponse(deletedAppUser);
  }

  // Sync user with Clerk webhook
  async syncWithClerk(clerkPayload: any) {
    const normalized = this.normalizeClerkPayload(clerkPayload);
    const email = this.extractPrimaryEmail(normalized.email_addresses, normalized.primary_email_address_id);
    const role = this.resolveRoleFromMetadata(
      normalized.public_metadata || {},
      normalized.unsafe_metadata || {},
    );

    const createData: any = {
      clerkId: normalized.id,
      role,
    };

    if (email) {
      createData.email = email;
    }

    if (normalized.created_at) {
      createData.createdAt = new Date(normalized.created_at);
    }

    try {
      const updatedAppUser = await this.prisma.appUser.upsert({
        where: { clerkId: normalized.id },
        update: {
          role,
          email: email ?? undefined,
        },
        create: createData,
      });

      return this.buildUserResponse(updatedAppUser);
    } catch (error) {
      this.logger.error(`Failed to sync Clerk user ${normalized.id}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async syncCurrentUser(clerkId: string) {
    const client = this.ensureClerkClient();

    try {
      const clerkUser = await client.users.getUser(clerkId);
      return this.syncWithClerk(clerkUser);
    } catch (error: any) {
      this.logger.error(`Failed to fetch Clerk user ${clerkId} for sync`, error);
      if (error?.status === 404) {
        throw new NotFoundException('Clerk user not found');
      }
      throw error;
    }
  }
}
