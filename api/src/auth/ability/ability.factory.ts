import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { UserRole } from '@prisma/client';

// Define actions
export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';

// Define subjects (resource types)
export type Subjects = 
  | 'PolicyAlert' 
  | 'ContentItem' 
  | 'AppUser' 
  | 'PlatformSettings'
  | 'Organization'
  | 'Course'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface AppUser {
  id: string;
  role: UserRole;
  organizationIds?: string[];
}

/**
 * CASL Ability Factory
 * Defines fine-grained permissions based on user roles
 */
@Injectable()
export class AbilityFactory {
  defineFor(user: AppUser): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Super Admin - Full access to everything
    if (user.role === UserRole.SUPER_ADMIN) {
      can('manage', 'all');
      return build();
    }

    // Admin - Broad access with some restrictions
    if (user.role === UserRole.ADMIN) {
      // Policy Alerts
      can('read', 'PolicyAlert');
      can('create', 'PolicyAlert');
      can('update', 'PolicyAlert'); // Can update all in assigned regions
      can('delete', 'PolicyAlert'); // Restricted to own in service layer

      // Content Management
      can('read', 'ContentItem');
      can('create', 'ContentItem');
      can('update', 'ContentItem');
      can('delete', 'ContentItem');

      // User Management (within own organization)
      can('read', 'AppUser');
      can('create', 'AppUser');
      can('update', 'AppUser');
      cannot('delete', 'AppUser'); // Only SUPER_ADMIN can delete users
      cannot('read', 'AppUser', ['password']); // Cannot see passwords

      // Organization (own only)
      can('read', 'Organization');
      can('update', 'Organization'); // Own org only (enforced in service)

      // Courses
      can('read', 'Course');
      can('create', 'Course');
      can('update', 'Course');
      can('delete', 'Course');

      // Platform Settings (read only)
      can('read', 'PlatformSettings');
      cannot('update', 'PlatformSettings'); // Only SUPER_ADMIN
      cannot('delete', 'PlatformSettings');

      return build();
    }

    // Educator - Limited content access
    if (user.role === UserRole.EDUCATOR) {
      // Read-only content access
      can('read', 'ContentItem');
      can('read', 'Course');

      // Own profile management
      can('read', 'AppUser'); // Will be filtered to own profile in service
      can('update', 'AppUser'); // Can update own profile only

      // No access to policies, platform settings, or other users
      cannot('read', 'PolicyAlert');
      cannot('read', 'PlatformSettings');

      return build();
    }

    // Parent - Very limited access
    if (user.role === UserRole.PARENT) {
      // Read own profile only
      can('read', 'AppUser'); // Filtered to self in service
      can('update', 'AppUser'); // Own profile only

      // Read assigned content
      can('read', 'ContentItem'); // Filtered to assigned/public content
      can('read', 'Course'); // Filtered to enrolled courses

      return build();
    }

    // Foundation, Supplier, Service Provider - Similar to Parent with extended access
    if ([UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(user.role)) {
      can('read', 'AppUser'); // Own profile + org members
      can('update', 'AppUser'); // Own profile

      can('read', 'Organization'); // Own org
      can('update', 'Organization'); // Own org

      can('read', 'ContentItem'); // Public + org content
      can('read', 'Course'); // Available courses

      return build();
    }

    // Default: No permissions
    return build();
  }

  /**
   * Check if user can perform action on subject
   */
  canUser(user: AppUser, action: Actions, subject: Subjects): boolean {
    const ability = this.defineFor(user);
    return ability.can(action, subject);
  }
}
