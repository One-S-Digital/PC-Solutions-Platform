# Sentry Configuration Fix

## Problem

You're seeing this message in your logs:
```
sentry.config.ts:9 Sentry DSN not configured. Skipping Sentry initialization.
```

And the Render backend logs show no Sentry-related output.

## Root Cause

The Sentry DSN (Data Source Name) environment variables are **not configured** in your deployment environment. The Sentry integration code is working correctly - it's simply detecting that no DSN has been provided and gracefully skipping initialization.

## Why This Happens

1. **Environment variables are optional** - The Sentry integration was designed to be optional, so it won't break your app if not configured
2. **No DSN in render.yaml** - The original `render.yaml` file didn't include the Sentry environment variables
3. **No Sentry project set up yet** - You need to create Sentry projects and get DSN values before you can configure them

## Solution

### Step 1: Create Sentry Projects

1. Go to [https://sentry.io](https://sentry.io) and create an account (or log in)
2. Create three projects:
   - **Name**: `pc-solutions-frontend` | **Platform**: React
   - **Name**: `pc-solutions-admin` | **Platform**: React
   - **Name**: `pc-solutions-api` | **Platform**: Node.js
3. For each project, copy the DSN from: **Settings → Client Keys (DSN)**
   - Format: `https://[KEY]@[REGION].ingest.sentry.io/[PROJECT_ID]`

### Step 2: Configure Environment Variables in Render

#### For the Frontend Service (`pc-solutions-frontend`):

1. Go to Render Dashboard → `pc-solutions-frontend` service
2. Navigate to **Environment** tab
3. Add the following environment variables:

```
VITE_SENTRY_DSN = https://[YOUR-FRONTEND-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
```

**Optional but recommended:**
```
VITE_SENTRY_RELEASE = frontend@1.0.0
SENTRY_ORG = your-org-slug
SENTRY_PROJECT = frontend
SENTRY_AUTH_TOKEN = [your-auth-token]  # Only needed for source map upload
```

#### For the Admin Service (`pc-solutions-admin`):

1. Go to Render Dashboard → `pc-solutions-admin` service
2. Navigate to **Environment** tab
3. Add the following environment variables:

```
VITE_SENTRY_DSN = https://[YOUR-ADMIN-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
```

**Optional but recommended:**
```
VITE_SENTRY_RELEASE = admin@1.0.0
SENTRY_ORG = your-org-slug
SENTRY_PROJECT = admin
SENTRY_AUTH_TOKEN = [your-auth-token]  # Only needed for source map upload
```

#### For the API Service (`pc-solutions-v2`):

1. Go to Render Dashboard → `pc-solutions-v2` service
2. Navigate to **Environment** tab
3. Add the following environment variables:

```
SENTRY_DSN = https://[YOUR-API-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
```

**Optional but recommended:**
```
SENTRY_RELEASE = api@1.0.0
SENTRY_ORG = your-org-slug
SENTRY_PROJECT = api
SENTRY_AUTH_TOKEN = [your-auth-token]  # Only needed for source map upload
```

### Step 3: Redeploy

After adding the environment variables in Render:

1. Trigger a manual deploy for each service, OR
2. Wait for the next automatic deployment

### Step 4: Verify

After deployment:

1. **Check Logs**: You should no longer see the "Sentry DSN not configured" message
2. **Check Sentry Dashboard**: Errors and performance metrics should start appearing
3. **Test Error Tracking**: Trigger a test error to verify it appears in Sentry

## What Changed in render.yaml

I've updated the `render.yaml` file to include the Sentry environment variable placeholders for all three services. These are marked as `sync: false`, which means they need to be set manually in the Render Dashboard (just like `CLERK_SECRET_KEY`).

The updated `render.yaml` includes:
- `VITE_SENTRY_DSN` for frontend and admin
- `SENTRY_DSN` for API
- Optional variables for release tracking and source map upload

## Local Development

If you want to test Sentry locally:

### Frontend
Create `/workspace/frontend/.env`:
```env
VITE_SENTRY_DSN=https://[YOUR-FRONTEND-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
```

### Admin
Create `/workspace/admin/.env`:
```env
VITE_SENTRY_DSN=https://[YOUR-ADMIN-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000/api
VITE_FRONTEND_URL=http://localhost:3000
VITE_NODE_ENV=development
```

### API
Create `/workspace/api/.env`:
```env
SENTRY_DSN=https://[YOUR-API-KEY]@o[ORG-ID].ingest.sentry.io/[PROJECT-ID]
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
# ... other required variables
```

## Testing Sentry Integration

### Test Error Tracking

**Frontend/Admin:**
Temporarily add this to any component:
```javascript
throw new Error('Test Sentry Integration');
```

**API:**
Cause an error by making an invalid request:
```bash
curl https://pc-solutions-v2.onrender.com/api/test-error
```

### Test Feedback Widget

The feedback widget should appear as a floating button on the frontend and admin apps when Sentry is configured. Users can click it to submit feedback.

## Important Notes

1. **Sentry is Optional**: Your app will work fine without Sentry configured. The "DSN not configured" message is informational, not an error.

2. **Free Tier**: Sentry offers 5,000 errors/month and 10,000 performance units/month on the free tier. With 10% sampling in production, this should be sufficient.

3. **Security**: The DSN is safe to expose (it's used in frontend code). However, the `SENTRY_AUTH_TOKEN` should be kept secret.

4. **Source Maps**: To get readable stack traces in production, you need to:
   - Set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`
   - Source maps will be automatically uploaded during the build process

5. **Environment Detection**: The code automatically detects the environment:
   - Development: 100% sampling, all events tracked
   - Production: 10% sampling for performance, but 100% of errors tracked

## Troubleshooting

### "Sentry DSN not configured" still appears
- Double-check that you've added the environment variable in Render Dashboard
- Verify the variable name is correct (`VITE_SENTRY_DSN` for frontend/admin, `SENTRY_DSN` for API)
- Ensure you've redeployed after adding the environment variables

### Errors not appearing in Sentry
1. Check that the DSN is correct and matches your Sentry project
2. Verify network connectivity from your Render services to Sentry
3. Check Sentry project settings to ensure it's active
4. Look for error messages in the application logs

### Backend logs have no Sentry output
This is normal! The backend only logs "Sentry DSN not configured" when the DSN is missing. Once configured, Sentry operates silently in the background and sends data directly to Sentry.io. You won't see "Sentry initialized" messages in production logs.

To verify it's working:
1. Check the Sentry dashboard for incoming events
2. Trigger a test error
3. Look for performance metrics in Sentry

## Next Steps

1. ✅ **Updated render.yaml** - Environment variable placeholders added
2. ⏭️ **Create Sentry projects** - Set up three projects in Sentry.io
3. ⏭️ **Get DSN values** - Copy DSN for each project
4. ⏭️ **Add to Render** - Configure environment variables in Render Dashboard
5. ⏭️ **Redeploy** - Trigger deployment to apply changes
6. ⏭️ **Verify** - Check Sentry dashboard for events

## References

- [SENTRY_INTEGRATION_GUIDE.md](./SENTRY_INTEGRATION_GUIDE.md) - Complete integration guide
- [SENTRY_IMPLEMENTATION_SUMMARY.md](./SENTRY_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [Sentry Documentation](https://docs.sentry.io/) - Official Sentry docs
- [Render Environment Variables](https://render.com/docs/environment-variables) - Render docs
