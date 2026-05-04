import React from 'react';
import { useAdminRole } from '../hooks/useAdminRole';
import { UserRole } from '../types';

interface PermissionGateProps {
  /** Role(s) required to render children. */
  role: UserRole | UserRole[];
  /** Rendered when the caller lacks the required role. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on the currently logged-in admin's role.
 * Wrap any SUPER_ADMIN-only UI sections with this component.
 *
 * @example
 * <PermissionGate role={UserRole.SUPER_ADMIN}>
 *   <DangerousSection />
 * </PermissionGate>
 */
export function PermissionGate({ role, fallback = null, children }: PermissionGateProps) {
  const { adminRole } = useAdminRole();
  const required = Array.isArray(role) ? role : [role];

  if (!adminRole || !required.includes(adminRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
