# What Happens When Backend is Down

## Complete Flow When Backend is Not Live

---

## Scenario: User Logs In, Backend is Completely Down

### Timeline

```
Time    | Component           | State                              | Action
--------|---------------------|------------------------------------|-----------------------------------------
00:00s  | LoginPage          | isSignedIn=false                   | User submits credentials
00:01s  | LoginPage          | isSignedIn=false                   | Clerk authenticates user (Clerk is independent!)
00:01s  | LoginPage          | isSignedIn=true                    | setActive() succeeds (Clerk only)
00:01s  | LoginPage          | isSignedIn=true                    | navigate('/dashboard')
--------|---------------------|------------------------------------|-----------------------------------------
00:01s  | ProtectedLayout    | isSignedIn=true                    | Guard evaluates:
        |                    | currentUser=null                   | - isLoaded? ✅ Yes
        |                    | isAuthLoading=true                 | - isSignedIn? ✅ Yes
        |                    |                                    | - currentUser? ❌ No
        |                    |                                    | - isAuthLoading? ✅ Yes
        |                    |                                    | → Shows "Loading your account..."
--------|---------------------|------------------------------------|-----------------------------------------
00:01s  | AuthProvider       | Syncing...                         | Attempt 1: fetch(/api/users/me)
00:02s  | AuthProvider       | Network error                      | ❌ Backend down - status=0
00:02s  | AuthProvider       | Retrying...                        | Wait 2s (WEBHOOK_RETRY_DELAY_MS)
00:04s  | AuthProvider       | Syncing...                         | Attempt 2: fetch(/api/users/me)
00:05s  | AuthProvider       | Network error                      | ❌ Backend down - status=0
00:05s  | AuthProvider       | Retrying...                        | Wait 2s
00:07s  | AuthProvider       | Syncing...                         | Attempt 3: fetch(/api/users/me)
00:08s  | AuthProvider       | Network error                      | ❌ Backend down - status=0
00:08s  | AuthProvider       | All retries exhausted              | setIsLoading(false)
        |                    |                                    | setCurrentUser(null)
        |                    |                                    | setAuthError('backendSyncError')
--------|---------------------|------------------------------------|-----------------------------------------
00:08s  | ProtectedLayout    | isSignedIn=true                    | Guard re-evaluates:
        |                    | currentUser=null                   | - isLoaded? ✅ Yes
        |                    | isAuthLoading=false ⬅ CHANGED     | - isSignedIn? ✅ Yes
        |                    |                                    | - currentUser? ❌ No
        |                    |                                    | - isAuthLoading? ❌ No (retries done)
        |                    |                                    | → Navigate to /login
--------|---------------------|------------------------------------|-----------------------------------------
00:08s  | LoginPage          | isSignedIn=true                    | Render logic:
        |                    | currentUser=null                   | - isLoaded? ✅ Yes
        |                    | isAuthLoading=false                | - isSignedIn && currentUser? ❌ No
        |                    |                                    | - isSignedIn && !currentUser && !isAuthLoading? ✅ Yes
        |                    |                                    | → Shows "Backend Sync Error" UI
--------|---------------------|------------------------------------|-----------------------------------------
```

---

## What User Sees

### Visual Timeline

```
[00:00s] Login page with form
           ↓ (user submits)
           
[00:01s] "Signing in..." button spinner
           ↓ (Clerk authenticates)
           
[00:01s] Redirects to /dashboard
           ↓
           
[00:01s - 00:08s] 🔄 Loading screen
                   "Loading your account..."
                   (Spinner showing while retries happen)
                   
[00:08s] Backend Sync Error Page:
         
         ⚠️  Backend Sync Error
         
         You are authenticated, but we're having trouble 
         connecting to the backend. This may be due to a 
         configuration issue. Please sign out and try again,
         or contact support if the problem persists.
         
         [Sign Out] button
```

---

## Detailed State Breakdown

### State 1: User Submits Login (Backend Down)
```typescript
// Clerk (works - independent service)
isSignedIn: false → true ✅

// Backend (down - no impact on Clerk auth)
currentUser: null
isAuthLoading: false → true (starts syncing)
```

### State 2: Navigating to Dashboard
```typescript
// ProtectedLayout evaluates
isLoaded: true ✅
isSignedIn: true ✅
currentUser: null ❌
isAuthLoading: true ✅

// Decision: Show loading (wait for sync)
return <LoadingScreen />
```

### State 3: Backend Sync Attempts (All Fail)
```typescript
// Attempt 1 at 00:01s
fetch('/api/users/me') → Network error (backend down)

// Attempt 2 at 00:04s (after 2s delay)
fetch('/api/users/me') → Network error (backend down)

// Attempt 3 at 00:07s (after 2s delay)
fetch('/api/users/me') → Network error (backend down)

// After all retries fail at 00:08s
setIsLoading(false) → isAuthLoading: false
setCurrentUser(null) → currentUser: null
setAuthError('common:loginPage.backendSyncError')
```

### State 4: Guard Re-evaluates
```typescript
// ProtectedLayout re-renders when isAuthLoading changes
isLoaded: true ✅
isSignedIn: true ✅
currentUser: null ❌
isAuthLoading: false ❌ (changed!)

// Decision: Sync failed, redirect to login
return <Navigate to="/login" />
```

### State 5: Login Page Handles Error
```typescript
// LoginPage render logic
isSignedIn: true ✅
currentUser: null ❌
isAuthLoading: false ❌

// Matches condition: isSignedIn && !currentUser && !isAuthLoading
// Shows "Backend Sync Error" UI with Sign Out button
```

---

## User Options When Backend is Down

### Option 1: Sign Out ✅
```typescript
<Button onClick={handleLogout}>
  Sign Out
</Button>
```

**What happens**:
- Calls Clerk's `signOut()` 
- Clears local state
- Returns to login form
- Backend still down, but user is signed out

### Option 2: Wait and Refresh
User can:
- Wait for backend to come back online
- Refresh the page
- AuthProvider will retry sync
- If backend is back, will succeed and load dashboard

---

## Network Error Details

### What `status=0` Means

When backend is down, `fetch()` throws an error:

```typescript
try {
  const response = await fetch(url, { ... });
} catch (fetchError) {
  // This is caught - fetchError is a TypeError: "Failed to fetch"
  // status: 0 (no HTTP response received)
  // category: NETWORK
}
```

**Causes of status=0**:
1. ✅ **Backend completely down** - No server listening
2. ✅ **CORS preflight failure** - Server rejects OPTIONS request
3. ✅ **Network timeout** - Request takes too long
4. ✅ **DNS failure** - Can't resolve backend domain
5. ✅ **SSL/TLS error** - Certificate issues

---

## Retry Logic Deep Dive

The AuthProvider has built-in retry logic:

```typescript
const WEBHOOK_RETRY_ATTEMPTS = 2;  // Total attempts: 3 (initial + 2 retries)
const WEBHOOK_RETRY_DELAY_MS = 2000;  // 2 seconds between attempts

// In fetchUserFromBackend():
try {
  const response = await fetch(url, { ... });
  
  if (!response.ok) {
    if (response.status === 404 && attempt < WEBHOOK_RETRY_ATTEMPTS) {
      // User not found → might be webhook delay → retry
      await new Promise(resolve => setTimeout(resolve, WEBHOOK_RETRY_DELAY_MS));
      return fetchUserFromBackend(clerkId, attempt + 1);
    }
    throw new ApiError(...);
  }
  
} catch (fetchError) {
  // Network error (backend down)
  if (attempt < WEBHOOK_RETRY_ATTEMPTS) {
    // Retry after delay
    await new Promise(resolve => setTimeout(resolve, WEBHOOK_RETRY_DELAY_MS));
    return fetchUserFromBackend(clerkId, attempt + 1);
  }
  
  // All retries exhausted → give up
  throw fetchError;
}
```

**Total Time Before Giving Up**:
- Attempt 1: ~1s (network timeout)
- Wait: 2s
- Attempt 2: ~1s
- Wait: 2s  
- Attempt 3: ~1s
- **Total: ~7 seconds**

---

## User Experience Summary

### When Backend is Down

**Phase 1 (0-1s)**: User logs in
- Clerk authentication works (independent service)
- Shows "Signing in..." button

**Phase 2 (1-8s)**: Loading & Retries
- Redirects to dashboard
- Shows "Loading your account..." with spinner
- Backend sync retries 3 times (7 seconds total)
- User sees consistent loading state (good UX)

**Phase 3 (8s+)**: Error Handling
- Redirects to login page
- Shows yellow warning box:
  - "Backend Sync Error"
  - "You are authenticated, but we're having trouble..."
  - "Please sign out and try again..."
- Shows "Sign Out" button

**User Options**:
1. ✅ Sign Out → Clear session, try again later
2. ✅ Wait → Refresh page when backend is back
3. ✅ Contact Support → Error is clear and actionable

---

## What Could Be Improved (Optional)

### 1. Add "Retry Connection" Button
```tsx
<Button onClick={refreshCurrentUser}>
  Retry Connection
</Button>
```

### 2. Show More Specific Error
```tsx
{authError === 'NETWORK_ERROR' ? (
  <p>Backend server appears to be offline. Please try again in a few minutes.</p>
) : authError === 'USER_NOT_FOUND' ? (
  <p>Your account is still being created. Please wait...</p>
) : (
  <p>Backend connection issue. Please contact support.</p>
)}
```

### 3. Backend Health Indicator
```tsx
const [backendHealth, setBackendHealth] = useState<'unknown' | 'online' | 'offline'>('unknown');

useEffect(() => {
  // Ping /api/health every 10 seconds
  const interval = setInterval(async () => {
    try {
      await fetch('/api/health');
      setBackendHealth('online');
    } catch {
      setBackendHealth('offline');
    }
  }, 10000);
  return () => clearInterval(interval);
}, []);
```

### 4. Fallback to Cached User
```typescript
// Store last successful user in localStorage
// Show read-only dashboard with cached data when backend is down
const cachedUser = localStorage.getItem('lastUser');
if (!currentUser && !isAuthLoading && cachedUser) {
  setCurrentUser(JSON.parse(cachedUser));
  showWarning('Using offline mode - some features unavailable');
}
```

---

## Current Behavior is Correct ✅

The current implementation handles backend outage gracefully:

✅ **User is authenticated** - Clerk session is valid  
✅ **Shows loading** - User knows something is happening  
✅ **Retries automatically** - Handles transient failures  
✅ **Clear error message** - User understands what went wrong  
✅ **Sign out available** - User has an action to take  
✅ **Can recover** - Refresh when backend is back  

---

## Testing Recommendations

### Test 1: Kill Backend

```bash
# Stop the backend service
# Then try logging in
# Expected: 
# - Login succeeds (Clerk)
# - Shows loading for ~7 seconds
# - Shows "Backend Sync Error"
# - Can sign out
```

### Test 2: Slow Backend (Cold Start)

```bash
# On Render free tier, wait 15 minutes for service to sleep
# Then try logging in
# Expected:
# - Login succeeds
# - Shows loading for ~30-60 seconds (wake time)
# - Eventually succeeds or times out
# - If timeout: shows error with sign out
```

### Test 3: CORS Issue

```bash
# Remove frontend origin from backend CORS config
# Try logging in
# Expected:
# - Login succeeds (Clerk)
# - Fetch fails with CORS error (status=0)
# - Retries fail (CORS still misconfigured)
# - Shows "Backend Sync Error"
```

---

## Summary

**When backend is down, the user will**:

1. ✅ Successfully log in to Clerk (independent service)
2. ✅ See "Loading your account..." for ~7 seconds (3 retry attempts)
3. ✅ Be redirected to login page with clear error message
4. ✅ Have option to sign out or wait for backend to recover
5. ✅ Be able to refresh and retry when backend is back

**The system is resilient** - Clerk authentication works independently, and the UI gracefully handles backend unavailability with clear messaging and recovery options.

---

**Total Loading Time**: ~7 seconds (1s + 2s + 1s + 2s + 1s)  
**User Experience**: Clear feedback, actionable error, no confusion  
**Recovery**: Automatic when backend comes back online
