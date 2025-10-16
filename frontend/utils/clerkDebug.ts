/**
 * Clerk Debug Utility
 * Comprehensive diagnostics for Clerk SSL and initialization issues
 */

interface ClerkDiagnostics {
  environment: {
    url: string;
    origin: string;
    protocol: string;
    isHTTPS: boolean;
    hostname: string;
    port: string;
  };
  clerkConfig: {
    hasPublishableKey: boolean;
    keyPrefix: string;
    keyType: 'test' | 'live' | 'unknown';
    keyLength: number;
    fullKey?: string; // Only in dev mode
  };
  envVars: {
    nodeEnv: string;
    mode: string;
    isDev: boolean;
    isProd: boolean;
    apiUrl: string;
    skipAuth: string;
  };
  browser: {
    userAgent: string;
    language: string;
    platform: string;
    cookiesEnabled: boolean;
  };
  network: {
    online: boolean;
    effectiveType?: string;
  };
  localStorage: {
    available: boolean;
    clerkItems: string[];
  };
  sessionStorage: {
    available: boolean;
    clerkItems: string[];
  };
}

export function getClerkDiagnostics(publishableKey?: string): ClerkDiagnostics {
  const keyType = publishableKey?.startsWith('pk_test_') ? 'test' :
                  publishableKey?.startsWith('pk_live_') ? 'live' : 'unknown';

  // Check localStorage for Clerk data
  const localStorageClerkItems: string[] = [];
  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('clerk')) {
          localStorageClerkItems.push(key);
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
  }

  // Check sessionStorage for Clerk data
  const sessionStorageClerkItems: string[] = [];
  if (typeof sessionStorage !== 'undefined') {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.includes('clerk')) {
          sessionStorageClerkItems.push(key);
        }
      }
    } catch (e) {
      console.error('Error reading sessionStorage:', e);
    }
  }

  const diagnostics: ClerkDiagnostics = {
    environment: {
      url: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
      isHTTPS: window.location.protocol === 'https:',
      hostname: window.location.hostname,
      port: window.location.port || 'default',
    },
    clerkConfig: {
      hasPublishableKey: !!publishableKey,
      keyPrefix: publishableKey ? publishableKey.substring(0, 15) + '...' : 'NONE',
      keyType,
      keyLength: publishableKey?.length || 0,
      ...(import.meta.env.DEV && { fullKey: publishableKey }), // Only show full key in dev
    },
    envVars: {
      nodeEnv: import.meta.env.NODE_ENV || 'unknown',
      mode: import.meta.env.MODE || 'unknown',
      isDev: !!import.meta.env.DEV,
      isProd: !!import.meta.env.PROD,
      apiUrl: import.meta.env.VITE_API_URL || 'NOT SET',
      skipAuth: import.meta.env.VITE_SKIP_AUTH || 'false',
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
    },
    network: {
      online: navigator.onLine,
      effectiveType: (navigator as any).connection?.effectiveType,
    },
    localStorage: {
      available: typeof localStorage !== 'undefined',
      clerkItems: localStorageClerkItems,
    },
    sessionStorage: {
      available: typeof sessionStorage !== 'undefined',
      clerkItems: sessionStorageClerkItems,
    },
  };

  return diagnostics;
}

export function logClerkDiagnostics(publishableKey?: string): void {
  const diagnostics = getClerkDiagnostics(publishableKey);
  
  console.group('🔍 CLERK DIAGNOSTICS REPORT');
  
  console.group('🌍 Environment');
  console.table(diagnostics.environment);
  console.groupEnd();
  
  console.group('🔑 Clerk Configuration');
  console.table(diagnostics.clerkConfig);
  
  // Key type validation
  if (diagnostics.clerkConfig.keyType === 'test' && diagnostics.environment.isHTTPS && !diagnostics.environment.hostname.includes('localhost')) {
    console.warn('⚠️ WARNING: Using TEST key on non-localhost HTTPS domain!');
    console.warn('   Test keys are restricted to localhost. Use a LIVE key for production domains.');
  }
  
  if (diagnostics.clerkConfig.keyType === 'unknown') {
    console.error('❌ ERROR: Publishable key format is invalid!');
    console.error('   Expected: pk_test_... or pk_live_...');
  }
  console.groupEnd();
  
  console.group('📦 Environment Variables');
  console.table(diagnostics.envVars);
  console.groupEnd();
  
  console.group('🌐 Browser Info');
  console.table(diagnostics.browser);
  console.groupEnd();
  
  console.group('📡 Network');
  console.table(diagnostics.network);
  if (!diagnostics.network.online) {
    console.error('❌ ERROR: Browser is OFFLINE!');
  }
  console.groupEnd();
  
  console.group('💾 Storage');
  console.log('LocalStorage:', diagnostics.localStorage);
  console.log('SessionStorage:', diagnostics.sessionStorage);
  console.groupEnd();
  
  // Summary and recommendations
  console.group('📋 Analysis & Recommendations');
  
  const issues: string[] = [];
  const warnings: string[] = [];
  
  if (!diagnostics.clerkConfig.hasPublishableKey) {
    issues.push('❌ CRITICAL: No Clerk publishable key provided');
  }
  
  if (diagnostics.clerkConfig.keyType === 'unknown') {
    issues.push('❌ CRITICAL: Invalid key format');
  }
  
  if (diagnostics.clerkConfig.keyType === 'test' && 
      diagnostics.environment.isHTTPS && 
      !diagnostics.environment.hostname.includes('localhost')) {
    issues.push('❌ CRITICAL: Test key on production domain (use live key)');
  }
  
  if (!diagnostics.environment.isHTTPS && !diagnostics.environment.hostname.includes('localhost')) {
    warnings.push('⚠️  Non-HTTPS connection on non-localhost domain');
  }
  
  if (!diagnostics.browser.cookiesEnabled) {
    issues.push('❌ Cookies are disabled (required for Clerk)');
  }
  
  if (!diagnostics.network.online) {
    issues.push('❌ Browser is offline');
  }
  
  if (issues.length > 0) {
    console.error('Issues Found:');
    issues.forEach(issue => console.error(issue));
  }
  
  if (warnings.length > 0) {
    console.warn('Warnings:');
    warnings.forEach(warning => console.warn(warning));
  }
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ No obvious configuration issues detected');
  }
  
  console.groupEnd();
  console.groupEnd();
  
  // Make diagnostics available globally for debugging
  (window as any).__CLERK_DIAGNOSTICS__ = diagnostics;
  console.log('💡 TIP: Diagnostics saved to window.__CLERK_DIAGNOSTICS__');
}

// Network request monitoring for Clerk
export function monitorClerkRequests(): void {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    
    if (url.includes('clerk.') || url.includes('clerk-')) {
      console.group(`🌐 Clerk Network Request: ${url}`);
      console.log('📤 Request:', args);
      
      try {
        const response = await originalFetch(...args);
        console.log('📥 Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        });
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Request Failed:', error);
        console.groupEnd();
        throw error;
      }
    }
    
    return originalFetch(...args);
  };
  
  console.log('✅ Clerk request monitoring enabled');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).debugClerk = {
    getDiagnostics: getClerkDiagnostics,
    logDiagnostics: logClerkDiagnostics,
    monitorRequests: monitorClerkRequests,
  };
  console.log('💡 TIP: Use window.debugClerk.logDiagnostics() to run diagnostics');
}
