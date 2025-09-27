import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-8">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 text-white',
                card: 'shadow-lg',
              },
            }}
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <div className="mt-8">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 text-white',
                card: 'shadow-lg',
              },
            }}
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  console.log('ProtectedRoute render:', { isSignedIn, isLoaded });

  if (!isLoaded) {
    console.log('ProtectedRoute: Not loaded, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    console.log('ProtectedRoute: Not signed in, redirecting to login');
    return <Navigate to="/login" />;
  }

  console.log('ProtectedRoute: Signed in, rendering children');
  return <>{children}</>;
}