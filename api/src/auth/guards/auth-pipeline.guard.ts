import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Composite guard that chains Clerk authentication and role-based authorization
 * 
 * Usage:
 * @UseGuards(AuthPipelineGuard)
 * @Roles(UserRole.ADMIN)
 * 
 * This replaces the need to use both @UseGuards(ClerkAuthGuard, RolesGuard)
 */
@Injectable()
export class AuthPipelineGuard implements CanActivate {
  constructor(
    private readonly clerkGuard: ClerkAuthGuard,
    private readonly rolesGuard: RolesGuard,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Validate JWT with Clerk
    try {
      const authenticated = await this.clerkGuard.canActivate(context);
      if (!authenticated) {
        throw new UnauthorizedException('Invalid or missing authentication token');
      }
    } catch (error) {
      // Re-throw with clear message
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed: ' + error.message);
    }

    // Step 2: Check roles (reads req.user from context set by ClerkAuthGuard)
    try {
      const authorized = await this.rolesGuard.canActivate(context);
      if (!authorized) {
        const request = context.switchToHttp().getRequest();
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        throw new ForbiddenException(
          `Insufficient permissions. Required roles: ${requiredRoles?.join(', ') || 'none specified'}`
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Authorization failed: ' + error.message);
    }

    return true;
  }
}
