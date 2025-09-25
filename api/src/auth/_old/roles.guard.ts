import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/types';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    console.log('🔧 RolesGuard Debug:', {
      url: request.url,
      method: request.method,
      requiredRoles,
      userExists: !!user,
      userRole: user?.role,
      userId: user?.id,
      userEmail: user?.email,
    });
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      console.error('❌ User has no role assigned:', {
        userId: user.id,
        email: user.email,
      });
      throw new ForbiddenException('User role not found');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    console.log('🔧 Role check:', {
      userRole: user.role,
      requiredRoles,
      hasRole,
    });
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}