import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { UserRole } from '@repo/types';

// Define AuthUser interface locally since it's not exported from @repo/types
interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut, getToken } = useAuth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('🔐 AuthProvider Initialization:', {
    timestamp: new Date().toISOString(),
    clerkLoaded,
    clerkUser: clerkUser ? 'PRESENT' : 'NULL',
    clerkUserId: clerkUser?.id,
  });

  useEffect(() => {
    console.log('🔐 AuthProvider useEffect triggered:', {
      timestamp: new Date().toISOString(),
      clerkLoaded,
      clerkUser: clerkUser ? 'PRESENT' : 'NULL',
    });

    if (!clerkLoaded) {
      console.log('🔐 Clerk not loaded yet, waiting...');
      return;
    }

    if (!clerkUser) {
      console.log('🔐 No Clerk user, setting user to null');
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Fetch user data from our API
    const fetchUserData = async () => {
      try {
        console.log('🔐 Fetching user data from API...', {
          timestamp: new Date().toISOString(),
          clerkUserId: clerkUser.id,
        });

        const token = await getToken();
        console.log('🔐 Got Clerk token:', {
          timestamp: new Date().toISOString(),
          tokenLength: token?.length || 0,
          tokenPrefix: token?.substring(0, 10) || 'NONE',
        });

        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const fullUrl = `${apiUrl}/users/me`;
        
        console.log('🔐 Making API request:', {
          timestamp: new Date().toISOString(),
          url: fullUrl,
          apiUrl,
          hasToken: !!token,
        });

        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🔐 API response received:', {
          timestamp: new Date().toISOString(),
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🔐 User data fetched successfully:', {
            timestamp: new Date().toISOString(),
            userId: data.data?.id,
            userEmail: data.data?.email,
            userRole: data.data?.role,
          });
          setUser(data.data);
        } else {
          const errorText = await response.text();
          console.error('🚨 Failed to fetch user data:', {
            timestamp: new Date().toISOString(),
            status: response.status,
            statusText: response.statusText,
            errorText,
            url: fullUrl,
          });
          setUser(null);
        }
      } catch (error) {
        console.error('🚨 Error fetching user data:', {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
          timestamp: new Date().toISOString(),
          clerkUserId: clerkUser.id,
        });
        setUser(null);
      } finally {
        console.log('🔐 Setting loading to false');
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [clerkUser, clerkLoaded, getToken]);

  const signOut = async () => {
    try {
      console.log('🔐 Signing out user...', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
      });
      await clerkSignOut();
      setUser(null);
      console.log('🔐 User signed out successfully');
    } catch (error) {
      console.error('🚨 Error during sign out:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };

  console.log('🔐 AuthContext value:', {
    timestamp: new Date().toISOString(),
    isLoading,
    isAuthenticated: !!user,
    userId: user?.id,
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('🚨 useAuthContext used outside AuthProvider');
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}