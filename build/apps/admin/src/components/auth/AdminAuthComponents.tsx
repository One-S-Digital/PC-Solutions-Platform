import React from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '@repo/types';
import AdminCustomLoginForm from './AdminCustomLoginForm';
import AdminCustomSignupForm from './AdminCustomSignupForm';

export function AdminLoginPage() {
  return <AdminCustomLoginForm />;
}

export function AdminSignupPage() {
  return <AdminCustomSignupForm />;
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user has admin role
  const userRole = user?.publicMetadata?.role as string;
  if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}