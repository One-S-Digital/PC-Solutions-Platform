import { authDebugger } from './authDebugger';

/**
 * Initialize the auth debugger on app boot
 * Call this once at the top level of your app
 */
export const initAuthDebugger = () => {
  // Only enable debugger in development mode OR if ?authdebug=1 is in URL
  const isDevelopment = import.meta.env.DEV;
  const hasDebugParam = new URLSearchParams(window.location.search).get('authdebug') === '1';
  
  if (isDevelopment || hasDebugParam) {
    authDebugger.enable();
  }

  // Log app boot
  authDebugger.logAppBoot({
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  // Set up global error handlers
  window.addEventListener('error', (event) => {
    authDebugger.logWindowError(
      event.message,
      `${event.filename}:${event.lineno}`
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    authDebugger.logUnhandledRejection(
      event.reason?.message || String(event.reason)
    );
  });

  // Log cookie/storage capability
  try {
    const cookiesEnabled = navigator.cookieEnabled;
    const sameOrigin = window.location.origin === document.location.origin;
    authDebugger.logCookieSnapshot(cookiesEnabled, sameOrigin);
  } catch (error) {
    console.error('Failed to check cookie/storage:', error);
  }

  // Log when DOM is ready
  if (document.readyState === 'complete') {
    authDebugger.logAppReady();
  } else {
    window.addEventListener('load', () => {
      authDebugger.logAppReady();
    });
  }
};
