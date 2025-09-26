import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userContext = request.context;
    
    // Development mode bypass
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && !userContext) {
      console.log('🔧 Development mode: Bypassing roles guard for', request.url);
      return true;
    }
    
    // Debug
    // eslint-disable-next-line no-console
    console.log('🔐 RolesGuard Debug:', {
      url: request.url,
      requiredRoles,
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