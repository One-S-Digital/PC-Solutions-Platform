import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from '../guards/policies.guard';

/**
 * Decorator to define CASL policies for endpoints
 * 
 * Usage:
 * @CheckPolicies(
 *   (ability) => ability.can('create', 'PolicyAlert'),
 *   (ability) => ability.can('read', 'Organization')
 * )
 * 
 * Multiple handlers are AND'ed together (all must pass)
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata('policies', handlers);
