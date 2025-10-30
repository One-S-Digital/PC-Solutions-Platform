# Auth Debugger Integration Guide

## ✅ Completed

### 1. Core Implementation
- ✅ **authDebugger utility** (`/workspace/frontend/src/utils/authDebugger.ts`)
  - localStorage-based with 5,000 line ring buffer
  - Structured logging with categories: APP, ROUTER, GUARD, SIGNUP, LOGIN, CLERK, HTTP, COOKIE, ERROR, PERF
  - No secrets logged
  - Flow tracking with short UUIDs

- ✅ **AuthDebugPanel component** (`/workspace/frontend/src/components/debug/AuthDebugPanel.tsx`)
  - Floating panel (top-right, resizable)
  - Buttons: Copy All, Clear, New Flow, Pause/Resume
  - Hotkey: `Ctrl+`` to toggle
  - Syntax highlighting for log categories
  - Auto-scroll, persistent across reloads

- ✅ **React hooks** (`/workspace/frontend/src/hooks/useAuthDebugger.ts`)
  - `useAuthDebugger()` - General auth logging
  - `useSignupDebugger()` - Signup-specific logging
  - `useLoginDebugger()` - Login-specific logging
  - `useHttpDebugger()` - HTTP request/response logging

- ✅ **Initialization** (`/workspace/frontend/src/utils/authDebuggerInit.ts`)
  - App boot logging
  - Global error handlers (window.error, unhandledrejection)
  - Cookie/storage capability check
  - DOM ready notification

- ✅ **Integration in App**
  - Added AuthDebugPanel to App.tsx
  - Added guard logging to ProtectedRoute and ProtectedLayout
  - Initialized in index.tsx

## 🔨 Manual Integration Steps Needed

### 2. AuthProvider Logging (`/workspace/frontend/providers/AuthProvider.tsx`)

Add at the **top of AuthProviderInner** (after imports):

```typescript
// Add import
import { authDebugger } from '../src/utils/authDebugger';

// Add useEffect for Clerk init tracking (after useState declarations, around line 60)
useEffect(() => {
  if (authDebugger.isEnabled()) {
    if (clerkIsLoaded) {
      authDebugger.logClerkInit(true);
    }
  }
}, [clerkIsLoaded]);

// Add Clerk state logging (after the clerkUserId check, around line 250)
useEffect(() => {
  if (authDebugger.isEnabled() && clerkIsLoaded) {
    authDebugger.logClerkState(clerkIsLoaded, isSignedIn || false);
  }
}, [clerkIsLoaded, isSignedIn]);
```

Add in **fetchUserFromBackend** function (at the start, around line 104):

```typescript
if (authDebugger.isEnabled()) {
  authDebugger.logHttpRequest('GET', '/api/users/me', true);
  authDebugger.logPerfMark('fetch_user_start');
}
```

Add in **fetchUserFromBackend** function (on success, around line 240):

```typescript
if (authDebugger.isEnabled()) {
  authDebugger.logHttpResponse(response.status, 'OK');
  authDebugger.logPerfMeasure('fetch_user', Date.now() - startTime);
}
```

Add in **fetchUserFromBackend** function (on error, around line 210):

```typescript
if (authDebugger.isEnabled()) {
  authDebugger.logHttpResponse(
    response.status,
    response.status === 401 || response.status === 403 ? 'UNAUTH' : 
    response.status === 0 ? 'NETWORK' : 'CORS'
  );
}
```

### 3. LoginPage Logging (`/workspace/frontend/pages/LoginPage.tsx`)

**Replace lines 47-48** with:

```typescript
// Enable debug logging for this component
import { useLoginDebugger } from '../src/hooks/useAuthDebugger';
const loginDebugger = useLoginDebugger();
```

**Add after line 61** (in the existing useEffect):

```typescript
if (authDebugger.isEnabled()) {
  loginDebugger.logOpened('password');
}
```

**In handleLogin function**, add after `setError('')` (around line 86):

```typescript
if (authDebugger.isEnabled()) {
  authDebugger.logPerfMark('login_submit');
}
```

**After signIn.create** call (around line 110), add:

```typescript
if (authDebugger.isEnabled()) {
  loginDebugger.logSigninCreate(true, completeSignIn.status);
}
```

**After setActive** call (around line 125), add:

```typescript
if (authDebugger.isEnabled()) {
  loginDebugger.logSetActive(true);
  loginDebugger.logRedirect('/dashboard');
}
```

**In catch block** (around line 135), add:

```typescript
if (authDebugger.isEnabled()) {
  loginDebugger.logSigninCreate(false, 'error', err.message);
}
```

### 4. SignupPage Logging (`/workspace/frontend/pages/SignupPage.tsx`)

**Replace line 23** with:

```typescript
import { useSignupDebugger } from '../src/hooks/useAuthDebugger';
const signupDebugger = useSignupDebugger();
```

**Add in component body** (after useState, around line 100):

```typescript
useEffect(() => {
  if (authDebugger.isEnabled()) {
    signupDebugger.logOpened(!!selectedRole, true);
  }
}, [selectedRole]);
```

**In handleSubmit** (at the start, around line 150):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logSubmit(isValid, !!captchaToken);
  authDebugger.logPerfMark('signup_submit');
}
```

**After signUp.create** call (around line 200):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logSignupCreate(true, result.status);
}
```

**Before verification** (around line 220):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logVerifyStart();
}
```

**After verification attempt** (around line 250):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logVerifyDone(result.status === 'complete', result.status);
}
```

**Before setActive** call (around line 260):

```typescript
if (authDebugger.isEnabled()) {
  authDebugger.logPerfMark('setActive_start');
}
```

**After setActive** call (around line 265):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logSetActive(true);
  authDebugger.logPerfMeasure('setActive_to_redirect', Date.now() - startTime);
}
```

**Before navigate** (around line 270):

```typescript
if (authDebugger.isEnabled()) {
  signupDebugger.logRedirect('/pricing');
}
```

### 5. API Service Logging (`/workspace/frontend/services/api.ts`)

**Add HTTP interceptor** at the top of the file:

```typescript
import { authDebugger } from '../src/utils/authDebugger';

// Wrap fetch to log all requests/responses
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options = {}] = args;
  const method = options.method || 'GET';
  const hasAuth = !!(options.headers && 
    (options.headers['Authorization'] || options.headers['authorization']));
  
  if (authDebugger.isEnabled()) {
    authDebugger.logHttpRequest(method, String(url), hasAuth);
  }
  
  try {
    const response = await originalFetch(...args);
    
    if (authDebugger.isEnabled()) {
      let category: 'OK' | 'UNAUTH' | 'CORS' | 'NETWORK' = 'OK';
      if (response.status === 401 || response.status === 403) category = 'UNAUTH';
      else if (response.status === 0) category = 'NETWORK';
      else if (!response.ok && response.type === 'opaque') category = 'CORS';
      
      authDebugger.logHttpResponse(response.status, category);
    }
    
    return response;
  } catch (error) {
    if (authDebugger.isEnabled()) {
      authDebugger.logHttpResponse(0, 'NETWORK');
    }
    throw error;
  }
};
```

## 🚀 How to Use

### Enable the Debugger

1. **Add `?authdebug=1` to any URL**:
   ```
   http://localhost:5173/?authdebug=1
   http://localhost:5173/login?authdebug=1
   ```

2. **Or use hotkey**: Press `Ctrl+`` anywhere in the app

### Using the Panel

- **Copy All**: Copy entire log to clipboard (paste into tickets, docs, etc.)
- **Clear**: Clear all logs (adds timestamp banner)
- **New Flow**: Start a new flow with a unique ID (use this before each test attempt)
- **Pause**: Pause UI updates (logging to storage continues)
- **Close**: Disable debugger (hotkey `Ctrl+``)

### Reading the Logs

Each log line has this format:
```
timestamp | flow=<id> | page=<path> | type=<CATEGORY> | action=<VERB> | result=<OK|ERR|INFO> | details=<data>
```

**Color coding**:
- 🟣 Purple: APP events
- 🔵 Cyan: CLERK events
- 🟡 Yellow: ROUTER/GUARD events
- 🟢 Green: SIGNUP/LOGIN events
- 🔵 Blue: HTTP events
- 🔴 Red: ERROR events
- 🟣 Pink: PERF events

### Common Patterns

#### "Redirect back to /login after signup"
Look for:
```
CLERK | verify_done | OK | status=complete
CLERK | set_active | OK
GUARD | check | INFO | decision=redirect:/login isSignedIn=false
```
→ Guard runs before Clerk state updates

#### "Session active but page loops"
Look for:
```
CLERK | signin_create | OK | status=complete
CLERK | set_active | OK
GUARD | check | INFO | decision=redirect:/login
... later ...
GUARD | check | INFO | decision=allow
```
→ Guard race condition or wrong redirect target

#### "/api/users/me returns 401"
Look for:
```
HTTP | req | INFO | GET /api/users/me authHeader=true
HTTP | res | ERR | status=401 category=UNAUTH
```
→ Token issue or azp mismatch

#### "Clerk doesn't load"
Look for missing:
```
CLERK | sdk_init | OK
```
And likely has:
```
ERROR | clerk_load | ERR | hint=CSP|SSL|Network
```
→ Script blocked

## 📋 Log Event Reference

### APP
- `boot` - App started
- `ready` - DOM ready
- `debugger_enabled` - Debugger activated
- `debugger_resumed` - Unpaused

### ROUTER
- `enter` - Page navigation
- `redirect` - Navigation redirect

### GUARD
- `check` - Auth guard decision

### SIGNUP
- `opened` - Signup page loaded
- `submit` - Form submitted
- `redirect_after` - Post-signup redirect

### LOGIN
- `opened` - Login page loaded
- `redirect_after` - Post-login redirect

### CLERK
- `sdk_init` - Clerk SDK initialized
- `state` - Clerk state change
- `signup_create` - Signup created
- `signin_create` - Signin created
- `verify_start` - Verification started
- `verify_done` - Verification completed
- `set_active` - Session activated

### HTTP
- `req` - HTTP request
- `res` - HTTP response

### COOKIE
- `snapshot` - Cookie/storage check

### ERROR
- `window_error` - Global error
- `unhandled_rejection` - Promise rejection
- `clerk_load` - Clerk load failure

### PERF
- `mark` - Performance mark
- `measure` - Performance measurement

## 🔒 Security Notes

- **No secrets logged**: Tokens, passwords, emails, codes are never logged
- **Booleans only**: Sensitive flags logged as true/false
- **localStorage only**: No external calls, no beacons
- **Copy-friendly**: Logs are plain text for easy sharing

## 💡 Tips

1. **Use "New Flow" before each test** to group related events
2. **Copy logs immediately** after reproducing an issue
3. **Check timestamps** to identify slow operations
4. **Look for missing events** (e.g., no `CLERK | sdk_init` means Clerk didn't load)
5. **Watch for redirect loops** (multiple `redirect` events in sequence)
