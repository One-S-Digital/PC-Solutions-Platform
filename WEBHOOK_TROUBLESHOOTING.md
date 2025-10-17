# Clerk Webhook Troubleshooting

## Issue: Users Getting Default PARENT Role

Even though webhook is configured in Clerk, users are still being created with PARENT role fallback.

## Possible Causes

### 1. Backend Not Receiving Webhooks

**Check in Clerk Dashboard:**
1. Go to: Webhooks
2. Find your webhook endpoint: `https://pc-solutions-v2.onrender.com/api/webhooks/clerk`
3. Click on it → Go to **Logs** tab
4. Look for recent webhook deliveries

**What to check:**
- ✅ **Status 204**: Webhook succeeded
- ❌ **Status 400/500**: Webhook failed
- ❌ **Timeout/No delivery**: Webhook not reaching backend

### 2. Missing or Wrong Webhook Secret

**In Render Dashboard:**
1. Go to: pc-solutions-api (backend service)
2. Environment → Check for: `CLERK_WEBHOOK_SECRET`
3. Verify it exists and matches Clerk's signing secret

**If missing:**
- Backend will throw error on startup: `CLERK_WEBHOOK_SECRET is not configured`
- Webhook endpoint won't work at all

**If wrong:**
- Webhook will return: `400 Invalid signature`
- Check Clerk logs for this error

### 3. Webhook Events Not Selected

**In Clerk Dashboard:**
1. Go to: Webhooks → Your endpoint
2. Check **Message Filtering**
3. Ensure these are selected:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

### 4. Backend Processing Error

**Check Render Logs:**
```bash
# In Render Dashboard
# Go to: pc-solutions-api → Logs
# Search for: "webhook" or "Clerk webhook"
```

**Look for:**
- ❌ `Invalid webhook signature` - Wrong secret
- ❌ `Failed to process webhook event` - Processing error
- ❌ `CLERK_WEBHOOK_SECRET is not configured` - Missing secret
- ✅ `Processing user.created event` - Working

## How to Debug

### Step 1: Check Backend Logs

In Render Dashboard → pc-solutions-api → Logs, search for recent webhook activity.

**During a user signup, you should see:**
```
Processing user.created event for user: user_xxx
Creating AppUser from webhook: { clerkId: 'user_xxx', email: '...', role: 'FOUNDATION' }
AppUser created successfully via webhook
```

**If you see nothing:** Backend isn't receiving webhooks

### Step 2: Check Clerk Webhook Logs

In Clerk Dashboard → Webhooks → Your endpoint → Logs:

**Success (200-299 status):**
```
✅ Delivered successfully
Status: 204
Response time: ~100ms
```

**Failure (400-599 status):**
```
❌ Failed
Status: 400 Invalid signature
OR
Status: 500 Internal Server Error
```

### Step 3: Test Webhook Manually

In Clerk Dashboard → Webhooks → Your endpoint:
1. Click **Send Example**
2. Select event: `user.created`
3. Click **Send**
4. Check response and backend logs

### Step 4: Verify Environment Variable

**Quick Check:**

1. In Render Dashboard → pc-solutions-api
2. Environment tab
3. Look for: `CLERK_WEBHOOK_SECRET`
4. Value should start with: `whsec_...`

**If missing, add it:**
```
Key: CLERK_WEBHOOK_SECRET
Value: whsec_YOUR_SIGNING_SECRET_FROM_CLERK
```

Then redeploy.

## What's Happening Now

Based on the logs you shared, the backend is **auto-creating users** with PARENT role:

```
🔐 Auth Debug: AppUser missing, creating baseline user with PARENT role
{ userId: 'user_3294hGWOgY28Bu8V8P8kPdpA6NB' }
```

This fallback only triggers when:
1. User authenticates with Clerk ✅
2. Backend looks for user in database ❌ (not found)
3. Backend creates fallback user with PARENT role

**Why user is missing from database:**
- Webhook didn't create the user during signup
- Either webhook isn't configured, or it's failing

## Expected vs Actual Flow

### Expected (With Working Webhook):
```
1. User signs up in Clerk with FOUNDATION role
2. Clerk sends webhook → Backend receives it
3. Backend creates AppUser with role: FOUNDATION
4. User logs in
5. Backend finds existing user with FOUNDATION role ✅
```

### Actual (Webhook Not Working):
```
1. User signs up in Clerk with FOUNDATION role
2. Clerk tries to send webhook → ???
3. Backend doesn't create AppUser (webhook failed/not received)
4. User logs in
5. Backend doesn't find user → Creates fallback with PARENT role ❌
```

## Quick Fix Commands

### Check Backend Has Webhook Secret
```bash
# In Render Dashboard
# Go to: pc-solutions-api → Environment
# Look for: CLERK_WEBHOOK_SECRET
```

### Check Webhook Endpoint is Accessible
```bash
# Test from your terminal:
curl -X POST https://pc-solutions-v2.onrender.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: Should get some response (not 404)
# 400 "Missing Svix headers" = Endpoint exists ✅
# 404 Not Found = Endpoint doesn't exist ❌
```

### View Recent Backend Logs
```bash
# In Render Dashboard
# Go to: pc-solutions-api → Logs
# Filter/Search for: "webhook"
```

## Next Steps

1. **Check Clerk webhook logs** - See if webhooks are being delivered
2. **Check Render environment** - Verify `CLERK_WEBHOOK_SECRET` exists
3. **Check backend logs** - Look for webhook processing errors
4. **Share findings** - Tell me what you see in:
   - Clerk webhook logs (delivery status)
   - Render environment (has CLERK_WEBHOOK_SECRET?)
   - Backend logs (webhook errors?)

Based on what you find, we can fix the exact issue preventing webhooks from creating users with correct roles.

## Common Fixes

**If webhook secret is missing:**
1. Get signing secret from Clerk Dashboard → Webhooks → Your endpoint
2. Add to Render: `CLERK_WEBHOOK_SECRET` = `whsec_...`
3. Redeploy backend

**If signature is invalid:**
1. Make sure you copied the entire secret including `whsec_` prefix
2. No extra spaces or characters
3. Update in Render and redeploy

**If webhooks aren't being sent:**
1. Verify endpoint URL in Clerk is correct
2. Ensure events are selected (user.created, etc.)
3. Test with "Send Example" in Clerk Dashboard
