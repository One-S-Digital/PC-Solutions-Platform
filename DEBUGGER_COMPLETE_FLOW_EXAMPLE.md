# Frontend Debugger - Complete Flow Examples

## ✅ What the Debugger Now Logs

The debugger now captures **every critical event** in the authentication flow. Here's what you'll see:

---

## 📱 **Complete Login Flow Example**

When a user logs in successfully, the logs will show:

```
===== FLOW START flow_abc123 @ 2025-10-30T10:00:00.000Z =====
2025-10-30T10:00:00.100Z | flow=flow_abc123 | page=/index.html | type=APP | action=debugger_enabled | level=INFO | details=
2025-10-30T10:00:00.101Z | flow=flow_abc123 | page=/index.html | type=APP | action=boot | level=INFO | details=flow=flow_abc123 url=https://app.procrechesolutions.com ua=Chrome/141 macOS
2025-10-30T10:00:00.102Z | flow=flow_abc123 | page=/index.html | type=COOKIE | action=snapshot | level=INFO | details=cookiesEnabled=true sameOrigin=true
2025-10-30T10:00:00.150Z | flow=flow_abc123 | page=/login | type=ROUTER | action=enter | level=INFO | details=path=/login
2025-10-30T10:00:00.200Z | flow=flow_abc123 | page=/login | type=CLERK | action=sdk_init | level=OK | details=
2025-10-30T10:00:00.250Z | flow=flow_abc123 | page=/login | type=CLERK | action=state | level=INFO | details=isLoaded=true isSignedIn=false
2025-10-30T10:00:00.300Z | flow=flow_abc123 | page=/login | type=GUARD | action=check | level=INFO | details=page=protected isLoaded=false isSignedIn=false decision=redirect:/login reason=layout_no_user
2025-10-30T10:00:00.350Z | flow=flow_abc123 | page=/login | type=LOGIN | action=opened | level=INFO | details=provider=password
2025-10-30T10:00:00.400Z | flow=flow_abc123 | page=/login | type=APP | action=ready | level=OK | details=

--- User enters email/password and clicks Login ---

2025-10-30T10:00:05.000Z | flow=flow_abc123 | page=/login | type=LOGIN | action=submit | level=INFO | details=email=***@*** hasPassword=true
2025-10-30T10:00:05.500Z | flow=flow_abc123 | page=/login | type=CLERK | action=signin_create | level=OK | details=status=complete
2025-10-30T10:00:05.600Z | flow=flow_abc123 | page=/login | type=CLERK | action=set_active | level=OK | details=sessionId=set
2025-10-30T10:00:05.650Z | flow=flow_abc123 | page=/login | type=LOGIN | action=redirect_after | level=INFO | details=to=/dashboard
2025-10-30T10:00:05.700Z | flow=flow_abc123 | page=/dashboard | type=ROUTER | action=enter | level=INFO | details=path=/dashboard
2025-10-30T10:00:05.750Z | flow=flow_abc123 | page=/dashboard | type=CLERK | action=state | level=INFO | details=isLoaded=true isSignedIn=true
2025-10-30T10:00:05.800Z | flow=flow_abc123 | page=/dashboard | type=GUARD | action=check | level=INFO | details=page=protected isLoaded=true isSignedIn=true decision=allow reason=layout_has_user
2025-10-30T10:00:05.900Z | flow=flow_abc123 | page=/dashboard | type=HTTP | action=req | level=INFO | details=method=GET url=/api/users/me authHeader=true attempt=1
2025-10-30T10:00:06.100Z | flow=flow_abc123 | page=/dashboard | type=HTTP | action=res | level=OK | details=status=200 category=OK
```

**✅ Success Pattern**: 
- `LOGIN opened` → `submit` → `CLERK signin_create OK` → `CLERK set_active OK` → `redirect_after` → `HTTP req` → `HTTP res 200`

---

## 📝 **Complete Signup Flow Example**

When a user signs up successfully with email verification:

```
===== FLOW START flow_xyz789 @ 2025-10-30T11:00:00.000Z =====
2025-10-30T11:00:00.100Z | flow=flow_xyz789 | page=/signup | type=ROUTER | action=enter | level=INFO | details=path=/signup
2025-10-30T11:00:00.150Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=sdk_init | level=OK | details=
2025-10-30T11:00:00.200Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=state | level=INFO | details=isLoaded=true isSignedIn=false
2025-10-30T11:00:00.250Z | flow=flow_xyz789 | page=/signup | type=SIGNUP | action=opened | level=INFO | details=roleDetected=false captchaLoaded=true

--- User selects role and fills form ---

2025-10-30T11:00:10.000Z | flow=flow_xyz789 | page=/signup | type=SIGNUP | action=opened | level=INFO | details=roleDetected=true captchaLoaded=true

--- User solves captcha and submits ---

2025-10-30T11:00:15.000Z | flow=flow_xyz789 | page=/signup | type=SIGNUP | action=submit | level=INFO | details=valid=true captchaSolved=true role=FOUNDATION
2025-10-30T11:00:15.500Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=signup_create | level=OK | details=status=missing_requirements
2025-10-30T11:00:15.600Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=verify_start | level=INFO | details=

--- User enters verification code from email ---

2025-10-30T11:00:30.000Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=verify_done | level=OK | details=status=complete
2025-10-30T11:00:30.500Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=set_active | level=INFO | details=After verification
2025-10-30T11:00:31.000Z | flow=flow_xyz789 | page=/signup | type=CLERK | action=set_active | level=OK | details=
2025-10-30T11:00:31.100Z | flow=flow_xyz789 | page=/signup | type=SIGNUP | action=redirect_after | level=INFO | details=to=/pricing
2025-10-30T11:00:31.200Z | flow=flow_xyz789 | page=/pricing | type=ROUTER | action=enter | level=INFO | details=path=/pricing
2025-10-30T11:00:31.300Z | flow=flow_xyz789 | page=/pricing | type=CLERK | action=state | level=INFO | details=isLoaded=true isSignedIn=true
2025-10-30T11:00:31.400Z | flow=flow_xyz789 | page=/pricing | type=HTTP | action=req | level=INFO | details=method=GET url=/api/users/me authHeader=true attempt=1
2025-10-30T11:00:31.600Z | flow=flow_xyz789 | page=/pricing | type=HTTP | action=res | level=OK | details=status=200 category=OK
```

**✅ Success Pattern**:
- `SIGNUP opened` → `submit` → `CLERK signup_create OK` → `verify_start` → `verify_done OK` → `set_active OK` → `redirect_after` → `HTTP req` → `HTTP res 200`

---

## 🔴 **Problem Pattern 1: Redirect Loop After Signup**

```
2025-10-30T12:00:30.000Z | type=CLERK | action=verify_done | level=OK | details=status=complete
2025-10-30T12:00:30.500Z | type=CLERK | action=set_active | level=OK | details=
2025-10-30T12:00:30.600Z | type=SIGNUP | action=redirect_after | level=INFO | details=to=/dashboard
2025-10-30T12:00:30.700Z | type=ROUTER | action=enter | level=INFO | details=path=/dashboard
2025-10-30T12:00:30.800Z | type=CLERK | action=state | level=INFO | details=isLoaded=false isSignedIn=false ❌
2025-10-30T12:00:30.900Z | type=GUARD | action=check | level=INFO | details=page=protected isLoaded=false isSignedIn=false decision=redirect:/login ❌
2025-10-30T12:00:31.000Z | type=ROUTER | action=enter | level=INFO | details=path=/login
```

**🐛 Problem Identified**: 
- `CLERK state` shows `isLoaded=false isSignedIn=false` RIGHT AFTER `set_active OK`
- Guard evaluates BEFORE Clerk state updates
- **Root Cause**: Race condition - Guard runs too early

**💡 Fix**: Wait for `isLoaded=true` in guards before making decisions

---

## 🔴 **Problem Pattern 2: API Returns 401**

```
2025-10-30T12:05:31.000Z | type=CLERK | action=set_active | level=OK | details=
2025-10-30T12:05:31.100Z | type=SIGNUP | action=redirect_after | level=INFO | details=to=/dashboard
2025-10-30T12:05:31.200Z | type=ROUTER | action=enter | level=INFO | details=path=/dashboard
2025-10-30T12:05:31.300Z | type=CLERK | action=state | level=INFO | details=isLoaded=true isSignedIn=true ✅
2025-10-30T12:05:31.400Z | type=GUARD | action=check | level=INFO | details=decision=allow ✅
2025-10-30T12:05:31.500Z | type=HTTP | action=req | level=INFO | details=method=GET url=/api/users/me authHeader=true ✅
2025-10-30T12:05:31.700Z | type=HTTP | action=res | level=ERROR | details=status=401 category=UNAUTH ❌
```

**🐛 Problem Identified**:
- Clerk state is good (`isSignedIn=true`)
- Auth header is present
- But API returns 401 UNAUTH

**💡 Possible Causes**:
1. Token is invalid/expired
2. Backend JWT validation failing
3. `authorizedParties` (azp) mismatch in Clerk config
4. Backend user doesn't exist (webhook didn't create it)

---

## 🔴 **Problem Pattern 3: Clerk Doesn't Load**

```
2025-10-30T12:10:00.100Z | type=APP | action=boot | level=INFO | details=
2025-10-30T12:10:00.200Z | type=ROUTER | action=enter | level=INFO | details=path=/login
--- NO CLERK sdk_init line ---
--- NO CLERK state line ---
2025-10-30T12:10:01.000Z | type=ERROR | action=window_error | level=ERROR | details=message=Failed to load script source=https://clerk.js
```

**🐛 Problem Identified**:
- `CLERK sdk_init` never appears
- Script loading error

**💡 Possible Causes**:
1. CSP (Content Security Policy) blocking Clerk script
2. SSL/HTTPS issues
3. Network/firewall blocking
4. Wrong Clerk publishable key

---

## 🔴 **Problem Pattern 4: Verification Never Completes**

```
2025-10-30T12:15:15.000Z | type=SIGNUP | action=submit | level=INFO | details=valid=true
2025-10-30T12:15:15.500Z | type=CLERK | action=signup_create | level=OK | details=status=missing_requirements
2025-10-30T12:15:15.600Z | type=CLERK | action=verify_start | level=INFO | details=
--- User enters code ---
--- NO verify_done line ---
2025-10-30T12:15:20.000Z | type=ROUTER | action=enter | level=INFO | details=path=/login ❌
```

**🐛 Problem Identified**:
- `verify_start` appears but NO `verify_done`
- Early navigation to /login

**💡 Possible Causes**:
1. Form submission causing page reload
2. Handler mis-sequencing
3. Error in verification code (should see ERROR level)

---

## 🟢 **How to Use the Debugger**

### 1. Enable Debugger
- Opens automatically (always visible, minimized by default)
- Click minimized panel to expand
- Or press `Ctrl+`` to toggle

### 2. Start a Test
- Click **"New Flow"** button to start fresh
- This adds a banner and groups all subsequent events

### 3. Reproduce Issue
- Go through signup or login flow
- Watch logs appear in real-time

### 4. Copy Logs
- Click **"Copy All"** button
- Paste into ticket/document for analysis

### 5. Analyze Patterns
- Look for the patterns above
- Find where the flow breaks
- Check timing between events

---

## 📊 **Key Events to Watch For**

| Event | What It Means | Good Pattern |
|-------|---------------|--------------|
| `CLERK sdk_init OK` | Clerk loaded | Must appear early |
| `CLERK state isLoaded=true` | Clerk ready | Before guards evaluate |
| `CLERK set_active OK` | Session activated | After auth success |
| `HTTP res 200 OK` | API call success | After set_active |
| `GUARD decision=allow` | Auth passed | After isLoaded=true |
| `redirect_after` | Navigation intent | Should match expected route |

---

## 🎯 **Success Criteria**

A successful auth flow should show:
1. ✅ `CLERK sdk_init OK`
2. ✅ `CLERK state isLoaded=true isSignedIn=false`
3. ✅ `LOGIN/SIGNUP opened`
4. ✅ `LOGIN/SIGNUP submit`
5. ✅ `CLERK signin_create/signup_create OK`
6. ✅ `CLERK verify_done OK` (signup only)
7. ✅ `CLERK set_active OK`
8. ✅ `CLERK state isLoaded=true isSignedIn=true`
9. ✅ `GUARD decision=allow`
10. ✅ `HTTP req authHeader=true`
11. ✅ `HTTP res status=200 category=OK`

If any step is missing or shows ERROR, that's where the problem is!

---

## 🚀 **Next Steps**

1. Test the debugger with a real signup/login attempt
2. Copy the logs
3. Compare with patterns above
4. Identify which pattern matches your issue
5. Apply the suggested fix

The debugger will now show you **exactly where and why** authentication is failing! 🎉
