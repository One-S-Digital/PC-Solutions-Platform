# 🚨 Render Deployment Troubleshooting

## Issue: pnpm Lockfile Out of Sync

### Problem
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with frontend/package.json
```

### Root Cause
Render is detecting pnpm as the package manager, but the lockfile is outdated and doesn't match the current package.json dependencies.

### Solutions

#### Solution 1: Force npm (Recommended)
Update your Render service configuration to use npm explicitly:

**In Render Dashboard:**
1. Go to your service settings
2. Change **Build Command** to:
   ```bash
   npm install && npm run build:production
   ```
3. Change **Install Command** to:
   ```bash
   npm install
   ```

#### Solution 2: Update pnpm Lockfile
If you want to keep using pnpm:

```bash
# In your local environment
cd frontend
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "Update pnpm lockfile"
git push
```

#### Solution 3: Use .npmrc Configuration
Add a `.npmrc` file to force npm usage:

```bash
# .npmrc
package-manager=npm
```

## Updated Render Configuration

### render.yaml (Updated)
```yaml
services:
  - type: web
    name: procreche-frontend
    env: static
    buildCommand: npm install && npm run build:production
    staticPublishPath: ./dist
    pullRequestPreviewsEnabled: true
    autoDeploy: true
    branch: main
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_APP_ENV
        value: production
      - key: VITE_CLERK_PUBLISHABLE_KEY
        sync: false
      - key: VITE_API_BASE_URL
        sync: false
```

### Manual Render Configuration
If using the Render dashboard instead of render.yaml:

1. **Service Type**: Static Site
2. **Build Command**: `npm install && npm run build:production`
3. **Publish Directory**: `dist`
4. **Node Version**: 18+ (auto-detected)

## Environment Variables for Render

### Required Variables
```bash
NODE_ENV=production
VITE_APP_ENV=production
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_KEY
VITE_API_BASE_URL=https://your-api-url.onrender.com/api
VITE_APP_NAME="Pro Crèche Solutions"
VITE_APP_VERSION="1.0.0"
```

### Optional Variables
```bash
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_KEY
VITE_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
```

## Step-by-Step Fix

### 1. Update Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your `procreche-frontend` service
3. Click **Settings**
4. Update **Build Command** to: `npm install && npm run build:production`
5. Save changes

### 2. Trigger New Deployment
1. Click **Manual Deploy** → **Deploy latest commit**
2. Or push a new commit to trigger auto-deploy

### 3. Monitor Build Logs
Watch the build logs for:
- ✅ `npm install` completes successfully
- ✅ `npm run build:production` completes successfully
- ✅ Static files generated in `dist/` directory

## Alternative: Use render.yaml

### 1. Add render.yaml to Repository
```yaml
services:
  - type: web
    name: procreche-frontend
    env: static
    buildCommand: npm install && npm run build:production
    staticPublishPath: ./dist
    pullRequestPreviewsEnabled: true
    autoDeploy: true
    branch: main
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_APP_ENV
        value: production
```

### 2. Deploy from render.yaml
1. In Render dashboard, click **New +** → **Blueprint**
2. Connect your repository
3. Render will automatically detect and use render.yaml

## Verification Steps

### 1. Check Build Success
```bash
# In build logs, look for:
✓ npm install completed
✓ npm run build:production completed
✓ dist/ directory created
✓ Static files generated
```

### 2. Test Deployment
```bash
# Visit your Render URL
curl https://your-app.onrender.com

# Check health endpoint
curl https://your-app.onrender.com/health
```

### 3. Verify Environment Variables
```bash
# Check if environment variables are loaded
# Look for VITE_ variables in build logs
```

## Common Issues and Solutions

### Issue 1: Build Command Not Found
**Error**: `npm: command not found`
**Solution**: Ensure Node.js version is set to 18+ in Render settings

### Issue 2: Missing Environment Variables
**Error**: `VITE_CLERK_PUBLISHABLE_KEY is not defined`
**Solution**: Add all required environment variables in Render dashboard

### Issue 3: Build Fails with TypeScript Errors
**Error**: TypeScript compilation errors
**Solution**: The build will still succeed as Vite handles TypeScript compilation

### Issue 4: Static Files Not Found
**Error**: 404 for static assets
**Solution**: Verify `staticPublishPath` is set to `./dist`

## Performance Optimization

### Build Optimization
```bash
# Use npm ci for faster, reliable builds in CI
npm ci && npm run build:production
```

### Caching Strategy
```yaml
# In render.yaml
headers:
  - path: /assets/*
    name: Cache-Control
    value: "public, max-age=31536000, immutable"
  - path: /*.html
    name: Cache-Control
    value: "no-cache, no-store, must-revalidate"
```

## Monitoring and Debugging

### Build Logs
- Check Render dashboard for detailed build logs
- Look for npm install and build completion messages
- Verify environment variables are loaded

### Runtime Logs
- Monitor application logs for runtime errors
- Check for API connectivity issues
- Verify authentication flow

### Performance Monitoring
```bash
# Test performance
lighthouse https://your-app.onrender.com --output=html

# Check bundle size
curl -s https://your-app.onrender.com | grep -o 'assets/[^"]*\.js' | head -5
```

## Support Resources

### Render Documentation
- [Static Sites](https://render.com/docs/static-sites)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Build Configuration](https://render.com/docs/build-configuration)

### Project Documentation
- `DEPLOYMENT.md` - General deployment guide
- `RENDER_DEPLOYMENT.md` - Render-specific guide
- `PRODUCTION_READY.md` - Production readiness checklist

## Quick Fix Summary

1. **Update Build Command**: `npm install && npm run build:production`
2. **Add Environment Variables**: All VITE_ variables
3. **Set Publish Directory**: `dist`
4. **Trigger Deployment**: Manual deploy or push commit
5. **Monitor Logs**: Check for successful build completion

---

## 🎯 Expected Result

After applying the fix, you should see:
- ✅ npm install completes successfully
- ✅ npm run build:production completes successfully
- ✅ Static files generated in dist/ directory
- ✅ Application deployed and accessible
- ✅ All features working correctly

**Status**: 🟢 **READY FOR RENDER DEPLOYMENT**