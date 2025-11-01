# Backend Sync Race Condition Fix

## Issue Summary

After successful login, users were seeing a "Backend Sync Error" message instead of landing on the dashboard, even though authentication succeeded.

**Date**: 2025-11-01

---

## Root Cause: Race Condition in Route Guard

### The Problem

1. ✅ User logs in successfully
2. ✅ `setActive()` completes, `isSignedIn=true`
3. ✅ Navigate to `/dashboard`
4. ❌ **ProtectedLayout guard checks `currentUser`** → Still null (backend sync in progress)
5. ❌ Guard redirects back to `/login` **immediately** (doesn't wait for sync)
6. ❌ Backend sync request gets interrupted → Network error (status=0)
7. ❌ LoginPage shows "Backend Sync Error" UI

**Core Issue**: The ProtectedLayout guard was **not waiting** for the backend sync (`isAuthLoading`) to complete before deciding to redirect.

---

## The Fix

### File: `frontend/App.tsx` (ProtectedLayout)

**Before (broken)**:
```typescript
const ProtectedLayout: React.FC = () => {
  const { currentUser } = useAppContext();
  const { isLoaded, isSignedIn } = useAuth();

  // ❌ No check for isAuthLoading
  if (!currentUser) {
    return <Navigate to="/login" replace />;  // Immediate redirect!
  }

  return <MainLayout>...</MainLayout>;
};
```

**After (fixed)**:
```typescript
const ProtectedLayout: React.FC = () => {
  const { currentUser } = useAppContext();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: isAuthLoading } = useAuthContext();  // ✅ Added

  // Wait for Clerk to load
  if (!isLoaded) return <LoadingSpinner />;

  // Not signed in to Clerk
  if (!isSignedIn) return <Navigate to="/login" />;

  // Signed in but no user yet
  if (!currentUser) {
    // ✅ Check if still loading
    if (isAuthLoading) {
      return <LoadingScreen message="Loading your account..." />;
    }
    // Backend sync failed
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>...</MainLayout>;
};
```

---

## Flow Comparison

### Before (Race Condition)

```
Login Success
  ↓
isSignedIn = true
  ↓
navigate('/dashboard')
  ↓
ProtectedLayout: currentUser = null?
  ↓
IMMEDIATE redirect to /login ❌ (doesn't wait for sync!)
  ↓
Backend sync request interrupted
  ↓
Network error (status=0)
  ↓
Shows "Backend Sync Error"
```

### After (Fixed)

```
Login Success
  ↓
isSignedIn = true
  ↓
navigate('/dashboard')
  ↓
ProtectedLayout: currentUser = null?
  ↓
Check isAuthLoading = true? 
  ↓
YES → Show "Loading your account..." ✅ (waits for sync)
  ↓
Backend sync completes
  ↓
currentUser populated
  ↓
Shows dashboard ✅
```

### If Backend Sync Fails

```
Login Success
  ↓
navigate('/dashboard')
  ↓
ProtectedLayout: isAuthLoading = true
  ↓
Shows "Loading your account..."
  ↓
Backend sync fails (retries exhausted)
  ↓
isAuthLoading = false, currentUser = null
  ↓
Redirect to /login ✅
  ↓
LoginPage detects: isSignedIn=true && !currentUser && !isAuthLoading
  ↓
Shows "Backend Sync Error" UI ✅
```

---

## Guard Logic Breakdown

The ProtectedLayout now checks conditions in the correct order:

```typescript
// 1. Clerk not loaded yet → Wait
if (!isLoaded) return <Loading />;

// 2. Not signed in to Clerk → Login required
if (!isSignedIn) return <Navigate to="/login" />;

// 3. Signed in but no backend user
if (!currentUser) {
  // 3a. Still syncing → Wait
  if (isAuthLoading) return <Loading />;
  
  // 3b. Sync failed → Show error
  return <Navigate to="/login" />;
}

// 4. All good → Show protected content
return <MainLayout>...</MainLayout>;
```

---

## About the Network Error (status=0)

The logs showed:
```
error=TypeError: Failed to fetch
status=0 category=NETWORK
url=https://pc-solutions-v2.onrender.com/api/users/me
```

### Possible Causes

1. **Render Free Tier Sleep** (Most Likely)
   - Render free tier services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up
   - Fetch requests may timeout before wake completes
   - **Fix**: Already implemented - retries in AuthProvider

2. **CORS Issue**
   - Preflight OPTIONS request failing
   - Missing/incorrect CORS headers
   - **Status**: CORS config looks correct in main.ts (lines 89-105)

3. **Network/Firewall**
   - Client network blocking the API domain
   - Corporate firewall
   - **Check**: Test from different network

4. **API Down**
   - Backend crashed or not deployed
   - **Check**: Visit health endpoint directly

### How to Debug

1. **Check API health**:
   ```bash
   curl https://pc-solutions-v2.onrender.com/api
   # Should return 204 No Content
   ```

2. **Check CORS preflight**:
   ```bash
   curl -X OPTIONS https://pc-solutions-v2.onrender.com/api/users/me \
     -H "Origin: https://app.procrechesolutions.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization, Content-Type" \
     -v
   ```

3. **Check Render logs**:
   - Look for incoming requests to `/api/users/me`
   - Check if service is sleeping/waking

4. **Browser DevTools**:
   - Network tab → Check if request shows "CORS error" or just "Failed"
   - Console → Check exact error message

---

## Current State

### What's Fixed ✅
- ProtectedLayout no longer causes race condition
- Proper loading state while backend sync in progress
- Proper error handling when sync fails
- No more interrupted network requests

### What May Still Need Investigation ⚠️
- Why `/api/users/me` returned status=0 (network error)
- Is it a Render cold start issue?
- Is it a CORS configuration issue?
- Is it a transient network problem?

The user experiencing this should:
1. Check if API is responding: `curl https://pc-solutions-v2.onrender.com/api`
2. Check Render logs for any errors
3. Wait 30-60 seconds if service was sleeping (Render free tier)
4. Try again - the retry logic should handle transient failures

---

## Files Changed

- ✅ `frontend/App.tsx` - Fixed ProtectedLayout guard logic

## Commits

- `018d85692` - Added import (incomplete)
- `d5076c639` - Actually implemented isAuthLoading check (complete)

---

**Status**: ✅ Race condition fixed  
**Next**: Monitor if network errors persist (may be Render cold start issue)
