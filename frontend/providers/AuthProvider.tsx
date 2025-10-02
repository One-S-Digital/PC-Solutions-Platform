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
        // For now, create a mock user from Clerk data
        // This will be replaced with actual API calls later
        const mockUser: User = {
          id: clerkUser.id,
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          role: 'PARENT', // Default role
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
        
        setCurrentUser(mockUser);
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

  // If no Clerk key is provided, use a mock auth provider
  if (!publishableKey) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </ClerkProvider>
  );
};

// Mock auth provider for development without Clerk
const MockAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to determine role based on email
  const getRoleFromEmail = (email: string): UserRole => {
    const emailLower = email.toLowerCase();
    if (emailLower.includes('foundation')) return UserRole.FOUNDATION;
    if (emailLower.includes('supplier')) return UserRole.PRODUCT_SUPPLIER;
    if (emailLower.includes('service')) return UserRole.SERVICE_PROVIDER;
    if (emailLower.includes('educator')) return UserRole.EDUCATOR;
    if (emailLower.includes('admin')) return UserRole.ADMIN;
    if (emailLower.includes('parent')) return UserRole.PARENT;
    
    // Default to parent for unknown emails
    return UserRole.PARENT;
  };

  // Function to create mock user based on role
  const createMockUser = (email: string, role?: UserRole): User => {
    const userRole = role || getRoleFromEmail(email);
    const [firstName, lastName] = email.split('@')[0].split('.');
    
    return {
      id: `mock-user-${userRole.toLowerCase()}`,
      clerkId: `mock-clerk-${userRole.toLowerCase()}`,
      email: email,
      firstName: firstName || 'Mock',
      lastName: lastName || 'User',
      role: userRole,
      certifications: [],
      skills: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: `${firstName || 'Mock'} ${lastName || 'User'}`,
      status: 'Active',
      lastLogin: new Date().toISOString(),
      memberSince: new Date().toISOString(),
    };
  };

  const mockAuthContext: AuthContextType = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login: async (email: string, password?: string) => {
      // Mock login - create a user based on email
      const mockUser = createMockUser(email);
      setCurrentUser(mockUser);
      return { success: true };
    },
    logout: () => {
      setCurrentUser(null);
    },
    signup: async (formData: any, role: any) => {
      // Mock signup - create a user with the specified role
      const mockUser = createMockUser(formData.email, role);
      setCurrentUser(mockUser);
      return { success: true };
    },
    updateCurrentUserInfo: async (updatedInfo: Partial<User>) => {
      if (currentUser) {
        setCurrentUser({ ...currentUser, ...updatedInfo });
      }
    },
  };

  return (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
