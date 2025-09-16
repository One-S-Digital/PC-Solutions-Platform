import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';

// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

console.log('🔧 AppProvider Initialization:', {
  timestamp: new Date().toISOString(),
  clerkPubKey: clerkPubKey ? 'SET' : 'MISSING',
  clerkPubKeyLength: clerkPubKey?.length || 0,
  environment: {
    NODE_ENV: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL || 'NOT_SET',
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'NOT_SET',
  },
});

if (!clerkPubKey) {
  console.error('🚨 MISSING CLERK PUBLISHABLE KEY:', {
    timestamp: new Date().toISOString(),
    environment: import.meta.env,
    availableEnvVars: Object.keys(import.meta.env),
  });
  throw new Error('Missing Clerk Publishable Key');
}

// Validate Clerk key format
if (!clerkPubKey.startsWith('pk_')) {
  console.error('🚨 INVALID CLERK PUBLISHABLE KEY FORMAT:', {
    timestamp: new Date().toISOString(),
    keyPrefix: clerkPubKey.substring(0, 10),
    expectedPrefix: 'pk_',
  });
  throw new Error('Invalid Clerk Publishable Key format - should start with "pk_"');
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  console.log('🔧 AppProvider Rendering:', {
    timestamp: new Date().toISOString(),
    clerkPubKeyValid: clerkPubKey.startsWith('pk_'),
  });

  try {
    return (
      <ClerkProvider publishableKey={clerkPubKey}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ClerkProvider>
    );
  } catch (error) {
    console.error('🚨 AppProvider Error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}