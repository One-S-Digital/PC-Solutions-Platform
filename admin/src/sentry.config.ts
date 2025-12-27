import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  
  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.info('Sentry DSN not configured. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        // Display the Sentry feedback widget for admin users
        colorScheme: 'light',
        showBranding: false,
        isNameRequired: true,
        isEmailRequired: true,
        formTitle: 'Report Admin Issue',
        submitButtonLabel: 'Send Feedback',
        messagePlaceholder: 'Describe what happened in the admin panel...',
        successMessageText: 'Thank you for your feedback!',
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // Capture 10% of transactions in production
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
    
    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE,
    
    // Filter out sensitive information
    beforeSend(event, hint) {
      // Remove sensitive data from event before sending
      if (event.request?.headers) {
        // HTTP headers are case-insensitive; normalize keys
        const headers = event.request.headers;
        Object.keys(headers).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'authorization' || lowerKey === 'cookie') {
            delete headers[key];
          }
        });
      }
      
      // Remove PII from URL parameters
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          const sensitiveParams = ['token', 'api_key', 'password', 'secret', 'email'];
          sensitiveParams.forEach(param => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, '[REDACTED]');
            }
          });
          event.request.url = url.toString();
        } catch (e) {
          // Invalid URL, leave as is
        }
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      // Clerk-specific expected errors
      'Clerk: ',
    ],
  });
}

// Export Sentry for use in error boundaries
export { Sentry };
