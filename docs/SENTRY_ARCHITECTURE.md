# Sentry Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Sentry.io Cloud                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │    Admin     │  │     API      │         │
│  │   Project    │  │   Project    │  │   Project    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ▲                 ▲                 ▲                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          │ HTTPS           │ HTTPS           │ HTTPS
          │ (Errors)        │ (Errors)        │ (Errors)
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────────┐
│         │                 │                 │                   │
│  ┏━━━━━━┻━━━━━━━┓  ┏━━━━━━┻━━━━━━┓  ┏━━━━━━┻━━━━━━━┓         │
│  ┃   Frontend   ┃  ┃    Admin     ┃  ┃     API      ┃         │
│  ┃   (React)    ┃  ┃   (React)    ┃  ┃   (NestJS)   ┃         │
│  ┗━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━┛         │
│         │                 │                 │                   │
│  Your Platform (localhost:3001 / 5174 / 3000)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Error Capture Flow

```
User Action → Error Occurs → Sentry SDK Captures
                                    ↓
                         Filters Sensitive Data
                                    ↓
                         Sends to Sentry.io
                                    ↓
                         Dashboard Updates
                                    ↓
                         Alerts Triggered (Optional)
```

### 2. Feedback Widget Flow

```
User Clicks Feedback Button → Form Opens
                                    ↓
                         User Fills Form
                                    ↓
                         Screenshot Captured (Auto)
                                    ↓
                         Sends to Sentry.io
                                    ↓
                         Appears in Feedback Tab
```

### 3. Performance Monitoring Flow

```
Request/Action → Sentry Starts Transaction
                            ↓
                  Tracks Performance Metrics
                            ↓
                  (Duration, DB queries, etc.)
                            ↓
                  Samples (10% in prod)
                            ↓
                  Sends to Sentry.io
```

## Components

### Frontend Application

```
index.tsx
    └── initSentry() ──┐
                       │
    ┌──────────────────┘
    │
    ▼
sentry.config.ts
    ├── @sentry/react
    ├── browserTracingIntegration
    ├── replayIntegration
    └── feedbackIntegration ◄── User Feedback Widget
```

### Admin Application

```
main.tsx
    └── initSentry() ──┐
                       │
    ┌──────────────────┘
    │
    ▼
sentry.config.ts
    ├── @sentry/react
    ├── browserTracingIntegration
    ├── replayIntegration
    └── feedbackIntegration ◄── Admin Feedback Widget
```

### API Application

```
main.ts
    └── initSentry() ──┐
                       │
    ┌──────────────────┘
    │
    ▼
sentry.instrument.ts
    ├── @sentry/nestjs
    ├── httpIntegration
    ├── expressIntegration
    └── nodeProfilingIntegration
         │
         └── Used by ──► sentry-exception.filter.ts
                         (Captures 5xx errors)
```

## Features by Application

| Feature                  | Frontend | Admin | API |
|--------------------------|----------|-------|-----|
| Error Tracking           | ✅       | ✅    | ✅  |
| Performance Monitoring   | ✅       | ✅    | ✅  |
| Session Replay           | ✅       | ✅    | ❌  |
| User Feedback Widget     | ✅       | ✅    | ❌  |
| Profiling                | ❌       | ❌    | ✅  |
| Source Maps              | ✅       | ✅    | ✅  |
| Sensitive Data Filter    | ✅       | ✅    | ✅  |

## Environment Configuration

### Development
```
VITE_SENTRY_DSN=<optional>
SENTRY_DSN=<optional>
```
- Sentry optional in development
- 100% sampling when enabled
- Source maps not uploaded

### Production
```
VITE_SENTRY_DSN=<required>
VITE_SENTRY_RELEASE=frontend@1.0.0
SENTRY_ORG=your-org
SENTRY_PROJECT=frontend
SENTRY_AUTH_TOKEN=<for source maps>
```
- Sentry recommended for production
- 10% sampling for performance
- Source maps uploaded automatically
- Sensitive data automatically filtered

## Security Features

### Automatic PII Filtering

```javascript
beforeSend(event) {
  // Remove sensitive headers
  delete event.request.headers['Authorization']
  delete event.request.headers['Cookie']
  
  // Remove sensitive URL params
  url.searchParams.delete('token')
  url.searchParams.delete('password')
  
  return event;
}
```

### Session Replay Privacy

```javascript
replayIntegration({
  maskAllText: true,      // Hide all text content
  blockAllMedia: true,    // Hide images/videos
})
```

### Ignored Errors

The following errors are NOT sent to Sentry:
- Browser extension errors
- Expected 4xx HTTP errors (404, 401, etc.)
- Network errors (offline, failed to fetch)
- Prisma known errors (unique constraint, not found)

## Monitoring Dashboard

Your Sentry dashboard will show:

1. **Issues Tab**
   - All errors grouped by type
   - Frequency and user impact
   - Stack traces with source maps
   - Affected releases

2. **Performance Tab**
   - Slowest endpoints
   - Database query performance
   - P95/P99 latency
   - Transaction traces

3. **Replays Tab**
   - Session recordings
   - User actions before error
   - Console logs
   - Network activity

4. **Feedback Tab**
   - User-submitted feedback
   - Screenshots
   - User contact info
   - Context (URL, timestamp)

## Cost Optimization

Current configuration optimizes costs by:
- 10% performance sampling in production
- 10% session replay sampling (100% on errors)
- Ignoring expected errors (4xx responses)
- Filtering out browser extension errors

**Expected Monthly Volume** (estimate):
- Errors: < 1,000/month
- Performance: < 5,000 units/month
- Replays: < 500/month

This fits comfortably within Sentry's **free tier**.

## Further Reading

- [SENTRY_QUICK_START.md](./SENTRY_QUICK_START.md) - Get started in 5 minutes
- [SENTRY_INTEGRATION_GUIDE.md](./SENTRY_INTEGRATION_GUIDE.md) - Complete setup guide
- [SENTRY_IMPLEMENTATION_SUMMARY.md](./SENTRY_IMPLEMENTATION_SUMMARY.md) - What was implemented
