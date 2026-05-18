import * as Sentry from '@sentry/react';

// Safari (including iOS WebKit) has known performance issues with Sentry's
// Session Replay integration, particularly around input/focus events on
// password fields, which can cause the browser to freeze with a spinning
// cursor. Detect Safari and skip the Replay integration there.
//
// Apple requires every iOS browser to use WebKit, so Firefox iOS, Edge iOS,
// Chrome iOS, etc. hit the same bug as Safari and must also be opted out.
function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;

  // Any iOS browser is WebKit under the hood, regardless of branding.
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) return true;

  // Desktop: real Safari is the only Safari-branded UA that isn't also a
  // Chromium variant (Chrome, Edge, Opera, etc. all include "Safari").
  const isDesktopChromium = /Chrome\/|Chromium\/|Edg\/|OPR\//.test(ua);
  return /Safari\//.test(ua) && !isDesktopChromium;
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';

  // Debug logging for Sentry initialization (only show protocol prefix for security)
  console.info('[Sentry] Initialization check:', {
    hasDsn: !!dsn,
    dsnPrefix: dsn ? dsn.substring(0, 8) + '...' : 'not set',
    environment,
    mode: import.meta.env.MODE,
  });

  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not configured. Skipping Sentry initialization.');
    console.warn('[Sentry] Make sure the environment variable is named VITE_SENTRY_DSN (not SENTRY_DSN)');
    return;
  }

  const skipReplay = isSafariBrowser();
  if (skipReplay) {
    console.info('[Sentry] Safari detected — skipping Session Replay integration to avoid password-field freeze.');
  }

  const integrations: Parameters<typeof Sentry.init>[0]['integrations'] = [
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: 'light',
      showBranding: false,
      isNameRequired: true,
      isEmailRequired: true,
      formTitle: 'Report an Issue',
      submitButtonLabel: 'Send Feedback',
      messagePlaceholder: 'Describe what happened...',
      successMessageText: 'Thank you for your feedback!',
    }),
  ];

  if (!skipReplay) {
    integrations.push(
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    );
  }

  Sentry.init({
    dsn,
    environment,
    integrations,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // Capture 10% of transactions in production

    // Session Replay (effectively disabled on Safari since the integration is omitted there)
    replaysSessionSampleRate: skipReplay ? 0 : 0.1,
    replaysOnErrorSampleRate: skipReplay ? 0 : 1.0,
    
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
  
  console.info('[Sentry] ✅ Successfully initialized for environment:', environment);
}

// Export Sentry for use in error boundaries
export { Sentry };
