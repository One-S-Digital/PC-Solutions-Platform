import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { UserRole, AuthUser } from '@repo/types';

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

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Fetch user data from our API
    const fetchUserData = async () => {
      try {
        const token = await getToken();
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
        } else {
          console.error('Failed to fetch user data');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [clerkUser, clerkLoaded]);

  const signOut = async () => {
    await clerkSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
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