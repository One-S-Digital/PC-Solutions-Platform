# 🚀 Render Deployment - Quick Fix

## Problem
Render is using pnpm but the lockfile is outdated, causing deployment failures.

## Solution
Use npm instead of pnpm for deployment.

## Quick Fix Steps

### 1. Update Render Service Configuration

**In Render Dashboard:**
1. Go to your service settings
2. Change **Build Command** to:
   ```bash
   npm install && npm run build:production
   ```
3. Save changes

### 2. Environment Variables
Make sure these are set in Render:

```bash
NODE_ENV=production
VITE_APP_ENV=production
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_KEY
VITE_API_BASE_URL=https://your-api-url.onrender.com/api
VITE_APP_NAME="Pro Crèche Solutions"
VITE_APP_VERSION="1.0.0"
```

### 3. Deploy
- Click **Manual Deploy** → **Deploy latest commit**
- Or push a new commit to trigger auto-deploy

## Alternative: Use render.yaml

If you prefer to use the render.yaml file:

1. **Add render.yaml to your repository** (already created)
2. **In Render Dashboard:**
   - Click **New +** → **Blueprint**
   - Connect your repository
   - Render will automatically detect and use render.yaml

## Expected Result

After the fix, you should see:
- ✅ npm install completes successfully
- ✅ npm run build:production completes successfully  
- ✅ Static files generated in dist/ directory
- ✅ Application deployed and accessible

## Files Created for Render

- `render.yaml` - Render configuration
- `.npmrc` - Forces npm usage
- `_redirects` - SPA routing support
- `RENDER_DEPLOYMENT.md` - Complete deployment guide
- `RENDER_TROUBLESHOOTING.md` - Troubleshooting guide

## Status
🟢 **READY FOR RENDER DEPLOYMENT**

The build works locally with npm, so it should work on Render too.