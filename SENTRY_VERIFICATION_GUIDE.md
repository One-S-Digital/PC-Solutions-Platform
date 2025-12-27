# Sentry Verification Guide - Render Deployment

This guide helps you verify that Sentry is properly configured and functioning after setting the DSN in your Render environment variables.

## Quick Status Check

### ✅ Step 1: Verify Environment Variable is Set

In your Render dashboard:
1. Go to your service → **Environment** tab
2. Confirm these variables exist:
   - API: `SENTRY_DSN` = `https://...@o*.ingest.sentry.io/...`
   - Frontend: `VITE_SENTRY_DSN` = `https://...@o*.ingest.sentry.io/...`
   - Admin: `VITE_SENTRY_DSN` = `https://...@o*.ingest.sentry.io/...`

**Important**: Make sure there are no extra spaces or quotes around the DSN value!

### ✅ Step 2: Check Application Logs

After deployment, check your Render logs:

1. Go to **Logs** tab in Render
2. Look for Sentry initialization messages at startup
3. **Good signs**: No Sentry-related errors
4. **Bad signs**: 
   - "Sentry DSN not configured"
   - "Invalid DSN format"
   - Network errors when connecting to Sentry

### ✅ Step 3: Test with API Endpoint (Easiest Method)

I've added a test endpoint to your health controller. Simply call:

```bash
# Replace with your actual API URL
curl https://your-api.onrender.com/health/sentry
```

**Expected Response:**
```json
{
  "message": "Test error sent to Sentry successfully! Check your Sentry dashboard in a few seconds.",
  "sentryEnabled": true,
  "eventId": "abc123...",
  "timestamp": "2025-12-27T..."
}
```

**If Not Configured:**
```json
{
  "message": "Sentry is not configured. Set SENTRY_DSN environment variable.",
  "sentryEnabled": false,
  "timestamp": "2025-12-27T..."
}
```

### ✅ Step 4: Check Sentry Dashboard

1. Go to https://sentry.io
2. Navigate to your project (e.g., "api")
3. Click **Issues** in the left sidebar
4. You should see:
   - "Sentry Test Exception - This is a test error to verify Sentry integration"
   - Timestamp should match when you called the endpoint

**Timeline**: Errors typically appear in 5-30 seconds.

## Detailed Verification Methods

### Method 1: Browser-Based Testing (Frontend/Admin)

1. **Visit your deployed site** (Frontend or Admin)
2. **Look for the feedback widget**: 
   - Should appear as a floating button (usually bottom-right)
   - If you don't see it, Sentry might not be initialized

3. **Open Browser Console** (F12):
   ```javascript
   // Check if Sentry is loaded
   console.log(window.Sentry ? 'Sentry loaded ✓' : 'Sentry NOT loaded ✗');
   
   // Test error capture
   if (window.Sentry) {
     Sentry.captureMessage('Frontend Sentry Test');
   }
   ```

4. **Check Sentry Dashboard**: Look for your test message in the Issues tab

### Method 2: Trigger a Real Error

#### API:
```bash
# Call an endpoint that doesn't exist (should create 404 error)
curl https://your-api.onrender.com/api/nonexistent-endpoint

# Or trigger a real error in your code temporarily
```

#### Frontend/Admin:
1. Navigate to a page
2. Temporarily add this to a component:
   ```javascript
   useEffect(() => {
     throw new Error('Test Sentry Integration');
   }, []);
   ```
3. Load the page
4. Check Sentry dashboard

### Method 3: Check Network Requests

In your browser DevTools:
1. Open **Network** tab
2. Filter by "sentry"
3. You should see POST requests to `sentry.io/api/.../envelope/`
4. Status should be `200 OK` or `202 Accepted`

## Troubleshooting

### ❌ "sentryEnabled: false" in test endpoint

**Problem**: SENTRY_DSN environment variable is not set

**Solution**:
1. Go to Render Dashboard → Environment
2. Add `SENTRY_DSN` with your DSN value
3. **Important**: Click "Save Changes" and wait for automatic redeploy
4. Test again after deployment completes

### ❌ Events not appearing in Sentry Dashboard

**Possible causes**:

1. **Wrong DSN**: 
   - Verify the DSN matches your Sentry project
   - Check for typos or extra characters
   - Format should be: `https://PUBLIC_KEY@o*.ingest.sentry.io/PROJECT_ID`

2. **Network firewall**: 
   - Render should allow outbound HTTPS traffic by default
   - Check if you have any network restrictions

3. **Wrong Sentry project**:
   - Make sure you're checking the correct project in Sentry
   - API errors go to "api" project
   - Frontend errors go to "frontend" project
   - Admin errors go to "admin" project

4. **Rate limiting**:
   - Sentry free tier: 5,000 events/month
   - Check if you've hit the limit

5. **Sentry service status**:
   - Check https://status.sentry.io/

### ❌ Feedback widget not showing (Frontend/Admin)

**Possible causes**:

1. **Sentry not initialized**: Check browser console for errors
2. **DSN not configured**: Verify `VITE_SENTRY_DSN` is set
3. **Cache issue**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Build issue**: Check if Vite build included Sentry code

### ❌ Source maps not working (seeing minified code)

**This is expected** if you haven't configured source map upload yet.

**To fix** (optional but recommended):
1. Get auth token from Sentry: Settings → Account → API → Auth Tokens
2. Add to Render environment:
   ```
   SENTRY_AUTH_TOKEN=your-token
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=api (or frontend/admin)
   ```
3. Redeploy

## Verification Checklist

Use this checklist to confirm everything is working:

### API
- [ ] `SENTRY_DSN` environment variable is set in Render
- [ ] `/health/sentry` endpoint returns `sentryEnabled: true`
- [ ] Test error appears in Sentry dashboard within 30 seconds
- [ ] Error has stack trace (even if minified)
- [ ] Error shows correct environment (production)

### Frontend
- [ ] `VITE_SENTRY_DSN` environment variable is set in Render
- [ ] Feedback widget is visible on the page
- [ ] Browser console shows no Sentry errors
- [ ] Network tab shows requests to `sentry.io`
- [ ] Test errors appear in Sentry dashboard

### Admin
- [ ] `VITE_SENTRY_DSN` environment variable is set in Render
- [ ] Feedback widget is visible on the page
- [ ] Browser console shows no Sentry errors
- [ ] Network tab shows requests to `sentry.io`
- [ ] Test errors appear in Sentry dashboard

## What Sentry Will Capture

Once verified, Sentry will automatically capture:

### Errors
- ✅ Uncaught exceptions
- ✅ Promise rejections
- ✅ HTTP 500 errors
- ✅ Database errors
- ✅ Runtime errors in React components

### Performance (10% sample rate in production)
- ✅ API response times
- ✅ Database query performance
- ✅ Page load times
- ✅ React component render times

### User Feedback
- ✅ Bug reports submitted via widget
- ✅ Feature requests
- ✅ User comments with context

### Session Replay (10% sample rate, 100% on errors)
- ✅ User actions leading to errors
- ✅ DOM mutations
- ✅ Console logs
- ✅ Network requests

**Note**: All sensitive data is automatically filtered (passwords, tokens, PII)

## Monitoring Best Practices

### Daily
- [ ] Check Sentry dashboard for new errors
- [ ] Review critical/high priority issues
- [ ] Respond to user feedback

### Weekly
- [ ] Review performance trends
- [ ] Identify repeat issues
- [ ] Update release notes

### After Deployment
- [ ] Check for spike in errors
- [ ] Verify new features work correctly
- [ ] Monitor performance impact

## Quick Reference

### API Test Endpoint
```bash
curl https://your-api.onrender.com/health/sentry
```

### Browser Console Test (Frontend/Admin)
```javascript
Sentry.captureMessage('Test from console');
```

### Expected DSN Format
```
https://abc123def456@o0123456.ingest.sentry.io/7654321
       ↑           ↑                      ↑
    Public Key    Org ID              Project ID
```

### Sentry Dashboard Links
- Issues: https://sentry.io/organizations/YOUR_ORG/issues/
- Performance: https://sentry.io/organizations/YOUR_ORG/performance/
- Feedback: https://sentry.io/organizations/YOUR_ORG/feedback/

## Success Indicators

You'll know Sentry is working correctly when:

1. ✅ Test endpoint returns `sentryEnabled: true`
2. ✅ Test errors appear in dashboard within 30 seconds
3. ✅ Feedback widget is visible (Frontend/Admin)
4. ✅ Real errors are captured automatically
5. ✅ Performance metrics are being tracked
6. ✅ No Sentry errors in application logs

## Getting Help

If you're still having issues after following this guide:

1. **Check the logs**: Look for specific error messages in Render logs
2. **Verify DSN**: Copy-paste it again to ensure it's correct
3. **Test locally**: Set the DSN in your local `.env` file and test
4. **Sentry docs**: https://docs.sentry.io/platforms/javascript/
5. **Check status**: https://status.sentry.io/

## Next Steps After Verification

Once Sentry is verified and working:

1. **Set up alerts**: Configure email/Slack notifications for critical errors
2. **Create workflows**: Set up auto-assignment rules for issues
3. **Add context**: Use `Sentry.setUser()` to track which user encountered errors
4. **Monitor actively**: Make checking Sentry part of your daily routine
5. **Train your team**: Show everyone how to use the Sentry dashboard

---

**Last Updated**: December 27, 2025
**Created by**: Sentry Integration Setup
