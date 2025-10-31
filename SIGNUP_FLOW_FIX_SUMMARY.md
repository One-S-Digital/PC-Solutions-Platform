# Signup Flow Issue - Root Cause and Fix

## Issue Summary

**Problem**: After successful email verification, the signup flow gets stuck showing a loading progress bar and eventually times out with an error, even though the user account is successfully created.

**Date**: 2025-10-31  
**Flow ID**: flow_mhen7epj_192gv

---

## Root Cause: RolesGuard Path Mismatch 🎯

The **RolesGuard was blocking webhook-status polling requests** from pending users due to incorrect path checking.

### The Problem

1. **What actually happens**:
   - ✅ User submits signup form
   - ✅ Email verification completes successfully
   - ✅ Clerk webhook fires and creates user in database
   - ❌ Frontend polling requests to `/api/users/webhook-status/${clerkId}` are **blocked by RolesGuard**
   - ⏱️ Polling times out after 30 seconds
   - 🔴 User sees error instead of success page

2. **Why it was blocked**:

The API has a global prefix: `app.setGlobalPrefix('api')` in `main.ts`

This means all routes are prefixed with `/api`, so the webhook-status endpoint is:
```
/api/users/webhook-status/:clerkId
```

However, the RolesGuard was checking:
```typescript
const allowedPaths = ['/users/me', '/users/webhook-status'];
const isAllowedPath = allowedPaths.some(path => request.url.startsWith(path));
```

**The check fails** because:
- Actual URL: `/api/users/webhook-status/user_xxx`
- Checked pattern: `/users/webhook-status`
- Result: `false` (doesn't start with the pattern)

This caused the guard to block requests with `ForbiddenException: Account is being processed`.

---

## The Fix

### File: `api/src/auth/guards/roles.guard.ts`

**Before (broken)**:
```typescript
const allowedPaths = ['/users/me', '/users/webhook-status'];
```

**After (fixed)**:
```typescript
// Include /api prefix since app.setGlobalPrefix('api') is used
const allowedPaths = ['/api/users/me', '/api/users/webhook-status', '/users/me', '/users/webhook-status'];
```

Now pending users can successfully poll the webhook-status endpoint while their account is being processed.

---

## Additional Improvements

### 1. Fixed Polling Hook Closure Bug

**File**: `frontend/src/hooks/useWebhookStatus.ts`

**Problem**: Timeout callback was checking a stale `status` value from closure.

**Fix**: Use `useRef` to track current status and check `statusRef.current` in timeout.

### 2. Improved Error Messaging

**File**: `frontend/src/components/verification/VerificationProgress.tsx`

**Added**:
- Clear explanation that email verification succeeded
- "Try Logging In" button (user might be able to log in even if polling timed out)
- "Wait and Try Again" option to retry polling
- Better context about what might be causing delays

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIGNUP FLOW (FIXED)                         │
└─────────────────────────────────────────────────────────────────┘

1. User submits signup form
   │
   ├─► Clerk creates user
   │
2. Email verification required
   │
   ├─► User enters verification code
   │
3. Email verified ✅
   │
   ├─► Clerk fires user.created webhook
   │   │
   │   └─► Backend creates user in database
   │
4. Frontend starts polling (every 1s for 30s)
   │
   ├─► GET /api/users/webhook-status/:clerkId
   │   │
   │   ├─► ClerkAuthGuard: ✅ Allows (pending user)
   │   │
   │   ├─► RolesGuard: ✅ Allows (NOW FIXED!)
   │   │                   - Checks for /api prefix
   │   │                   - Matches /api/users/webhook-status
   │   │
   │   └─► Returns: { exists: true/false }
   │
5. User found! (exists: true)
   │
   └─► Redirect to success page or dashboard
```

**Before fix**: Step 4 was blocked by RolesGuard → polling timeout  
**After fix**: Step 4 succeeds → user found within 1-2 seconds → success!

---

## Testing the Fix

### Expected Behavior

1. **Sign up** with valid details
2. **Verify email** with code from email
3. **Progress bar** shows for 1-3 seconds while webhook processes
4. **Success page** appears automatically
5. **Redirects** to dashboard or pricing (depending on role)

### Test Scenario 1: Happy Path

```
Timeline:
09:22:45 → User submits verification code
09:22:46 → Email verified (Clerk)
09:22:46 → Webhook fires
09:22:47 → User created in database
09:22:47 → Polling starts
09:22:48 → First poll: user found! ✅
09:22:48 → Redirect to success page
```

### Test Scenario 2: Slow Webhook

```
Timeline:
09:22:45 → User submits verification code
09:22:46 → Email verified (Clerk)
09:22:46 → Webhook fires
09:22:47 → Polling starts
09:22:48 → Poll 1: user not found yet
09:22:49 → Poll 2: user not found yet
09:22:50 → User created in database (webhook slow)
09:22:51 → Poll 3: user found! ✅
09:22:51 → Redirect to success page
```

### Test Scenario 3: Webhook Very Slow (>30s)

```
Timeline:
09:22:45 → User submits verification code
09:22:46 → Email verified (Clerk)
09:22:46 → Webhook fires (but very slow)
09:22:47 → Polling starts
...
09:23:17 → 30s timeout reached
09:23:17 → Shows improved error UI
           - "Email verification successful!"
           - "Try Logging In" button ← user can proceed
           - "Wait and Try Again" option
```

---

## Monitoring

### Frontend Logs (Browser Console)

**Successful flow**:
```
✅ [API] Clerk verification API returned: status=complete
🔄 [WEBHOOK] Starting webhook polling...
🔍 [WEBHOOK] Checking status for clerkId: user_xxx
📡 [WEBHOOK] API response: status=200 ok=true
✅ [WEBHOOK] User exists! Signup complete.
🚀 [NAVIGATION] Redirecting to: /dashboard
```

**Blocked flow (before fix)**:
```
✅ [API] Clerk verification API returned: status=complete
🔄 [WEBHOOK] Starting webhook polling...
🔍 [WEBHOOK] Checking status for clerkId: user_xxx
❌ [WEBHOOK] API error: status=403 body="Forbidden"
🔴 [WEBHOOK] Error checking webhook status: HTTP 403: Forbidden
```

### Backend Logs (Render)

**Successful flow (after fix)**:
```
🔐 RolesGuard Debug: url=/api/users/webhook-status/user_xxx
🔐 RolesGuard: Allowing pending user access to /api/users/webhook-status/user_xxx
🔍 [WEBHOOK-STATUS] Checking status for ClerkId: user_xxx
✅ [WEBHOOK-STATUS] User exists! AppUserId: 123e4567-...
```

**Blocked flow (before fix)**:
```
🔐 RolesGuard Debug: url=/api/users/webhook-status/user_xxx
🚫 RolesGuard: Pending user denied access to /api/users/webhook-status/user_xxx
```

---

## Files Changed

### Backend
1. ✅ `api/src/auth/guards/roles.guard.ts` - **Fixed path checking for pending users**

### Frontend
1. ✅ `frontend/src/hooks/useWebhookStatus.ts` - Fixed closure bug, improved polling
2. ✅ `frontend/src/components/verification/VerificationProgress.tsx` - Better error UI

---

## Deployment Checklist

- [x] Fix RolesGuard path checking
- [x] Fix polling hook closure bug
- [x] Add better error messaging
- [ ] Deploy API changes to Render
- [ ] Deploy frontend changes
- [ ] Test complete signup flow end-to-end
- [ ] Monitor logs for successful polling

---

## Key Takeaways

1. **Global prefixes matter**: When using `app.setGlobalPrefix()`, all route guards must account for the prefix in URL checks.

2. **Closure bugs**: Timeout callbacks can capture stale state. Use `useRef` for values that need to be current in async callbacks.

3. **User experience**: Even when things fail, provide clear guidance. The improved error UI lets users proceed even if polling times out.

4. **Testing**: This issue only manifested in production because the timing was different. Local development might not catch race conditions.

---

**Status**: ✅ Fix complete, ready for deployment  
**Severity**: High (blocks all new user signups)  
**Impact**: All new users affected  
**Resolution Time**: ~30 minutes from identification to fix
