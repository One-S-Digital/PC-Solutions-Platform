import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      clerk?: {
        userId: string;
      };
      context?: {
        userId: string;
        role: string;
        appUserId: string;
      };
    }
  }
}

@Injectable()
export class RoleContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RoleContextMiddleware.name);
  private clerkClient: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (secretKey) {
      this.clerkClient = createClerkClient({ secretKey });
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const clerkUserId = req.clerk?.userId;
    
    if (!clerkUserId) {
      // Skip for public routes
      return next();
    }

    try {
      // Fetch user from AppUser table
      let appUser = await this.prisma.appUser.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (!appUser) {
        this.logger.warn(`AppUser not found for ${clerkUserId} in middleware - initiating self-healing`);
        
        // Determine role from Clerk metadata if possible
        let roleToAssign: UserRole = UserRole.PARENT;
        
        if (this.clerkClient) {
          try {
            const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
            const unsafeMetadata = clerkUser.unsafeMetadata || {};
            const publicMetadata = clerkUser.publicMetadata || {};
            const privateMetadata = clerkUser.privateMetadata || {};

            // Logic matching webhook controller
            const rawIntendedRole = 
              privateMetadata.intendedRole || 
              unsafeMetadata.role ||
              unsafeMetadata.pendingRole ||
              unsafeMetadata.signupType ||
              publicMetadata.role;

            if (rawIntendedRole) {
              const mappedRole = this.mapSignupRoleToUserRole(rawIntendedRole as string);
              this.logger.log(`Recovered role for ${clerkUserId} from Clerk metadata: ${mappedRole} (raw: ${rawIntendedRole})`);
              roleToAssign = mappedRole;
            }
          } catch (clerkError: any) {
            this.logger.error(`Failed to fetch user from Clerk during self-healing: ${clerkError.message}`);
          }
        }

        // Self-heal: create baseline user
        appUser = await this.prisma.appUser.create({
          data: {
            clerkId: clerkUserId,
            role: roleToAssign,
          },
        });

        this.logger.log(`Self-healed user ${clerkUserId} with role ${roleToAssign}`);

        // Also create outbox entry to sync to Clerk (if role was different)
        await this.prisma.outbox.create({
          data: {
            topic: 'mirror.role',
            payload: { clerkUserId, role: appUser.role },
          },
        });
      }

      // Attach context to request
      req.context = {
        userId: clerkUserId,
        role: appUser.role,
        appUserId: appUser.id,
      };

      next();
    } catch (error) {
      console.error('RoleContextMiddleware error:', error);
      throw new UnauthorizedException('Failed to load user context');
    }
  }

  private mapSignupRoleToUserRole(signupRole: string | null | undefined): UserRole {
    if (!signupRole) {
      return UserRole.PARENT;
    }

    const roleMap: Record<string, UserRole> = {
      'Foundation (Daycare)': UserRole.FOUNDATION,
      'Product Supplier': UserRole.PRODUCT_SUPPLIER,
      'Service Provider': UserRole.SERVICE_PROVIDER,
      'Educator/Candidate': UserRole.EDUCATOR,
      'Parent': UserRole.PARENT,
      // Also support already-mapped values
      'FOUNDATION': UserRole.FOUNDATION,
      'PRODUCT_SUPPLIER': UserRole.PRODUCT_SUPPLIER,
      'SERVICE_PROVIDER': UserRole.SERVICE_PROVIDER,
      'EDUCATOR': UserRole.EDUCATOR,
      'PARENT': UserRole.PARENT,
      // Fallbacks
      'Educator': UserRole.EDUCATOR,
    };

    return roleMap[signupRole] || UserRole.PARENT;
  }
}