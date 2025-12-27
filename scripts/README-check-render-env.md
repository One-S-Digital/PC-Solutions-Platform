# Check Render Environment Variables for Sentry

This guide shows you how to check if Sentry environment variables are properly configured in your Render services.

## Quick Start

### Step 1: Get Your Render API Key

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click your profile picture → **Account Settings**
3. Navigate to **API Keys** in the left sidebar
4. Click **Create API Key**
5. Give it a name (e.g., "Environment Variables Check")
6. Copy the generated API key

### Step 2: Run the Check Script

**Option A: Save the key for future use (Recommended)**
```bash
node scripts/check-render-env.js --save-key your-render-api-key
node scripts/check-render-env.js
```

**Option B: Use as environment variable**
```bash
RENDER_API_KEY=your-render-api-key node scripts/check-render-env.js
```

**Option C: Use the bash script**
```bash
export RENDER_API_KEY=your-render-api-key
./scripts/check-render-env.sh
```

## What It Checks

The script checks all three services for Sentry configuration:

### Frontend Service (`pc-solutions-frontend`)
**Required:**
- `VITE_SENTRY_DSN` - Your Sentry DSN for the frontend

**Optional:**
- `VITE_SENTRY_RELEASE` - Release version (e.g., frontend@1.0.0)
- `SENTRY_ORG` - Your Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name (frontend)
- `SENTRY_AUTH_TOKEN` - Auth token for source map upload

### Admin Service (`pc-solutions-admin`)
**Required:**
- `VITE_SENTRY_DSN` - Your Sentry DSN for the admin panel

**Optional:**
- `VITE_SENTRY_RELEASE` - Release version (e.g., admin@1.0.0)
- `SENTRY_ORG` - Your Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name (admin)
- `SENTRY_AUTH_TOKEN` - Auth token for source map upload

### API Service (`pc-solutions-v2`)
**Required:**
- `SENTRY_DSN` - Your Sentry DSN for the API

**Optional:**
- `SENTRY_RELEASE` - Release version (e.g., api@1.0.0)
- `SENTRY_ORG` - Your Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name (api)
- `SENTRY_AUTH_TOKEN` - Auth token for source map upload

## Example Output

### When Variables Are Missing:
```
╔═══════════════════════════════════════════════════════╗
║     Render Sentry Environment Variables Checker      ║
╚═══════════════════════════════════════════════════════╝

=== Frontend (pc-solutions-frontend) ===
Service ID: srv-xxxxx

Required Variables:
  ✗ VITE_SENTRY_DSN: NOT SET OR MISSING

Optional Variables:
  - VITE_SENTRY_RELEASE: not set
  - SENTRY_ORG: not set
  ...

╔═══════════════════════════════════════════════════════╗
║                       SUMMARY                         ║
╚═══════════════════════════════════════════════════════╝

✗ Missing Required Sentry Variables:

  • Frontend: VITE_SENTRY_DSN
  • Admin: VITE_SENTRY_DSN
  • API: SENTRY_DSN
```

### When Everything Is Configured:
```
╔═══════════════════════════════════════════════════════╗
║     Render Sentry Environment Variables Checker      ║
╚═══════════════════════════════════════════════════════╝

=== Frontend (pc-solutions-frontend) ===
Service ID: srv-xxxxx

Required Variables:
  ✓ VITE_SENTRY_DSN: SET (https://abcdef123456...)

Optional Variables:
  ✓ VITE_SENTRY_RELEASE: SET (frontend@1.0.0)
  ...

╔═══════════════════════════════════════════════════════╗
║                       SUMMARY                         ║
╚═══════════════════════════════════════════════════════╝

✓ All required Sentry variables are configured!

Your Sentry integration should be working correctly.
Check your Sentry dashboard at https://sentry.io/ for events.
```

## Fixing Missing Variables

If the script shows missing variables:

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Select the service** (frontend, admin, or API)
3. **Go to Environment tab**
4. **Click "Add Environment Variable"**
5. **Add the missing variable:**
   - Key: `VITE_SENTRY_DSN` (or `SENTRY_DSN` for API)
   - Value: Your Sentry DSN (get from sentry.io)
6. **Click "Save Changes"**
7. **Redeploy the service**

### Getting Sentry DSN Values

If you don't have Sentry DSN values yet:

1. Go to [sentry.io](https://sentry.io/) and create an account
2. Create three projects:
   - `pc-solutions-frontend` (React)
   - `pc-solutions-admin` (React)
   - `pc-solutions-api` (Node.js)
3. For each project:
   - Go to **Settings** → **Client Keys (DSN)**
   - Copy the DSN (format: `https://[key]@[region].ingest.sentry.io/[id]`)
4. Add each DSN to the corresponding Render service

## Troubleshooting

### "Error: 401 Unauthorized"
- Your API key is invalid or expired
- Generate a new API key from Render Dashboard
- Run the script with the new key

### "Service not found"
- The service name in the script doesn't match the actual service name in Render
- Check your Render Dashboard for the exact service names
- You might need to update the service names in the script

### "Error: Network request failed"
- Check your internet connection
- Verify the Render API is accessible (https://api.render.com/)

### Script runs but no output
- Make sure you have the correct permissions on the API key
- The API key should have read access to services and environment variables

## Security Notes

1. **API Key Storage**: When using `--save-key`, the key is stored in `~/.render-api-key` with permissions `600` (readable only by you)
2. **Never commit**: Don't commit your API key to git
3. **Environment Variables**: The script shows masked values for security (only first 20 characters)
4. **Secrets**: `SENTRY_AUTH_TOKEN` values are fully redacted in the output

## Files

- `scripts/check-render-env.js` - Node.js script (recommended)
- `scripts/check-render-env.sh` - Bash script (alternative)
- Both scripts do the same thing, use whichever you prefer

## Alternative: Manual Check via Render Dashboard

If you prefer not to use scripts:

1. Go to https://dashboard.render.com/
2. Click on each service (frontend, admin, API)
3. Go to the **Environment** tab
4. Look for:
   - `VITE_SENTRY_DSN` (frontend/admin)
   - `SENTRY_DSN` (API)
5. If missing, add them

## After Configuration

Once you've added the Sentry DSN variables:

1. **Redeploy** each service in Render
2. **Check logs** - The "Sentry DSN not configured" message should disappear
3. **Verify Sentry** - Go to your Sentry dashboard and trigger a test error
4. **Monitor** - Errors should now appear in Sentry

## Related Documentation

- [SENTRY_CONFIGURATION_FIX.md](../SENTRY_CONFIGURATION_FIX.md) - Complete fix guide
- [SENTRY_QUICK_FIX.md](../SENTRY_QUICK_FIX.md) - Quick reference
- [SENTRY_INTEGRATION_GUIDE.md](../SENTRY_INTEGRATION_GUIDE.md) - Integration documentation
- [Render API Documentation](https://render.com/docs/api) - Official Render API docs
