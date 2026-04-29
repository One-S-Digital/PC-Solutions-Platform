import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
}

import AdminCustomLoginForm from './AdminCustomLoginFormNew';
import AdminCustomSignupForm from './AdminCustomSignupFormNew';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AdminLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return <AdminCustomLoginForm />;
}

export function AdminSignupPage() {
  return <AdminCustomSignupForm />;
}

interface BackendUser {
  id: string;
  role: string;
  email?: string;
  isPending?: boolean;
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user from backend database (single source of truth)
  useEffect(() => {
    const controller = new AbortController();

    const fetchBackendUser = async () => {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        setIsLoadingUser(false);
        return;
      }

      setIsLoadingUser(true);

      try {
        const token = await getToken();
        if (!token) {
          if (!controller.signal.aborted) {
            setError('Failed to get authentication token');
            setIsLoadingUser(false);
          }
          return;
        }

        const response = await fetch(`${API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setBackendUser(data.data);
        } else {
          setError('Invalid response from server');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch backend user:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        if (!controller.signal.aborted) setIsLoadingUser(false);
      }
    };

    fetchBackendUser();

    return () => controller.abort();
  }, [isSignedIn, isLoaded, getToken]);

  // Show loading while Clerk or backend user is loading
  if (!isLoaded || isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return <Navigate to="/login" />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle pending user (backend hasn't finished processing)
  if (backendUser?.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Setting up your account...</h2>
          <p className="text-gray-600">Please wait while we finish processing your account.</p>
        </div>
      </div>
    );
  }

  // Check if user has admin role from database (single source of truth)
  const userRole = backendUser?.role;
  if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ADMIN) {
    return <Navigate to="/access-denied" />;
  }

  return <>{children}</>;
}
