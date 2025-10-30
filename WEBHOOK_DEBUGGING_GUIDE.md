# 🔍 Webhook Debugging Guide

## 🎉 Progress So Far

✅ **FIXED**: Nested forms bug - verification form now submits correctly  
✅ **FIXED**: Verification completes successfully  
❌ **NEW ISSUE**: Webhook processing times out after 30 seconds

---

## 🐛 Current Issue

### What's Happening
```
1. ✅ User signs up
2. ✅ Clerk creates account
3. ✅ User verifies email
4. ✅ "Setting up your profile" screen shows
5. ⏳ Progress bar reaches 100%
6. ⏳ Continues loading for ~30 seconds
7. ❌ Times out → Returns to verification screen
```

### Root Cause
The frontend is waiting for the backend to create the user in the database, but:
- **Either**: Clerk webhook is not being delivered
- **Or**: Webhook is failing to create the user
- **Or**: There's an error in the webhook processing

---

## 🔄 How Signup Works

```
┌─────────┐  1. Sign up    ┌───────┐
│  User   │──────────────>│ Clerk │
└─────────┘                └───┬───┘
     ↑                         │
     │                         │ 2. Send webhook
     │                         ↓
     │                    ┌─────────┐
     │   4. Redirect      │ Backend │
     │   to dashboard     │  API    │
     └────────────────────┴─────────┘
                               ↑
                               │ 3. Poll for user
                          ┌────┴────┐
                          │Frontend │
                          └─────────┘
```

### Step-by-Step
1. **User submits signup** → Clerk creates account
2. **Clerk sends webhook** → `/api/webhooks/clerk` with `user.created` event
3. **Backend processes webhook** → Creates user in database
4. **Frontend polls** → `/api/users/webhook-status/:clerkId` every 1 second
5. **When user exists** → Redirect to dashboard
6. **If 30s timeout** → Show error and return to verification

---

## 📋 Debugging Steps

### Step 1: Check Render Backend Logs

Go to Render dashboard → `pc-solutions-api` → Logs

#### Look for these logs:

##### A. **Webhook Received** (should appear immediately after verification)
```
🔔 [WEBHOOK] Received Clerk webhook: user.created | ClerkId: user_xxxxx
📦 [WEBHOOK] Payload: {...}
🔐 [WEBHOOK] Headers: svixId=msg_xxxxx, svixTimestamp=xxxxx, svixSignature=present
```

##### B. **Signature Verification**
```
✅ [WEBHOOK] Signature verified, processing event...
```
Or:
```
❌ [WEBHOOK] Invalid webhook signature!
```

##### C. **User Creation**
```
Creating user: user_xxxxx (attempt 1/4)
AppUser created: uuid for ClerkId: user_xxxxx
User profile created: uuid for ClerkId: user_xxxxx
✅ User created successfully: user_xxxxx
```

##### D. **Polling Checks** (should appear ~30 times over 30 seconds)
```
🔍 [WEBHOOK-STATUS] Checking status for ClerkId: user_xxxxx
⏳ [WEBHOOK-STATUS] User not yet created (still waiting for webhook)
```
Then eventually:
```
✅ [WEBHOOK-STATUS] User exists! AppUserId: uuid
```

---

### Step 2: Check Browser Console

After running signup, look for:

##### A. **Webhook Polling Started**
```
🚀 [WEBHOOK] Starting polling for user creation...
```

##### B. **Each Poll Attempt** (every 1 second)
```
🔄 [WEBHOOK] Polling attempt...
🔍 [WEBHOOK] Checking status for clerkId: user_xxxxx
📡 [WEBHOOK] API response: { status: 200, ok: true }
📦 [WEBHOOK] API data: { success: true, data: { exists: false, ... } }
⏳ [WEBHOOK] User not yet created, continuing to poll...
```

##### C. **Success**
```
✅ [WEBHOOK] User exists! Signup complete.
```

##### D. **Timeout** (after 30 seconds)
```
⏱️ [WEBHOOK] 30-second timeout reached
❌ [WEBHOOK] Timeout - user was never created
```

---

## 🎯 Diagnosis Scenarios

### Scenario 1: No Webhook Received
**Backend logs**: No `🔔 [WEBHOOK] Received` message

**Cause**: Clerk is not delivering the webhook

**Fix**:
1. Check Clerk Dashboard → Webhooks
2. Verify webhook URL: `https://your-api.onrender.com/api/webhooks/clerk`
3. Check webhook is enabled for `user.created` event
4. Test webhook delivery in Clerk dashboard

---

### Scenario 2: Signature Verification Fails
**Backend logs**: `❌ [WEBHOOK] Invalid webhook signature!`

**Cause**: `CLERK_WEBHOOK_SECRET` env var is incorrect or missing

**Fix**:
1. Go to Clerk Dashboard → Webhooks
2. Copy the signing secret
3. Update Render env var `CLERK_WEBHOOK_SECRET`
4. Redeploy API service

---

### Scenario 3: User Creation Fails
**Backend logs**: 
```
🔔 [WEBHOOK] Received...
✅ [WEBHOOK] Signature verified...
❌ Failed to create user user_xxxxx (attempt 1): [error details]
```

**Cause**: Database error, missing fields, or validation failure

**Fix**:
1. Check the error message in logs
2. Common issues:
   - Database connection issues
   - Missing required fields in user metadata
   - Duplicate email/clerkId constraints
3. Check database is accessible
4. Verify Prisma schema matches database

---

### Scenario 4: Polling Gets 401/403
**Browser console**: `❌ [WEBHOOK] API error: { status: 401, ... }`

**Cause**: Auth token is invalid or expired

**Fix**:
1. Check if Clerk session is still valid
2. Verify `getToken()` is returning a valid token
3. Check backend auth middleware is not blocking the request

---

### Scenario 5: Polling Gets 500
**Browser console**: `❌ [WEBHOOK] API error: { status: 500, ... }`
**Backend logs**: Error in `findAppUserByClerkId()`

**Cause**: Database query error

**Fix**:
1. Check database connection
2. Verify `AppUser` table exists
3. Check Prisma client is generated

---

## 🧪 Testing Instructions

### 1. **Prepare**
- Open Render API logs (live tail)
- Open browser DevTools console
- Open auth debugger (floating panel)

### 2. **Run Signup**
- Clear all logs
- Start new signup
- Complete verification
- **DO NOT CLOSE ANY WINDOWS** for 30 seconds

### 3. **Collect Logs**
After timeout, share:
1. **All Render API logs** from the last 60 seconds
2. **All browser console logs** (Cmd+A, Cmd+C in console)
3. **Auth debugger logs** (Copy All button)

---

## 🚨 Quick Checks

### Is Clerk Configured?
```bash
# Check Render env vars
CLERK_SECRET_KEY=sk_...  ✅
CLERK_WEBHOOK_SECRET=whsec_...  ✅
```

### Is Webhook URL Correct?
In Clerk Dashboard:
```
Endpoint URL: https://pc-solutions-api.onrender.com/api/webhooks/clerk
Events: user.created ✅
Status: Active ✅
```

### Is Database Connected?
Check recent API logs for:
```
✅ Database connection established
```

---

## 📝 What to Share

When reporting the issue, please provide:

1. **Render API Logs** (last 60 seconds after signup):
   - Look for `[WEBHOOK]` entries
   - Look for `[WEBHOOK-STATUS]` entries
   - Any errors or warnings

2. **Browser Console** (filtered by "WEBHOOK"):
   - Polling attempts
   - API responses
   - Errors

3. **Auth Debugger Logs**:
   - Complete flow from signup to timeout

4. **Clerk Dashboard Screenshots**:
   - Webhook configuration
   - Recent webhook attempts

---

**Next Steps**: Run one more complete test with all logs open, then share the logs so we can pinpoint the exact issue! 🎯
