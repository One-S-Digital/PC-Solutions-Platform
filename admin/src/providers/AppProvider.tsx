import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  );
}