import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isSatellite = import.meta.env.VITE_CLERK_IS_SATELLITE === 'true';
const clerkDomain = import.meta.env.VITE_CLERK_DOMAIN;
const signInUrl = import.meta.env.VITE_CLERK_SIGN_IN_URL;
const signUpUrl = import.meta.env.VITE_CLERK_SIGN_UP_URL;

if (!clerkPubKey) {
  console.error('Clerk Publishable Key is missing. Please set VITE_CLERK_PUBLISHABLE_KEY in your environment.');
} else {
  console.log('Clerk Publishable Key loaded successfully.');
  if (isSatellite) {
    console.log('Running as Clerk Satellite with domain:', clerkDomain);
  } else {
    console.log('Running as Clerk Primary');
  }
}

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

  // Primary configuration
  if (!isSatellite) {
    return (
      <ClerkProvider 
        publishableKey={clerkPubKey}
        allowedRedirectOrigins={['https://dash.procrechesolutions.com']}
      >
        {children}
      </ClerkProvider>
    );
  }

  // Satellite configuration
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      isSatellite
      domain={clerkDomain}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
    >
      {children}
    </ClerkProvider>
  );
}