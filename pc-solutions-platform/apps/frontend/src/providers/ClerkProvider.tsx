import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

// Get the publishable key from environment variables
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing Clerk Publishable Key');
}

interface ClerkProviderWrapperProps {
  children: React.ReactNode;
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {children}
    </ClerkProvider>
  );
}