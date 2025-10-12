import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@workspace/types';
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
      
      // Determine role from Clerk metadata - NO DEFAULT
      const role = this.deriveRoleFromClerkPayload(payload);
      
      if (!role) {
        // If no role can be determined, we cannot create/update the user
        this.logger.error(`Cannot sync user ${payload.sub}: No valid role in Clerk metadata`);
        throw new Error('No valid role assigned in Clerk. User sync aborted.');
      }
      
      if (existingUser) {
        // Update existing user
        return this.updateUser(payload.sub, {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: role,
        });
      } else {
        // Create new user
        return this.createUser({
          clerkId: payload.sub,
          email: payload.email,
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          role: role,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to sync user from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Derive user role from Clerk payload using the same logic as ClerkAuthService
   * This ensures consistency across the application
   */
  private deriveRoleFromClerkPayload(payload: ClerkJwtPayload): UserRole | null {
    // Check publicMetadata first (most authoritative)
    if (payload.publicMetadata?.role && this.isValidUserRole(payload.publicMetadata.role)) {
      return payload.publicMetadata.role;
    }
    
    // Check direct role claim
    if (payload.role && this.isValidUserRole(payload.role)) {
      return payload.role;
    }
    
    // Check organization role
    if (payload.orgRole && this.isValidUserRole(payload.orgRole)) {
      return payload.orgRole;
    }
    
    // No valid role found
    return null;
  }

  private isValidUserRole(role: any): role is UserRole {
    return Object.values(UserRole).includes(role);
  }

  async deleteUser(clerkId: string) {
    try {
      // Soft delete by setting deletedAt
      const user = await this.prisma.user.update({
        where: { clerkId },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`User soft deleted: ${user.email} (${user.id})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}