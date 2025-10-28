# Clerk Webhook Debugging Guide

## Overview

This guide explains how to use the comprehensive debug logging implemented for Clerk webhooks to identify and fix webhook issues.

## Debug Logging Levels

The Clerk webhook controller now includes extensive debug logging at multiple levels:

### 1. **Initialization Logs** (On Server Start)
When the server starts, you'll see initialization logs:

```
================================================================================
🚀 [WEBHOOK INIT] Starting Clerk Webhook Controller Initialization
================================================================================
🔍 [WEBHOOK INIT] Configuration check: {
  "timestamp": "2025-10-28T...",
  "nodeEnv": "development",
  "hasClerkSecretKey": true,
  "hasWebhookSecret": true,
  "clerkSecretKeyPrefix": "sk_test_...",
  "webhookSecretLength": 64,
  ...
}
✅ [WEBHOOK INIT] Clerk webhook controller initialized successfully
✅ [WEBHOOK INIT] Ready to receive webhooks at: POST /api/webhooks/clerk
================================================================================
```

**What to check:**
- ✅ Both `hasClerkSecretKey` and `hasWebhookSecret` should be `true`
- ✅ `webhookSecretLength` should be around 60-70 characters
- ❌ If either secret is missing, the server will throw an error with instructions

### 2. **Body Parsing Debug Logs** (Per Request)
When a webhook request arrives, body parsing is logged:

```
🔍 [WEBHOOK BODY DEBUG] Clerk webhook request intercepted
🔍 [WEBHOOK BODY DEBUG] Before raw parser: {
  "method": "POST",
  "contentType": "application/json",
  "contentLength": "1234",
  ...
}
🔍 [WEBHOOK BODY DEBUG] After raw parser: {
  "hasBody": true,
  "bodyType": "object",
  "isBuffer": true,
  "bodyLength": 1234,
  ...
}
```

**What to check:**
- ✅ `isBuffer` should be `true` (webhook needs raw body)
- ✅ `bodyLength` should match `contentLength`
- ❌ If body is empty or wrong type, there's a middleware issue

### 3. **Request Details** (Per Webhook)
Each webhook request gets a unique ID and logs all details:

```
================================================================================
🔔 [WEBHOOK abc123] NEW WEBHOOK REQUEST RECEIVED
================================================================================
📥 [WEBHOOK abc123] Request Details: {
  "timestamp": "2025-10-28T...",
  "method": "POST",
  "url": "/api/webhooks/clerk",
  "ip": "54.123.45.67",
  ...
}
📋 [WEBHOOK abc123] All Headers: {
  "content-type": "application/json",
  "svix-id": "msg_2ab3...",
  "svix-timestamp": "1698765432",
  "svix-signature": "present (length: 120)",
  ...
}
📦 [WEBHOOK abc123] Body Details: {
  "bodyExists": true,
  "bodyType": "object",
  "bodyLength": 1234,
  ...
}
```

### 4. **Signature Verification** (Critical Step)
The signature verification process is logged in detail:

```
🔐 [WEBHOOK abc123] Starting signature verification...
🔐 [WEBHOOK abc123] Verification inputs: {
  "secretConfigured": true,
  "secretLength": 64,
  "secretPrefix": "whsec_abc...",
  "bodyExists": true,
  "bodyLength": 1234,
  ...
}
✅ [WEBHOOK abc123] ✨ SIGNATURE VERIFICATION SUCCESSFUL! ✨
```

**Or if it fails:**
```
❌ [WEBHOOK abc123] ⚠️ SIGNATURE VERIFICATION FAILED! ⚠️
❌ [WEBHOOK abc123] Error details: {
  "errorMessage": "Signature verification failed",
  "errorType": "Error",
  ...
}
❌ [WEBHOOK abc123] Possible causes:
   1. Webhook secret mismatch (verify CLERK_WEBHOOK_SECRET matches Clerk dashboard)
   2. Body parsing issue (check Express body-parser middleware)
   3. Request modification by proxy/middleware
   4. Timestamp too old/new (check server time sync)
```

### 5. **Event Processing** (Business Logic)
After verification, event processing is logged:

```
🔄 [WEBHOOK abc123] Starting event processing...
🔄 [WEBHOOK abc123] Event summary: {
  "type": "user.created",
  "userId": "user_2ab3...",
  "email": "user@example.com",
  ...
}

🎯 [processEvent] Routing event type: user.created
🆕 [processEvent] Routing to handleUserCreated()

👤 [handleUserCreated] Starting user creation for clerkId: user_2ab3...
👤 [handleUserCreated] Full user data: { ... }
👤 [handleUserCreated] Role resolution: {
  "privateMetadataRole": "TEACHER",
  "resolvedIntendedRole": "TEACHER",
  "finalRole": "TEACHER",
  ...
}
💾 [handleUserCreated] Upserting AppUser in database...
✅ [handleUserCreated] AppUser upserted: {
  "appUserId": 123,
  "appUserRole": "TEACHER"
}
✅ [handleUserCreated] User creation complete
```

### 6. **Performance Metrics**
Each webhook includes timing information:

```
⏱️ [WEBHOOK abc123] Performance: {
  "processingTime": "234ms",
  "totalTime": "267ms",
  "overheadTime": "33ms"
}
✅ [WEBHOOK abc123] ✨ EVENT PROCESSED SUCCESSFULLY! ✨
```

## Common Issues and How to Diagnose

### Issue 1: Webhook Not Receiving Requests

**Symptoms:**
- No logs at all when webhook should fire

**Debug steps:**
1. Check if the server is running and reachable
2. Test the health endpoint: `GET /api/webhooks/clerk/health`
3. Check Clerk Dashboard > Webhooks > Delivery Attempts
4. Verify the webhook URL is correctly configured in Clerk
5. Check firewall/network settings

### Issue 2: Signature Verification Fails

**Symptoms:**
```
❌ [WEBHOOK abc123] ⚠️ SIGNATURE VERIFICATION FAILED! ⚠️
```

**Debug steps:**
1. **Check the webhook secret:**
   ```bash
   # In your deployment, verify:
   echo $CLERK_WEBHOOK_SECRET
   ```
   - Compare with Clerk Dashboard > Webhooks > Signing Secret
   - Secret should start with `whsec_`
   - Length should be ~64 characters

2. **Check body parsing:**
   - Look for `🔍 [WEBHOOK BODY DEBUG]` logs
   - Verify `isBuffer: true`
   - Verify `bodyLength` matches `contentLength`

3. **Check timestamp:**
   - Ensure server time is synchronized (NTP)
   - Svix rejects requests with timestamp > 5 minutes old

4. **Check for middleware interference:**
   - Ensure no middleware modifies the raw body
   - Check proxy settings (nginx, load balancer)

### Issue 3: Webhook Verified But Processing Fails

**Symptoms:**
```
✅ [WEBHOOK abc123] ✨ SIGNATURE VERIFICATION SUCCESSFUL! ✨
❌ [WEBHOOK abc123] ⚠️ FAILED TO PROCESS WEBHOOK EVENT! ⚠️
```

**Debug steps:**
1. Look at the error details in the logs
2. Check database connectivity
3. Check Clerk API connectivity
4. Verify user data structure matches expectations
5. Check role validation logic

### Issue 4: Duplicate Events

**Symptoms:**
```
⏭️ [WEBHOOK abc123] DUPLICATE EVENT DETECTED: msg_2ab3...
```

**This is normal!** Clerk may send webhooks multiple times. The system tracks processed events and ignores duplicates.

### Issue 5: User Role Not Set Correctly

**Debug steps:**
1. Look at the role resolution logs:
   ```
   👤 [handleUserCreated] Role resolution: {
     "privateMetadataRole": "TEACHER",
     "unsafeMetadataRole": null,
     ...
   }
   ```
2. Check where the role is being set:
   - Private metadata (from invitations)
   - Unsafe metadata (from signup)
3. Verify the role is valid: `PARENT`, `TEACHER`, `ADMIN`, `SUPER_ADMIN`

## Testing Webhooks

### 1. Use Clerk Dashboard Test Feature
Clerk Dashboard > Webhooks > Select Event > Send Example

### 2. Check Webhook Delivery Status
Clerk Dashboard > Webhooks > Delivery Attempts
- Shows success/failure status
- Shows response codes
- Shows delivery timing

### 3. Monitor Real-time Logs
```bash
# If using Docker Compose
docker-compose logs -f api

# If running locally
npm run start:dev

# On production (Render)
Check the Logs tab in your service dashboard
```

### 4. Test Health Endpoint
```bash
curl https://your-api-domain.com/api/webhooks/clerk/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T...",
  "webhookConfigured": true,
  "clerkClientConfigured": true,
  "message": "Webhook is properly configured"
}
```

## Environment Variables Checklist

Ensure these are set in your environment:

```bash
# Required for webhook functionality
CLERK_SECRET_KEY=sk_test_...              # From Clerk Dashboard > API Keys
CLERK_WEBHOOK_SECRET=whsec_...            # From Clerk Dashboard > Webhooks > Signing Secret

# Required for general Clerk functionality
CLERK_PUBLISHABLE_KEY=pk_test_...         # From Clerk Dashboard > API Keys
```

## Log Levels

Debug logging is automatically enabled based on `NODE_ENV`:

- **Development:** `debug` level (all logs visible)
- **Production:** `info` level (debug logs hidden by default)

To enable debug logs in production:
```bash
LOG_LEVEL=debug
```

## Filtering Logs

When reviewing logs, you can filter by:

1. **Request ID:** `[WEBHOOK abc123]`
   - Groups all logs for a single webhook request

2. **Stage:**
   - `[WEBHOOK INIT]` - Initialization logs
   - `[WEBHOOK BODY DEBUG]` - Body parsing logs
   - `[WEBHOOK abc123]` - Request-specific logs
   - `[processEvent]` - Event routing logs
   - `[handleUserCreated]` - User creation logs
   - `[handleUserUpdated]` - User update logs
   - `[handleUserDeleted]` - User deletion logs

3. **Status:**
   - ✅ Success messages
   - ❌ Error messages
   - ⚠️ Warning messages
   - 🔍 Debug information

## Best Practices

1. **Always check initialization logs first** - Ensure secrets are configured
2. **Use health endpoint** - Quick way to verify webhook is ready
3. **Monitor Clerk Dashboard** - Check delivery status there first
4. **Use request IDs** - Makes it easy to trace a single webhook through logs
5. **Check timing** - Look at performance metrics to identify slow operations

## Getting Help

If you're still having issues after reviewing the logs:

1. Gather the following information:
   - Full initialization logs
   - Full logs for a failed webhook request (include request ID)
   - Screenshot from Clerk Dashboard > Webhooks > Delivery Attempts
   - Environment (development, staging, production)

2. Check these common configuration issues:
   - Webhook secret mismatch
   - Network/firewall blocking requests
   - Server time drift
   - Middleware modifying request body

3. Consult:
   - [Clerk Webhook Documentation](https://clerk.com/docs/integrations/webhooks)
   - [Svix Webhook Documentation](https://docs.svix.com/)
   - This project's `CLERK_AUTHENTICATION_SETUP.md`
