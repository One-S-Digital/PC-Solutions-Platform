import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@repo/types';
import { ClerkJwtPayload } from './clerk-auth.service';

export interface CreateUserDto {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUser(userData: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          clerkId: userData.clerkId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
      });

      this.logger.log(`User created: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async updateUser(clerkId: string, userData: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { clerkId },
        data: userData,
      });

      this.logger.log(`User updated: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async findUserByClerkId(clerkId: string) {
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

  async findUserByEmail(email: string) {
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

  async syncUserFromClerk(payload: ClerkJwtPayload) {
    try {
      const existingUser = await this.findUserByClerkId(payload.sub);
      
      if (existingUser) {
        // Update existing user
        return this.updateUser(payload.sub, {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
        });
      } else {
        // Create new user
        return this.createUser({
          clerkId: payload.sub,
          email: payload.email,
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          role: payload.role || UserRole.PARENT, // Default role
        });
      }
    } catch (error) {
      this.logger.error(`Failed to sync user from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}