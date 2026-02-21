import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkDomain = import.meta.env.VITE_CLERK_DOMAIN;

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

  const clerkProps: Record<string, unknown> = {
    publishableKey: clerkPubKey,
    signInUrl: '/login',
    signUpUrl: '/signup',
    afterSignOutUrl: '/login',
    taskUrls: {
      'choose-organization': '/dashboard',
      'reset-password': '/login',
    },
  };
  if (clerkProxyUrl) clerkProps.proxyUrl = clerkProxyUrl;
  if (clerkDomain) clerkProps.domain = clerkDomain;

  return (
    <ClerkProvider {...clerkProps as any}>
      {children}
    </ClerkProvider>
  );
}