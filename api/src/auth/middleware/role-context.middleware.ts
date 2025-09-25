import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const clerkUserId = req.clerk?.userId;
    
    if (!clerkUserId) {
      // Skip for public routes
      return next();
    }

    try {
      // Fetch user from AppUser table
      let appUser = await this.prisma.appUser.findUnique({
        where: { clerkUserId },
      });

      if (!appUser) {
        // Self-heal: create baseline user
        appUser = await this.prisma.appUser.create({
          data: { 
            clerkUserId,
            role: 'PARENT', // Safe default
          },
        });

        // Also create outbox entry to sync to Clerk
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
}