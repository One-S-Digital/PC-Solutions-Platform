# CORS Error Fix Summary

## Issue Identified

The settings page was experiencing CORS errors when making requests to `/api/settings/notifications`:

```
Access to fetch at 'https://pc-solutions-v2.onrender.com/api/settings/notifications' 
from origin 'https://app.procrechesolutions.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

The issue was caused by the `EnsureProfileInterceptor` throwing exceptions (such as `NotFoundException` or `UnauthorizedException`) when the `PrincipalService.getOrBootstrapAccountAndProfile()` method fails. When exceptions are thrown in interceptors:

1. NestJS bypasses the normal response flow
2. The exception goes directly to the `AllExceptionsFilter`
3. **The exception filter was not setting CORS headers on error responses**
4. The browser receives an error response without CORS headers and blocks it

## Commits That Led to This Issue

The problem became apparent after commits on November 11, 2025:

1. **`f25bd8b91`** - "Refactor: Improve user profile and organization handling"
   - This commit introduced the `EnsureProfileInterceptor` to the `SettingsController`
   - The interceptor calls `PrincipalService.getOrBootstrapAccountAndProfile()` which can throw exceptions

2. **`251b09633`** - "Refactor: Improve type safety in principal and user services"
   - This commit refactored the `PrincipalService` but didn't change exception behavior

## The Fix

Updated `/api/src/common/filters/http-exception.filter.ts` to include CORS headers on all error responses. The fix:

1. Checks the request origin against allowed origins (matching the configuration in `main.ts`)
2. Sets appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, etc.) on error responses
3. Ensures error responses are not blocked by browser CORS policies

## Files Changed

- `api/src/common/filters/http-exception.filter.ts` - Added CORS header handling to exception responses

## Testing Recommendations

1. Test the settings page with a user that has a valid profile
2. Test the settings page with a user that might trigger exceptions (e.g., missing AppUser)
3. Verify that error responses now include proper CORS headers
4. Check browser console to ensure CORS errors are resolved

## Related Files

- `api/src/main.ts` - Contains the main CORS configuration
- `api/src/principal/ensure-profile.interceptor.ts` - Interceptor that can throw exceptions
- `api/src/settings/settings.controller.ts` - Controller using the interceptor
- `api/src/principal/principal.service.ts` - Service that throws exceptions when user not found
