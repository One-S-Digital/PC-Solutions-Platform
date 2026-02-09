import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry for NestJS
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  
  // Debug logging for Sentry initialization (only show protocol prefix for security)
  console.info('[Sentry API] Initialization check:', {
    hasDsn: !!dsn,
    dsnPrefix: dsn ? dsn.substring(0, 8) + '...' : 'not set',
    environment,
    nodeEnv: process.env.NODE_ENV,
  });
  
  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    console.warn('[Sentry API] SENTRY_DSN not configured. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Profiling integration
      nodeProfilingIntegration(),
      // HTTP integration for tracking API requests
      Sentry.httpIntegration(),
      // Express integration (NestJS uses Express under the hood)
      Sentry.expressIntegration(),
    ],
    
    // Release tracking
    release: process.env.SENTRY_RELEASE,
    
    // Filter out sensitive information
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove sensitive fields
            const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
            sensitiveFields.forEach(field => {
              if (breadcrumb.data?.[field]) {
                breadcrumb.data[field] = '[REDACTED]';
              }
            });
          }
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Expected HTTP errors
      'UnauthorizedException',
      'NotFoundException',
      'BadRequestException',
      // Prisma known errors
      'P2002', // Unique constraint violation
      'P2011', // Null constraint violation (usually input validation)
      'P2025', // Record not found
    ],
  });
  
  console.info('[Sentry API] ✅ Successfully initialized for environment:', environment);
}
