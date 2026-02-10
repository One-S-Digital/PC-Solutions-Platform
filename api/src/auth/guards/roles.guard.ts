import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_PENDING_KEY } from '../decorators/allow-pending.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // 1. Allow OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    // 2. Check if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    // 3. Check if route allows pending users via @AllowPending()
    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // 4. Check required roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userContext = request.context;

    if (!userContext) {
      throw new ForbiddenException('User context not found');
    }

    if (!userContext.role) {
      throw new ForbiddenException('User role not found');
    }

    // 5. Handle pending users - only allow if route is marked with @AllowPending()
    if (userContext.role === 'PENDING' || userContext.isPending) {
      if (allowPending) {
        return true;
      } else {
        throw new ForbiddenException('Account is being processed. Please wait a moment and refresh.');
      }
    }

    // 6. Handle suspended users
    if (userContext.role === 'SUSPENDED' || userContext.isSuspended) {
      throw new ForbiddenException(userContext.suspensionMessage || 'Account is suspended');
    }

    const hasRole = requiredRoles.includes(userContext.role as UserRole);
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}