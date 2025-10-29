# Authentication Fix Testing Guide

## Quick Reference for Testing the Auth Flow Fixes

### Pre-Testing Checklist

Before testing, verify:
- [ ] Backend is running (`npm run start:dev` in `/api` directory)
- [ ] Frontend is running (`npm run dev` in `/frontend` directory)
- [ ] Database is accessible and migrations are up to date
- [ ] Environment variables are properly configured (see below)

### Required Environment Variables

**Frontend (`.env`):**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE_URL=http://localhost:3000
```

**Backend (`.env`):**
```bash
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
DATABASE_URL=postgresql://...
```

---

## Test Case 1: New User Signup Flow

### Steps:
1. Navigate to `/signup`
2. Select a role (e.g., PARENT)
3. Fill in all required fields:
   - Contact Person/Parent Name
   - Email (use a unique email you can access)
   - Password (min 8 characters)
   - Confirm Password
   - Accept terms
   - Complete CAPTCHA
4. Click "Create Account"
5. **Check:** Email verification code form appears
6. Check your email for verification code
7. Enter the 6-digit code
8. Click "Verify Email"

### Expected Behavior:
- ✅ Loading indicator appears with "Verifying..." text
- ✅ "Activating session..." log appears in browser console
- ✅ "Polling backend for user..." logs appear in console
- ✅ "Backend user created successfully!" log appears
- ✅ Redirect to pricing page (for FOUNDATION/SUPPLIER/SERVICE_PROVIDER) or success screen (for PARENT)
- ✅ NO page reload occurs
- ✅ NO error messages appear
- ✅ User is created in Clerk dashboard
- ✅ User is created in database

### What NOT to See:
- ❌ Page reload after verification
- ❌ Redirect back to login page
- ❌ "Account setup timeout" error (unless webhook actually failed)
- ❌ Blank page or infinite loading

### Backend Logs to Check:
```
🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED
✅ SIGNATURE VERIFICATION SUCCESSFUL
🆕 ROUTING TO handleUserCreated()
💾 APPUSER UPSERTED SUCCESSFULLY
✅ EVENT PROCESSED SUCCESSFULLY
```

---

## Test Case 2: Existing User Login Flow

### Steps:
1. Navigate to `/login`
2. Enter email and password of existing user
3. Click "Login"

### Expected Behavior:
- ✅ "Logging In..." appears on button
- ✅ "LOGIN: Waiting for backend sync..." log in console
- ✅ "Backend sync complete, redirecting..." log in console
- ✅ Direct navigation to dashboard (role-specific)
- ✅ NO "session already active" message
- ✅ NO page reload
- ✅ Smooth transition (1-3 seconds total)

### What NOT to See:
- ❌ "Session already active" error
- ❌ Page reload after successful login
- ❌ Redirect back to login page
- ❌ Long delay (>5 seconds) before dashboard loads

### Timing:
- Session activation: <500ms
- Backend sync: 500ms-2s (with retries if needed)
- Total time: 1-3 seconds

---

## Test Case 3: Login with User Created in Clerk (Not via Signup Form)

### Setup:
1. Go to Clerk Dashboard
2. Create a test user manually
3. Set a password for the user

### Steps:
1. Navigate to `/login`
2. Login with the Clerk-created user credentials

### Expected Behavior:
- ✅ Login succeeds
- ✅ Backend creates user via webhook (may take 2-5 seconds)
- ✅ "User still pending" logs may appear briefly
- ✅ Eventually shows "Backend sync complete"
- ✅ Redirects to dashboard

### What NOT to See:
- ❌ "Backend sync failed" error
- ❌ Stuck on login page indefinitely

---

## Test Case 4: Re-login (Already Signed In)

### Steps:
1. Already logged in (dashboard visible)
2. Navigate to `/login` directly

### Expected Behavior:
- ✅ See "Already signed in" message
- ✅ "Go to Dashboard" button visible
- ✅ "Sign Out" button visible
- ✅ Clicking "Go to Dashboard" redirects correctly

### What NOT to See:
- ❌ Login form when already logged in
- ❌ Errors or confusion

---

## Test Case 5: Signup with Existing Email

### Steps:
1. Try to signup with an email that already exists

### Expected Behavior:
- ✅ Error message: "An account with this email already exists"
- ✅ Form stays on signup page
- ✅ No page reload

---

## Test Case 6: Invalid Verification Code

### Steps:
1. Complete signup form
2. Enter wrong verification code
3. Click "Verify Email"

### Expected Behavior:
- ✅ Error message: "Invalid verification code"
- ✅ Can try again with correct code
- ✅ No page reload

---

## Test Case 7: Webhook Failure Simulation

### Setup:
1. Stop the backend server
2. Or set incorrect `CLERK_WEBHOOK_SECRET`

### Steps:
1. Complete signup and email verification

### Expected Behavior:
- ✅ Polls for user for 30 seconds
- ✅ After 30 seconds, shows: "Account setup timeout" error
- ✅ Error message suggests refreshing or contacting support

### Recovery:
1. Fix webhook configuration
2. User can try logging in (webhook will fire on next login attempt)
3. Or re-signup with same email (webhook will process)

---

## Debugging Tips

### Frontend Console Logs

**Look for these categories:**
- `VERIFICATION:` - Signup verification process
- `LOGIN:` - Login flow
- `FORM:` - Form submissions

**Key success logs:**
```javascript
VERIFICATION: Session activated, waiting for Clerk session to be ready...
VERIFICATION: Polling backend for user...
VERIFICATION: Backend user created successfully!
LOGIN: Backend sync complete, redirecting...
```

**Key error logs:**
```javascript
VERIFICATION: Error fetching user, will retry
LOGIN: Backend sync failed with error
```

### Backend Logs

**Webhook success:**
```
🚨🚨🚨 WEBHOOK POST ENDPOINT CALLED
✅ SIGNATURE VERIFICATION SUCCESSFUL
💾 APPUSER UPSERTED SUCCESSFULLY
```

**Webhook failure:**
```
❌ SIGNATURE VERIFICATION FAILED
❌ MISSING SVIX HEADERS
❌ CLERK_WEBHOOK_SECRET is not configured
```

### Network Tab

1. Open browser DevTools → Network tab
2. During signup/login, look for:
   - `/api/users/me` - Should return 200 OK with user data (not pending)
   - `/api/webhooks/clerk` - Should receive POST from Clerk (visible in backend logs)

3. Check response of `/api/users/me`:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "clerkId": "user_xxx",
    "email": "test@example.com",
    "role": "PARENT",
    "isPending": false  // Should be false or missing
  }
}
```

### Common Issues and Fixes

**Issue: "No token available yet, waiting..."**
- Session activation is still in progress
- Should resolve within 1-2 seconds
- If persists, check Clerk configuration

**Issue: Webhook not firing**
- Check Clerk Dashboard → Webhooks → Event Log
- Verify endpoint URL is correct and accessible
- Test webhook with Clerk's "Test Webhook" feature
- Check `CLERK_WEBHOOK_SECRET` matches

**Issue: Backend returns 401**
- Token may not be valid yet
- Should retry automatically
- If persists, check Clerk secret keys match

**Issue: User not found after 30 seconds**
- Webhook definitely not firing or failing
- Check backend logs for webhook errors
- Verify database connection
- Check Clerk webhook configuration

---

## Performance Benchmarks

### Target Performance:
- **Signup (full flow):** 3-8 seconds
  - Form submission: <500ms
  - Email verification: instant (user-paced)
  - Verification processing: 2-6 seconds
  - Redirect: <500ms

- **Login (full flow):** 1-3 seconds
  - Authentication: <500ms
  - Backend sync: 500ms-2s
  - Redirect: <500ms

### Red Flags:
- ⚠️ Signup taking >15 seconds
- ⚠️ Login taking >5 seconds
- ⚠️ Any page reloads
- ⚠️ Any "session already active" messages

---

## Clean Up After Testing

### Reset Test Data:
```sql
-- In database
DELETE FROM "AppUser" WHERE email LIKE '%test%';
DELETE FROM "User" WHERE email LIKE '%test%';
```

### Clear Browser:
1. Open DevTools → Application
2. Clear cookies for localhost
3. Clear Local Storage
4. Clear Session Storage

### Clerk Dashboard:
1. Delete test users from Users tab
2. Check webhook logs for errors

---

## Success Criteria

All tests pass if:
- ✅ Signup completes without page reload
- ✅ User is created in database and Clerk
- ✅ Login is smooth and fast (1-3 seconds)
- ✅ No "session already active" errors
- ✅ Appropriate error messages for edge cases
- ✅ Console logs show expected flow
- ✅ Backend webhook processes successfully

---

## Report Issues

If tests fail, collect:
1. **Frontend console logs** (full output)
2. **Backend logs** (especially webhook logs)
3. **Network tab** (screenshot of `/api/users/me` response)
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Browser and version**
7. **Environment variables** (sanitized, no secrets)

---

## Quick Test Command

Run all tests in sequence:
```bash
# Terminal 1 - Backend
cd api && npm run start:dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Terminal 3 - Watch logs
cd api && tail -f logs/app.log  # If logging to file

# Then manually test each case above
```
