import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth, ClerkProvider } from '@clerk/clerk-react';
import { User, UserRole } from '../types';
import { API_ENDPOINTS } from '../services/api-endpoints';
import { ApiError } from '../services/api';

const BACKEND_SYNC_ERROR_MESSAGE = "We couldn't load your account details. Please try again.";
const BACKEND_USER_CREATION_ERROR_MESSAGE = 'Backend user creation failed. Please ensure Clerk webhook is configured.';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  signup: (formData: any, role: any) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { getToken, signOut: clerkSignOut } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = !!clerkUser;

  // Sync user data when Clerk user changes
  useEffect(() => {
    const syncUser = async () => {
      if (!clerkIsLoaded) {
        setIsLoading(true);
        return;
      }

      if (!clerkUser) {
        setCurrentUser(null);
        setAuthError(null);
        setIsLoading(false);
        return;
      }

      try {
        // Sync user with backend API
        await syncUserWithBackend(clerkUser, getToken);
        setAuthError(null);
      } catch (error) {
        console.error('Failed to sync user with backend:', error);

        // Don't create fallback users - show error state
        // Backend connection is required for proper user data
        setCurrentUser(null);

        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage !== BACKEND_USER_CREATION_ERROR_MESSAGE) {
          setAuthError(BACKEND_SYNC_ERROR_MESSAGE);
        }

        // Log error for debugging
        console.error('Unable to load user profile. Backend connection required.');

        // TODO: Show error notification to user
        // For now, the app will redirect to login via ProtectedRoute
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [clerkUser, clerkIsLoaded, getToken]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    // Clerk handles authentication, this is just for compatibility
    setAuthError(null);
    return { success: true };
  };

  const logout = async () => {
    try {
      // Clear local user state first
      setCurrentUser(null);
      setAuthError(null);

      // Properly sign out from Clerk
      await clerkSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Clerk signOut fails
      setCurrentUser(null);
    }
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
        setAuthError(null);
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
        setAuthError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setAuthError(BACKEND_SYNC_ERROR_MESSAGE);
      throw error;
    }
  };

  // Create user in backend when they don't exist
  const createUserInBackend = async (clerkUser: any, getToken: () => Promise<string | null>) => {
    // User should be auto-created by backend Clerk webhook
    // If user doesn't exist yet, wait and retry
    console.log('User not found in backend. Waiting for webhook to create user...');
    
    // Wait 2 seconds for webhook to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to fetch user again
    try {
      await syncUserWithBackend(clerkUser, getToken);
    } catch (error) {
      console.error('User still not found after webhook wait. Backend webhook may not be configured.');

      // Don't create fallback - require backend connection
      setCurrentUser(null);
      setAuthError(BACKEND_USER_CREATION_ERROR_MESSAGE);
      throw new Error(BACKEND_USER_CREATION_ERROR_MESSAGE);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        isAuthenticated,
        authError,
        clearAuthError: () => setAuthError(null),
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
