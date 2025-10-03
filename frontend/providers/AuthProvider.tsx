import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth, ClerkProvider } from '@clerk/clerk-react';
import { User, UserRole } from '../types';
import { userService } from '../services';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  signup: (formData: any, role: any) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { getToken } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!currentUser && !!clerkUser;

  // Sync user data when Clerk user changes
  useEffect(() => {
    const syncUser = async () => {
      if (!clerkIsLoaded) {
        setIsLoading(true);
        return;
      }

      if (!clerkUser) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Sync user with backend API
        await this.syncUserWithBackend(clerkUser);
      } catch (error) {
        console.error('Failed to sync user with backend:', error);
        
        // Fallback to creating a basic user from Clerk data if backend is unavailable
        const fallbackUser: User = {
          id: clerkUser.id,
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          role: UserRole.PARENT, // Default role
          certifications: [],
          skills: [],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Legacy fields for UI compatibility
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          status: 'Active',
          lastLogin: new Date().toISOString(),
          memberSince: new Date().toISOString(),
        };
        
        setCurrentUser(fallbackUser);
      } catch (error) {
        console.error('Failed to sync user:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [clerkUser, clerkIsLoaded]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    // Clerk handles authentication, this is just for compatibility
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    // Clerk will handle the actual logout
  };

  const signup = async (formData: any, role: any): Promise<{ success: boolean; message?: string; redirectTo?: string }> => {
    // Clerk handles signup, this is just for compatibility
    return { success: true };
  };

  const updateCurrentUserInfo = async (updatedInfo: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = await userService.updateCurrentUser(updatedInfo);
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  // Sync user with backend API
  const syncUserWithBackend = async (clerkUser: any) => {
    try {
      // Try to get existing user from backend
      const backendUser = await userService.getCurrentUser();
      setCurrentUser(backendUser);
    } catch (error) {
      // If user doesn't exist in backend, create them
      if (error.status === 404) {
        await createUserInBackend(clerkUser);
      } else {
        throw error;
      }
    }
  };

  // Create user in backend when they don't exist
  const createUserInBackend = async (clerkUser: any) => {
    const newUserData = {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      role: UserRole.PARENT, // Default role, can be updated later
    };

    try {
      // This would typically call an API endpoint to create the user
      // For now, create a local user that will be synced when backend is available
      const createdUser: User = {
        ...newUserData,
        id: clerkUser.id,
        certifications: [],
        skills: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: `${newUserData.firstName} ${newUserData.lastName}`.trim(),
        status: 'Active',
        lastLogin: new Date().toISOString(),
        memberSince: new Date().toISOString(),
      };
      
      setCurrentUser(createdUser);
    } catch (error) {
      console.error('Failed to create user in backend:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated,
        login,
        logout,
        signup,
        updateCurrentUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'VITE_CLERK_PUBLISHABLE_KEY is required. Please set up Clerk authentication in your environment variables.'
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </ClerkProvider>
  );
};

// MockAuthProvider removed for production - Clerk authentication required

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
