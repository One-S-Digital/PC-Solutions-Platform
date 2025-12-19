/**
 * User roles
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

/**
 * User interface (safe for frontend - no sensitive data)
 */
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User profile (extended info)
 */
export interface UserProfile extends User {
  phoneNumber?: string;
  region?: string;
  preferredLanguage?: string;
  organizationIds: string[];
}

/**
 * Create user payload
 */
export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
}

/**
 * Update user payload
 */
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  region?: string;
  preferredLanguage?: string;
  isActive?: boolean;
}
