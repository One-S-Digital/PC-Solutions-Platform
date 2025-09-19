import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('Clerk Publishable Key is missing. Please set VITE_CLERK_PUBLISHABLE_KEY in your environment.');
} else {
  console.log('Clerk Publishable Key loaded successfully.');
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  if (!clerkPubKey) {
    return <div>Error: Clerk configuration is missing.</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  );
}