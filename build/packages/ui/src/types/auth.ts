// Shared types for the application
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string;
}