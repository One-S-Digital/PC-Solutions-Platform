import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth, ClerkProvider } from '@clerk/clerk-react';
import { User, UserRole } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';
import { ApiError } from '../services/api';

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
        await syncUserWithBackend(clerkUser, getToken);
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
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [clerkUser, clerkIsLoaded, getToken]);

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
      const token = await getToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiBaseUrl}${API_ENDPOINTS.users.update}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(updatedInfo),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const transformedUser = {
          ...data.data,
          name: `${data.data.firstName} ${data.data.lastName}`,
          status: data.data.isActive ? 'Active' : 'Inactive',
          lastLogin: data.data.lastActiveAt,
          memberSince: data.data.createdAt,
        };
        setCurrentUser(transformedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  // Sync user with backend API
  const syncUserWithBackend = async (clerkUser: any, getToken: () => Promise<string | null>) => {
    try {
      const token = await getToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiBaseUrl}${API_ENDPOINTS.users.me}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User doesn't exist in backend, create them
          await createUserInBackend(clerkUser, getToken);
          return;
        }
        throw new ApiError('Failed to fetch user', response.status);
      }

      const data = await response.json();
      if (data.success && data.data) {
        const transformedUser = {
          ...data.data,
          name: `${data.data.firstName} ${data.data.lastName}`,
          status: data.data.isActive ? 'Active' : 'Inactive',
          lastLogin: data.data.lastActiveAt,
          memberSince: data.data.createdAt,
        };
        setCurrentUser(transformedUser);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  };

  // Create user in backend when they don't exist
  const createUserInBackend = async (clerkUser: any, getToken: () => Promise<string | null>) => {
    const newUserData = {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      role: UserRole.PARENT, // Default role, can be updated later
    };

    try {
      // User will be auto-created by backend webhook
      // Just create a local fallback for now
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
