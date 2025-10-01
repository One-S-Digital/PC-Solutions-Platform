import React from 'react';
import { ClerkProvider as ClerkProviderBase, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { authService } from '../../services/auth';
import { UserRole } from '../../services/types';

interface ClerkProviderProps {
  children: React.ReactNode;
}

// Component to sync Clerk auth state with our auth service
const AuthSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();

  React.useEffect(() => {
    if (!isLoaded) return;

    const syncAuth = async () => {
      if (isSignedIn && clerkUser) {
        try {
          const token = await getToken();
          if (token) {
            // Update API client with token
            authService.updateAuthToken(token);
            
            // Get user role from Clerk metadata
            const role = clerkUser.publicMetadata?.role as UserRole;
            
            if (role) {
              // Create user object from Clerk data
              const user = {
                id: clerkUser.id,
                clerkId: clerkUser.id,
                email: clerkUser.primaryEmailAddress?.emailAddress || '',
                firstName: clerkUser.firstName || '',
                lastName: clerkUser.lastName || '',
                role,
                phoneNumber: clerkUser.phoneNumbers[0]?.phoneNumber,
                isActive: true,
                createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: clerkUser.updatedAt?.toISOString() || new Date().toISOString(),
              };

              // Update auth service state
              authService.setAuthState({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              console.warn('No role found in Clerk metadata');
              authService.setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'No role assigned',
              });
            }
          }
        } catch (error) {
          console.error('Auth sync error:', error);
          authService.setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication failed',
          });
        }
      } else {
        // User is signed out
        authService.setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    syncAuth();
  }, [isSignedIn, isLoaded, clerkUser, getToken]);

  return <>{children}</>;
};

export const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error('VITE_CLERK_PUBLISHABLE_KEY is not set');
    return <>{children}</>;
  }

  return (
    <ClerkProviderBase publishableKey={publishableKey}>
      <AuthSync>
        {children}
      </AuthSync>
    </ClerkProviderBase>
  );
};

export default ClerkProvider;