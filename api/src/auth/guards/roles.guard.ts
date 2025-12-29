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
    
    // Development mode bypass (keeping for now)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && !userContext) {
      console.log('🔧 Development mode: Bypassing roles guard for', request.url);
      return true;
    }
    
    // Debug
     
    console.log('🔐 RolesGuard Debug:', {
      url: request.url,
      requiredRoles,
      allowPending,
      hasContext: !!userContext,
      context: userContext,
      isDevelopment,
    });

    if (!userContext) {
      throw new ForbiddenException('User context not found');
    }

    if (!userContext.role) {
      throw new ForbiddenException('User role not found');
    }

    // 5. Handle pending users - only allow if route is marked with @AllowPending()
    if (userContext.role === 'PENDING' || userContext.isPending) {
      if (allowPending) {
        console.log('🔐 RolesGuard: Allowing pending user access to @AllowPending() route:', request.url);
        return true;
      } else {
        console.log('🚫 RolesGuard: Pending user denied access to', request.url);
        throw new ForbiddenException('Account is being processed. Please wait a moment and refresh.');
      }
    }

    // 6. Handle suspended users
    if (userContext.role === 'SUSPENDED' || userContext.isSuspended) {
      throw new ForbiddenException('Account is suspended');
    }

    const hasRole = requiredRoles.includes(userContext.role as UserRole);
    
    if (!hasRole) {
      console.log('🚫 RolesGuard: Access denied', {
        url: request.url,
        requiredRoles,
        userRole: userContext.role,
        userId: userContext.userId,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}