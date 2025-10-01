import { useState, useEffect } from 'react';
import { authService, AuthState, User, UserRole } from '../services/auth';

// Custom hook for authentication state
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  return {
    ...authState,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    signup: authService.signup.bind(authService),
    refreshToken: authService.refreshToken.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    isAdmin: authService.isAdmin.bind(authService),
    isFoundation: authService.isFoundation.bind(authService),
    isEducator: authService.isEducator.bind(authService),
    isParent: authService.isParent.bind(authService),
    isSupplier: authService.isSupplier.bind(authService),
    isServiceProvider: authService.isServiceProvider.bind(authService),
  };
};

// Hook for checking specific roles
export const useRole = (role: UserRole) => {
  const { user, hasRole } = useAuth();
  return hasRole(role);
};

// Hook for checking multiple roles
export const useRoles = (roles: UserRole[]) => {
  const { user, hasAnyRole } = useAuth();
  return hasAnyRole(roles);
};

// Hook for admin check
export const useIsAdmin = () => {
  const { isAdmin } = useAuth();
  return isAdmin();
};

// Hook for current user
export const useCurrentUser = (): User | null => {
  const { user } = useAuth();
  return user;
};

export default useAuth;