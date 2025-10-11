import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory, AppAbility } from '../ability/ability.factory';

export type PolicyHandler = (ability: AppAbility) => boolean;

/**
 * Guard that checks CASL policies defined via @CheckPolicies decorator
 * 
 * Usage:
 * @UseGuards(AuthPipelineGuard, PoliciesGuard)
 * @CheckPolicies((ability) => ability.can('create', 'PolicyAlert'))
 * createAlert() { ... }
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private abilityFactory: AbilityFactory,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get policy handlers from @CheckPolicies decorator
    const policyHandlers = this.reflector.get<PolicyHandler[]>(
      'policies',
      context.getHandler()
    ) || [];

    // If no policies defined, allow access (fallback to role guards)
    if (policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User should be set by auth guard
    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Build ability for user
    const ability = this.abilityFactory.defineFor(user);

    // Check all policy handlers
    const allowed = policyHandlers.every((handler) => {
      try {
        return handler(ability);
      } catch (error) {
        return false;
      }
    });

    if (!allowed) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
