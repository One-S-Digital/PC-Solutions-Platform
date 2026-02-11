import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Configuration Error</h1>
          <p className="text-red-600 mb-4">Clerk configuration is missing</p>
          <p className="text-sm text-red-500">Please contact the administrator</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      afterSignOutUrl="/login"
      taskUrls={{
        'choose-organization': '/choose-organization',
      }}
    >
      {children}
    </ClerkProvider>
  );
}