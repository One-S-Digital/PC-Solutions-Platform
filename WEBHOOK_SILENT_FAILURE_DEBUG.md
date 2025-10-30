# Webhook Silent Failure Debug Guide

## Problem

You're getting "success" from Clerk webhook test, but:
- ❌ No data appearing in the database
- ❌ No logs appearing in Render backend

This is a **"silent success"** - the endpoint responds with 200/204, but doesn't actually do the work.

## Diagnostic Tools Added

I've added a diagnostics endpoint to help identify the issue:

### 1. Full Diagnostics
```bash
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics
```

This will show you:
- ✅ Database connection status
- ✅ Total AppUser and User counts
- ✅ Recent users created
- ✅ Test webhook users (emails ending in @clerk-test-webhook.local)

### 2. Recent Activity (Last Hour)
```bash
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics/recent
```

Shows all users created in the last hour.

## Common Causes & Solutions

### Cause #1: Wrong Test Type

**Issue**: Clerk has different test buttons:
- **Health Check**: Just pings the endpoint (doesn't create users)
- **Event Test**: Actually sends a `user.created` event

**Solution**: Make sure you're using the **"Send Example" or "Test Event"** button, not just connectivity test.

### Cause #2: Logs Not Streaming

**Issue**: Render logs can have delays or buffering issues.

**Solution**: 
1. Go to Render Dashboard → Your API Service → Logs
2. Make sure you're viewing **"All Logs"** not just errors
3. Look for lines starting with:
   - `🚨 WEBHOOK POST ENDPOINT CALLED`
   - `[E2E DEBUG]`
   - `[WEBHOOK]`

If you see NONE of these logs, the webhook isn't reaching your endpoint at all.

### Cause #3: Webhook URL Misconfigured

**Issue**: The webhook might be pointing to the wrong URL.

**Current Expected URLs**:
- Main webhook: `https://pc-solutions-api.onrender.com/api/webhooks/clerk`
- Health check: `https://pc-solutions-api.onrender.com/api/webhooks/clerk/health`
- Test endpoint: `https://pc-solutions-api.onrender.com/api/webhooks/clerk/test`

**Solution**: 
1. Go to Clerk Dashboard → Webhooks
2. Verify the URL is exactly: `https://pc-solutions-api.onrender.com/api/webhooks/clerk`
3. Make sure it's **NOT** one of these wrong URLs:
   - ❌ `/webhooks/clerk` (missing /api prefix)
   - ❌ `/api/webhook/clerk` (singular webhook)
   - ❌ `/clerk` (too short)

### Cause #4: Database Transaction Rollback

**Issue**: The code runs but transactions get rolled back due to an error.

**Solution**: Check the diagnostics endpoint to see if ANY users exist:

```bash
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics | jq '.database'
```

Expected output if working:
```json
{
  "connected": true,
  "appUserCount": 1,  // Should be > 0 if any webhooks worked
  "userCount": 1      // Should be > 0 if any webhooks worked
}
```

If both counts are 0, NO webhooks have successfully created users.

### Cause #5: Silent Database Errors

**Issue**: Database operations fail but errors are caught and swallowed.

**Solution**: Look in the webhook handler code (lines 628-637 and 667-679 in `clerk-webhook.controller.ts`):
- These log errors with `❌ [E2E DEBUG] FAILED TO UPSERT`
- If you see these in logs, there's a database issue

## Step-by-Step Debugging

### Step 1: Check if Webhooks Are Reaching Endpoint

```bash
# This should return webhook configuration
curl https://pc-solutions-api.onrender.com/api/webhooks/clerk/health
```

Expected: JSON with `status: "ok"` and webhook configuration.

If you get **404 Not Found**: Your API isn't running or routes aren't configured.

### Step 2: Send a Test Webhook from Clerk

1. Go to Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. Click **"Send Example"** or **"Test"** next to `user.created`
4. Wait 5 seconds

### Step 3: Check Diagnostics

```bash
# Run this immediately after sending test webhook
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics/recent
```

Expected output if working:
```json
{
  "lastHour": {
    "appUsersCreated": 1,
    "usersCreated": 1,
    "appUsers": [
      {
        "clerkId": "user_xxx",
        "email": "test-user_xxx@clerk-test-webhook.local",
        "role": "PARENT"
      }
    ]
  }
}
```

If `appUsersCreated` is 0: The webhook didn't process or failed silently.

### Step 4: Check Render Logs

In Render:
1. Go to your API service
2. Click "Logs"
3. Search for: `🚨 WEBHOOK POST`
4. If you find it, read the entire log sequence
5. Look for ❌ error messages

### Step 5: Check Clerk Webhook Delivery Logs

In Clerk Dashboard:
1. Go to Webhooks
2. Click your webhook
3. Click "Attempts" tab
4. Check the latest attempt:
   - **Status Code**: Should be 200 or 204
   - **Response**: Should be empty (204 No Content)
   - **Request**: Shows what Clerk sent
   - **Response Time**: Should be < 5 seconds

If status is 200/204 but no data in DB: **Silent failure confirmed**.

## Most Likely Issue

Based on your symptoms (success but no logs/data), the most likely issues are:

### #1: Wrong URL in Clerk
The webhook is hitting a different endpoint (like a load balancer health check) instead of your actual webhook handler.

**Fix**: Double-check the exact URL in Clerk dashboard.

### #2: Logs Aren't Being Streamed
Render sometimes buffers logs. The webhook IS working, but you can't see the logs.

**Fix**: Use the diagnostics endpoint to see if users are actually being created:
```bash
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics | jq '.database'
```

### #3: Database Connection Issue
The webhook receives the request but can't save to database.

**Fix**: Check diagnostics endpoint. If it returns an error, there's a database connectivity issue.

## Quick Test Script

Run this to test everything at once:

```bash
#!/bin/bash

echo "=== Testing Webhook Diagnostics ==="
echo ""

echo "1. Checking webhook health..."
curl -s https://pc-solutions-api.onrender.com/api/webhooks/clerk/health | jq .
echo ""

echo "2. Checking diagnostics..."
curl -s https://pc-solutions-api.onrender.com/api/webhooks/diagnostics | jq '.database'
echo ""

echo "3. Checking recent activity (last hour)..."
curl -s https://pc-solutions-api.onrender.com/api/webhooks/diagnostics/recent | jq '.lastHour | {appUsersCreated, usersCreated}'
echo ""

echo "=== Test Complete ==="
echo "If all commands returned valid JSON, your API is working."
echo "If appUsersCreated is 0, webhooks aren't creating users."
```

Save as `test-webhooks.sh`, make executable (`chmod +x test-webhooks.sh`), and run.

## Next Steps

1. **Push these changes** (diagnostics endpoint)
2. **Wait for Render deployment** to complete
3. **Run the diagnostics endpoint**
4. **Send a test webhook from Clerk**
5. **Run diagnostics again** to see if count increased

If counts don't increase, we know webhooks aren't processing. Then we check logs to see WHY.

## Need More Help?

Run the diagnostics and share the output:
```bash
curl https://pc-solutions-api.onrender.com/api/webhooks/diagnostics
```

Also check:
1. Clerk webhook delivery logs (Status codes)
2. Render application logs (Search for "WEBHOOK" or "E2E DEBUG")
3. Database connectivity (Can you connect via psql?)

---

**Files Modified**:
- ✅ `api/src/webhooks/diagnostics.controller.ts` (new)
- ✅ `api/src/webhooks/webhooks.module.ts` (added diagnostics controller)
- ✅ `WEBHOOK_SILENT_FAILURE_DEBUG.md` (this file)
