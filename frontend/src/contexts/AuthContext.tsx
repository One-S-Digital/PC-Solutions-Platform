import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { apiCall } from '../utils/api';
type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  organizationName?: string;
  avatarUrl?: string;
  [key: string]: any;
};

const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FOUNDATION: 'FOUNDATION',
  PRODUCT_SUPPLIER: 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  EDUCATOR: 'EDUCATOR',
  PARENT: 'PARENT',
} as const;
type UserRole = (typeof UserRole)[keyof typeof UserRole];

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<AuthUser>) => Promise<boolean>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isProfileComplete: boolean;
  profileCompletionPercentage: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut, getToken } = useAuth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate profile completion
  const calculateProfileCompletion = useCallback((userData: AuthUser): number => {
    const requiredFields = [
      'name',
      'email',
      'role',
      'phone',
      'address',
      'organizationName',
      'avatarUrl'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = userData[field as keyof AuthUser];
      return value && value.toString().trim() !== '';
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }, []);

  // Check if profile is complete
  const isProfileComplete = user ? calculateProfileCompletion(user) >= 80 : false;
  const profileCompletionPercentage = user ? calculateProfileCompletion(user) : 0;

  // Role and permission checks
  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    
    // Define role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'], // All permissions
      [UserRole.ADMIN]: [
        'users.manage',
        'content.manage',
        'analytics.view',
        'system.monitor',
        'subscriptions.manage'
      ],
      [UserRole.FOUNDATION]: [
        'children.manage',
        'educators.recruit',
        'orders.place',
        'leads.view',
        'analytics.view'
      ],
      [UserRole.PRODUCT_SUPPLIER]: [
        'products.manage',
        'orders.process',
        'inventory.manage',
        'analytics.view'
      ],
      [UserRole.SERVICE_PROVIDER]: [
        'services.manage',
        'requests.process',
        'bookings.manage',
        'analytics.view'
      ],
      [UserRole.EDUCATOR]: [
        'profile.manage',
        'jobs.apply',
        'applications.view',
        'files.upload'
      ],
      [UserRole.PARENT]: [
        'enquiries.submit',
        'enquiries.view',
        'support.access'
      ]
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [user]);

  // Fetch user data from API
  const fetchUserData = useCallback(async () => {
    if (!clerkUser || !clerkLoaded) return;

    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Add error handling for API calls
      const response = await apiCall('/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch((fetchError) => {
        console.warn('API not available, using Clerk data only:', fetchError);
        return null;
      });

      if (response && response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else if (response && response.status === 404) {
        // User doesn't exist in our system, create from Clerk data
        await createUserFromClerk();
      } else {
        // API not available or error, use Clerk data directly
        console.warn('API not available, using Clerk data only');
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          role: (clerkUser.publicMetadata?.role as UserRole) || UserRole.PARENT,
          phone: clerkUser.phoneNumbers[0]?.phoneNumber,
          avatarUrl: clerkUser.imageUrl,
          ...clerkUser.publicMetadata
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to Clerk data
      setUser({
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: (clerkUser.publicMetadata?.role as UserRole) || UserRole.PARENT,
        phone: clerkUser.phoneNumbers[0]?.phoneNumber,
        avatarUrl: clerkUser.imageUrl,
        ...clerkUser.publicMetadata
      });
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser, clerkLoaded, getToken]);

  // Create user from Clerk data
  const createUserFromClerk = useCallback(async () => {
    if (!clerkUser) return;

    try {
      const token = await getToken();
      const userData = {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
        avatarUrl: clerkUser.imageUrl,
        role: clerkUser.publicMetadata?.role || UserRole.PARENT,
        phone: clerkUser.phoneNumbers[0]?.phoneNumber,
        // Add other fields from Clerk metadata
        ...clerkUser.publicMetadata
      };

      const response = await apiCall('/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      }).catch((fetchError) => {
        console.warn('API not available for user creation:', fetchError);
        return null;
      });

      if (response && response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        console.warn('Failed to create user, using Clerk data directly');
        // Fallback to Clerk data
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          role: (clerkUser.publicMetadata?.role as UserRole) || UserRole.PARENT,
          phone: clerkUser.phoneNumbers[0]?.phoneNumber,
          avatarUrl: clerkUser.imageUrl,
          ...clerkUser.publicMetadata
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      // Fallback to Clerk data
      setUser({
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: (clerkUser.publicMetadata?.role as UserRole) || UserRole.PARENT,
        phone: clerkUser.phoneNumbers[0]?.phoneNumber,
        avatarUrl: clerkUser.imageUrl,
        ...clerkUser.publicMetadata
      });
    }
  }, [clerkUser, getToken]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: Partial<AuthUser>): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await getToken();
      const response = await apiCall(`/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
        return true;
      } else {
        console.error('Failed to update user profile:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }, [user, getToken]);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    fetchUserData();
  }, [clerkUser, clerkLoaded, fetchUserData]);

  const signOut = async () => {
    try {
      await clerkSignOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshUser,
        updateUserProfile,
        hasRole,
        hasAnyRole,
        hasPermission,
        isProfileComplete,
        profileCompletionPercentage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
