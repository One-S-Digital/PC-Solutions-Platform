import { useAdminRoleContext } from '../components/auth/AdminAuthComponents';
import { UserRole } from '../types';

export interface AdminRoleInfo {
  adminRole: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

/**
 * Returns the currently authenticated admin's role from the route-level context.
 * Must be used inside AdminProtectedRoute.
 */
export function useAdminRole(): AdminRoleInfo {
  const { adminRole, isSuperAdmin } = useAdminRoleContext();
  return {
    adminRole,
    isSuperAdmin,
    isAdmin: adminRole === UserRole.ADMIN,
  };
}
