import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { logClerkDiagnostics, monitorClerkRequests } from '../utils/clerkDebug';

// Get the publishable key from environment variables
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// === COMPREHENSIVE DEBUG LOGGING ===
console.group('🔐 [ADMIN] Clerk Initialization Debug');
console.log('📍 Current URL:', window.location.href);
console.log('🌍 Origin:', window.location.origin);
console.log('📦 Environment:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
});
console.log('🔑 Clerk Key Info:', {
  hasKey: !!clerkPubKey,
  keyPrefix: clerkPubKey ? clerkPubKey.substring(0, 15) + '...' : 'NONE',
  keyType: clerkPubKey?.startsWith('pk_test_') ? 'TEST/DEV' : 
           clerkPubKey?.startsWith('pk_live_') ? 'PRODUCTION/LIVE' : 'UNKNOWN',
  keyLength: clerkPubKey?.length || 0,
});
console.log('🌐 API Config:', {
  apiUrl: import.meta.env.VITE_API_URL || 'NOT SET',
  skipAuth: import.meta.env.VITE_SKIP_AUTH || 'false',
});
console.log('🛠️ User Agent:', navigator.userAgent);
console.log('🔒 Is HTTPS:', window.location.protocol === 'https:');

// Add global error listener for Clerk
if (typeof window !== 'undefined') {
  const clerkErrorHandler = (event: ErrorEvent) => {
    if (event.message?.includes('clerk') || event.message?.includes('Clerk')) {
      console.error('🚨 [ADMIN] Clerk Error Detected:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
      });
    }
  };
  window.addEventListener('error', clerkErrorHandler);
}

if (!clerkPubKey) {
  console.error('❌ [ADMIN] CRITICAL: VITE_CLERK_PUBLISHABLE_KEY is missing!');
  console.log('💡 Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
} else {
  console.log('✅ [ADMIN] Clerk Publishable Key loaded successfully');
  console.log('📋 [ADMIN] Using custom sign-in/sign-up pages');
}

console.groupEnd();

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  if (!clerkPubKey) {
    console.error('❌ [ADMIN] Rendering error state - no Clerk key');
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Configuration Error</h1>
          <p className="text-red-600 mb-4">Clerk configuration is missing</p>
          <p className="text-sm text-red-500">VITE_CLERK_PUBLISHABLE_KEY not set</p>
          <p className="text-xs text-gray-500 mt-4">Check browser console for details</p>
        </div>
      </div>
    );
  }

  console.log('✅ [ADMIN] Initializing ClerkProvider with:', {
    keyPrefix: clerkPubKey.substring(0, 15) + '...',
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
  });

  // Run comprehensive diagnostics
  logClerkDiagnostics(clerkPubKey);
  
  // Enable network request monitoring in development
  if (import.meta.env.DEV) {
    monitorClerkRequests();
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}