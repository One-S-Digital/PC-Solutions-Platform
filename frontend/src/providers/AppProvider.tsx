import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('Missing Clerk Publishable Key - VITE_CLERK_PUBLISHABLE_KEY is not set');
  // Don't throw error in production, just log it
  if (import.meta.env.DEV) {
    throw new Error('Missing Clerk Publishable Key');
  }
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // If no Clerk key, show error message
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Configuration Error</h1>
          <p className="text-red-600 mb-4">Missing Clerk authentication key</p>
          <p className="text-sm text-red-500">Please contact the administrator</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  );
}