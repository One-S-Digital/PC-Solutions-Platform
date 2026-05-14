# Sentry Integration Guide

This document describes how Sentry is integrated into the PC Solutions platform for error tracking, performance monitoring, and user feedback collection.

## Overview

Sentry has been integrated into all three applications:
- **Frontend** (React/Vite)
- **Admin** (React/Vite)
- **API** (NestJS)

The integration provides:
- ✅ Automatic error tracking and reporting
- ✅ Performance monitoring and tracing
- ✅ Session replay for debugging
- ✅ User feedback widget (Frontend & Admin only)
- ✅ Source map support for production debugging
- ✅ Sensitive data filtering

## Setup Instructions

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io) and create an account
2. Create a new organization (or use an existing one)
3. Create three projects:
   - `frontend` (Platform: JavaScript/React)
   - `admin` (Platform: JavaScript/React)
   - `api` (Platform: Node.js)

### 2. Get Your DSN (Data Source Name)

For each project, copy the DSN from:
- Project Settings → Client Keys (DSN)
- Example: `https://examplePublicKey@o0.ingest.sentry.io/0`

### 3. Generate an Auth Token (Optional - for source maps)

To upload source maps for better error tracking in production:

1. Go to Settings → Account → API → Auth Tokens
2. Click "Create New Token"
3. Set scopes: `project:releases` and `project:write`
4. Save the token securely

### 4. Configure Environment Variables

> ⚠️ **IMPORTANT for Render/Production Deployments:**
> - **Frontend & Admin** require the `VITE_` prefix: Use `VITE_SENTRY_DSN`
> - **API** does NOT use the prefix: Use `SENTRY_DSN`
>
> This is because Vite only exposes environment variables prefixed with `VITE_` to the client-side code. If you use `SENTRY_DSN` for frontend/admin, Sentry will NOT initialize!

#### Frontend (`/workspace/frontend/.env`) - Also in Render

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_SENTRY_DSN` | **Yes** | `https://abc123@o123.ingest.sentry.io/456` |
| `VITE_SENTRY_RELEASE` | No | `frontend@1.0.0` |
| `SENTRY_ORG` | No (source maps) | `your-org-slug` |
| `SENTRY_PROJECT` | No (source maps) | `frontend` |
| `SENTRY_AUTH_TOKEN` | No (source maps) | `sntrys_...` |

```env
# Required for Sentry to work - MUST use VITE_ prefix!
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id

# Optional but recommended
VITE_SENTRY_RELEASE=frontend@1.0.0
VITE_NODE_ENV=production

# Only needed for source map upload (production builds)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=frontend
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Admin (`/workspace/admin/.env`) - Also in Render

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_SENTRY_DSN` | **Yes** | `https://abc123@o123.ingest.sentry.io/456` |
| `VITE_SENTRY_RELEASE` | No | `admin@1.0.0` |
| `SENTRY_ORG` | No (source maps) | `your-org-slug` |
| `SENTRY_PROJECT` | No (source maps) | `admin` |
| `SENTRY_AUTH_TOKEN` | No (source maps) | `sntrys_...` |

```env
# Required for Sentry to work - MUST use VITE_ prefix!
VITE_SENTRY_DSN=https://your-admin-dsn@sentry.io/project-id

# Optional but recommended
VITE_SENTRY_RELEASE=admin@1.0.0
VITE_NODE_ENV=production

# Only needed for source map upload (production builds)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=admin
SENTRY_AUTH_TOKEN=your-auth-token
```

#### API (`/workspace/api/.env`) - Also in Render

| Variable | Required | Example |
|----------|----------|---------|
| `SENTRY_DSN` | **Yes** | `https://abc123@o123.ingest.sentry.io/456` |
| `SENTRY_RELEASE` | No | `api@1.0.0` |
| `NODE_ENV` | Yes | `production` |
| `SENTRY_ORG` | No (source maps) | `your-org-slug` |
| `SENTRY_PROJECT` | No (source maps) | `api` |
| `SENTRY_AUTH_TOKEN` | No (source maps) | `sntrys_...` |

```env
# Required for Sentry to work - NO VITE_ prefix for API!
SENTRY_DSN=https://your-api-dsn@sentry.io/project-id

# Optional but recommended
SENTRY_RELEASE=api@1.0.0
NODE_ENV=production

# Only needed for source map upload (production builds)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=api
SENTRY_AUTH_TOKEN=your-auth-token
```

### 5. Test the Integration

#### Development

Sentry is configured to work even in development mode when a DSN is provided. You can test by:

1. **Frontend/Admin**: Cause an error and check the Sentry dashboard
   ```javascript
   // Add this temporarily to any component
   throw new Error('Test Sentry Integration');
   ```

2. **API**: Make a request that causes an error
   ```bash
   curl http://localhost:3000/api/test-error
   ```

#### User Feedback Widget

The feedback widget appears as a floating button on the Frontend and Admin applications when Sentry is configured. Users can:
- Report issues
- Provide feedback
- Attach screenshots (automatically captured)

## Features

### 1. Error Tracking

All uncaught errors are automatically sent to Sentry with:
- Stack traces with source maps
- User context (non-PII)
- Environment information
- Browser/Node.js version

### 2. Performance Monitoring

**Frontend & Admin:**
- Page load times
- Component render times
- API request latency
- Route transition times

**API:**
- HTTP request duration
- Database query performance
- External API call latency

Sample rate: 10% in production, 100% in development

### 3. Session Replay

For Frontend and Admin only:
- Records user sessions when errors occur
- Masks all sensitive text by default
- Blocks all media (images, videos)
- Helps reproduce bugs

Sample rate: 10% of normal sessions, 100% of error sessions

### 4. User Feedback Widget

**Frontend & Admin only** - allows users to:
- Report bugs directly from the UI
- Provide feedback on features
- Automatically includes context (URL, session info)

The widget is styled to match your application theme.

### 5. Sensitive Data Protection

All Sentry configurations include filters to remove:
- Authorization headers
- Cookies
- API keys
- Passwords
- Tokens
- Email addresses from URLs

## Production Deployment

### Source Maps

Source maps are automatically uploaded to Sentry during production builds when the auth token is configured. This allows you to:
- See original source code in stack traces
- Map minified errors back to source
- Get meaningful error context

The source maps are **not** included in your production bundle for security.

### Environment-Specific Configuration

- **Development**: All events tracked (100% sample rate)
- **Production**: Sampled events (10% sample rate for performance)
- **E2E Tests**: Sentry disabled automatically

### Release Tracking

Releases are automatically tagged with the format:
- Frontend: `frontend@${version}`
- Admin: `admin@${version}`
- API: `api@${version}`

This helps track which version has which bugs.

## Monitoring Best Practices

1. **Check Sentry Daily**: Review new errors and performance issues
2. **Set Up Alerts**: Configure Slack/email alerts for critical errors
3. **Use Release Notes**: Document what changed in each release
4. **Review User Feedback**: Act on user-submitted feedback quickly
5. **Monitor Performance**: Watch for performance degradation trends

## Disabling Sentry

To disable Sentry (not recommended for production):

1. Remove the DSN environment variable
2. Sentry will not initialize
3. No data will be sent

Or set a different DSN for staging/development environments.

## Cost Considerations

Sentry offers:
- **Free tier**: 5,000 errors/month, 10,000 performance units/month
- **Paid plans**: Start at $26/month for larger volume

With the current sampling configuration (10% in production), the free tier should be sufficient for initial launch.

## Troubleshooting

### Sentry Not Initializing / DSN Not Found

**Most Common Issue:** Wrong environment variable name!

1. **Frontend/Admin**: Check you're using `VITE_SENTRY_DSN` (with `VITE_` prefix)
2. **API**: Check you're using `SENTRY_DSN` (without prefix)

To verify, check the browser console (frontend/admin) or server logs (API) for:
- `[Sentry] Initialization check: { hasDsn: false, ... }` → DSN not found
- `[Sentry] ✅ Successfully initialized` → Working correctly

### Errors Not Appearing in Sentry

1. Check that DSN is configured correctly (see above)
2. Verify network connectivity to Sentry
3. Check browser console for Sentry initialization errors
4. Ensure `NODE_ENV` or `VITE_NODE_ENV` is set correctly

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check that build includes `sourcemap: true`
3. Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings
4. Check build logs for source map upload confirmation

### Feedback Widget Not Showing

1. Verify Sentry is initialized (check console logs)
2. Ensure you're not in E2E test mode
3. Check that DSN is configured
4. Try refreshing the page

## Support

For issues with Sentry integration:
1. Check [Sentry Documentation](https://docs.sentry.io/)
2. Review configuration files in this repository
3. Contact your development team

## Files Modified

### Frontend
- `/workspace/frontend/sentry.config.ts` - Sentry configuration
- `/workspace/frontend/index.tsx` - Sentry initialization
- `/workspace/frontend/vite.config.ts` - Vite plugin configuration
- `/workspace/frontend/env.example` - Environment variables

### Admin
- `/workspace/admin/src/sentry.config.ts` - Sentry configuration
- `/workspace/admin/src/main.tsx` - Sentry initialization
- `/workspace/admin/vite.config.ts` - Vite plugin configuration
- `/workspace/admin/.env.example` - Environment variables

### API
- `/workspace/api/src/sentry.instrument.ts` - Sentry configuration
- `/workspace/api/src/main.ts` - Sentry initialization
- `/workspace/api/src/common/filters/sentry-exception.filter.ts` - Exception filter
- `/workspace/api/.env.example` - Environment variables

## Next Steps

1. ✅ Create Sentry projects
2. ✅ Configure environment variables
3. ✅ Deploy to production
4. ✅ Test error tracking
5. ✅ Set up alerts
6. ✅ Train team on Sentry dashboard
