# Sentry Configuration - Check Render Environment Variables

**Created:** December 27, 2025  
**Issue:** Need to check actual Render environment variables, not just yaml configuration  
**Status:** ✅ RESOLVED

## Problem Statement

User wants to **check the actual environment variables set in Render**, not just the `render.yaml` configuration file. The yaml file only defines placeholders - the actual values are set in the Render Dashboard.

## Solution

Created two scripts to check Render environment variables via the Render API:

### 1. Node.js Script (Recommended)
**File:** `scripts/check-render-env.js`

**Features:**
- ✅ Checks all three services (frontend, admin, API)
- ✅ Shows which variables are set/missing
- ✅ Masks sensitive values for security
- ✅ Color-coded output (green=set, red=missing)
- ✅ Can save API key for future use
- ✅ Detailed summary and actionable recommendations
- ✅ No external dependencies (uses Node.js built-ins)

**Usage:**
```bash
# Save API key once
node scripts/check-render-env.js --save-key your-render-api-key

# Run checks anytime
node scripts/check-render-env.js
```

### 2. Bash Script (Alternative)
**File:** `scripts/check-render-env.sh`

**Features:**
- ✅ Same functionality as Node.js version
- ✅ Requires `curl` and `jq` (usually pre-installed)
- ✅ Good for CI/CD pipelines

**Usage:**
```bash
export RENDER_API_KEY=your-render-api-key
./scripts/check-render-env.sh
```

## What Gets Checked

### For Each Service:
1. **Service existence** - Verifies the service exists in Render
2. **Service ID** - Shows the Render service ID
3. **Required variables** - Checks critical Sentry variables
4. **Optional variables** - Checks enhancement variables

### Specific Variables Checked:

**Frontend (`pc-solutions-frontend`):**
- `VITE_SENTRY_DSN` ⚠️ **REQUIRED**
- `VITE_SENTRY_RELEASE` (optional)
- `SENTRY_ORG` (optional)
- `SENTRY_PROJECT` (optional)
- `SENTRY_AUTH_TOKEN` (optional)

**Admin (`pc-solutions-admin`):**
- `VITE_SENTRY_DSN` ⚠️ **REQUIRED**
- `VITE_SENTRY_RELEASE` (optional)
- `SENTRY_ORG` (optional)
- `SENTRY_PROJECT` (optional)
- `SENTRY_AUTH_TOKEN` (optional)

**API (`pc-solutions-v2`):**
- `SENTRY_DSN` ⚠️ **REQUIRED**
- `SENTRY_RELEASE` (optional)
- `SENTRY_ORG` (optional)
- `SENTRY_PROJECT` (optional)
- `SENTRY_AUTH_TOKEN` (optional)

## How to Get Render API Key

1. Go to https://dashboard.render.com/
2. Click your profile picture → **Account Settings**
3. Navigate to **API Keys** in the left sidebar
4. Click **Create API Key**
5. Give it a name (e.g., "Environment Variables Check")
6. Copy the generated API key
7. Use it with the script

## Example Output

### When Missing Variables:
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
  ...

╔═══════════════════════════════════════════════════════╗
║                       SUMMARY                         ║
╚═══════════════════════════════════════════════════════╝

✗ Missing Required Sentry Variables:
  • Frontend: VITE_SENTRY_DSN
  • Admin: VITE_SENTRY_DSN
  • API: SENTRY_DSN

📋 To fix this:
1. Go to https://dashboard.render.com/
2. Select the service
3. Go to Environment tab
4. Add the missing variable(s)
5. Save and redeploy
```

### When All Variables Are Set:
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

## Security Features

1. **API Key Storage**: When saved with `--save-key`, stored in `~/.render-api-key` with permissions `600`
2. **Value Masking**: Environment variable values are masked (only first 20 chars shown)
3. **Token Redaction**: `AUTH_TOKEN` values are fully redacted
4. **No Git Commits**: API key file is in `.gitignore` pattern
5. **Safe Defaults**: Script fails gracefully if no API key provided

## Integration with Existing Docs

Updated documentation files to reference the new scripts:

1. **SENTRY_CONFIGURATION_FIX.md** - Added "Step 0" to check current config
2. **SENTRY_QUICK_FIX.md** - Added check section at the top
3. **scripts/README-check-render-env.md** - Complete standalone guide

## Files Created

1. `/workspace/scripts/check-render-env.js` - Node.js implementation ⭐ Recommended
2. `/workspace/scripts/check-render-env.sh` - Bash implementation
3. `/workspace/scripts/README-check-render-env.md` - Comprehensive documentation
4. `/workspace/SENTRY_RENDER_ENV_CHECK.md` - This summary

## Files Modified

1. `/workspace/SENTRY_CONFIGURATION_FIX.md` - Added Step 0
2. `/workspace/SENTRY_QUICK_FIX.md` - Added check section

## Workflow

### Complete Workflow for User:

1. **Check current state:**
   ```bash
   node scripts/check-render-env.js --save-key YOUR_API_KEY
   node scripts/check-render-env.js
   ```

2. **If variables are missing:**
   - Create Sentry projects at sentry.io
   - Get DSN values from each project
   - Add to Render Dashboard
   - Redeploy services

3. **Verify configuration:**
   ```bash
   node scripts/check-render-env.js
   ```

4. **Check Sentry Dashboard:**
   - Go to sentry.io
   - Verify events are coming in
   - No more "DSN not configured" messages

## Technical Implementation

### API Endpoints Used:
- `GET /v1/services?name={serviceName}` - Get service by name
- `GET /v1/services/{serviceId}/env-vars` - Get environment variables

### Error Handling:
- ✅ Invalid API key
- ✅ Service not found
- ✅ Network errors
- ✅ Invalid JSON responses
- ✅ Missing permissions

### Exit Codes:
- `0` - All required variables are set
- `1` - Missing required variables or errors

## Next Steps for User

1. ✅ **Get Render API Key** from Dashboard
2. ✅ **Run the script** to see current state
3. ⏭️ **Add missing variables** in Render Dashboard
4. ⏭️ **Redeploy services**
5. ⏭️ **Run script again** to verify
6. ⏭️ **Check Sentry Dashboard** for events

## Related Documentation

- [scripts/README-check-render-env.md](./scripts/README-check-render-env.md) - Script usage guide
- [SENTRY_CONFIGURATION_FIX.md](./SENTRY_CONFIGURATION_FIX.md) - How to fix missing variables
- [SENTRY_QUICK_FIX.md](./SENTRY_QUICK_FIX.md) - Quick reference
- [SENTRY_DSN_INVESTIGATION.md](./SENTRY_DSN_INVESTIGATION.md) - Original investigation
- [Render API Docs](https://render.com/docs/api) - Official Render API documentation

## Notes

- **No Render CLI Required**: Uses direct HTTPS API calls, no need to install Render CLI
- **Cross-platform**: Works on Linux, macOS, and Windows (with Node.js)
- **CI/CD Ready**: Can be integrated into CI/CD pipelines
- **Idempotent**: Safe to run multiple times
- **Read-only**: Only reads environment variables, doesn't modify anything
