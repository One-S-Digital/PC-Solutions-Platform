# Admin Profile Completion Bypass Fix

## Issue

Super Admin and Admin users were being prompted to complete their profile when accessing the frontend dashboard. This should not happen as admin users don't need to select a role or complete profile information.

## Root Cause

There are two scenarios that cause this issue:

### Scenario 1: User doesn't exist in database
When admin/super admin users are created directly in Clerk (with their role set in `publicMetadata`), the Clerk webhook may skip automatic user creation because it only looks for role information in `unsafe_metadata`. This is intentional for OAuth users who need to select a role during signup, but it also affected admin users who don't need profile completion.

### Scenario 2: User exists with wrong role
When a user is first created via Clerk webhook, if `public_metadata.role` isn't set at that moment, they default to `PARENT` role. Later, their Clerk `publicMetadata.role` gets set to `ADMIN` or `SUPER_ADMIN`, but the database record still has the old role (e.g., `PARENT`).

In both cases, when admin users tried to access the frontend:
1. The backend couldn't find them (or found them with wrong role)
2. The frontend received a "pending" response or a user without admin access
3. Users were shown the "Complete Your Profile" screen

Note: The admin dashboard works because it only checks Clerk's `publicMetadata.role` directly - it doesn't require a database user.

## Solution

### Backend Changes

#### `api/src/users/users.controller.ts`

Modified the `/users/me` endpoint to handle both scenarios:

1. **Auto-create admin users** when they don't exist in the database but have an admin role in Clerk's `publicMetadata`
2. **Auto-sync admin roles** when a user exists in the database with a different role than what's in Clerk's `publicMetadata`

```typescript
@Get('me')
async getCurrentUser(@Request() request) {
  const clerkId = request.user.clerkId;
  let user = await this.usersService.findByClerkId(clerkId);
  
  // Check if we need to handle admin role sync from Clerk
  if (this.clerk) {
    const clerkUser = await this.clerk.users.getUser(clerkId);
    const clerkRole = clerkUser.publicMetadata?.role;
    
    if (clerkRole === 'ADMIN' || clerkRole === 'SUPER_ADMIN') {
      if (!user) {
        // Case 1: Auto-create admin user
        user = await this.usersService.completeProfile(...);
      } else if (user.role !== clerkRole) {
        // Case 2: Sync role from Clerk to database
        await this.usersService.updateRoleByClerkId(clerkId, clerkRole, ...);
        user = await this.usersService.findByClerkId(clerkId);
      }
    }
  }
  return { success: true, data: user };
}
```

#### `api/src/users/users.service.ts`

Added `updateRoleByClerkId` method to update a user's role by their Clerk ID, using the existing `RoleSyncService` for proper audit trails and Clerk synchronization.

## How It Works Now

### For Admin/Super Admin Users:
1. Admin signs in to Clerk
2. Frontend calls `/users/me`
3. Backend fetches user from Clerk API to check `publicMetadata.role`
4. If user is admin in Clerk:
   - If user doesn't exist in DB → auto-create with admin role
   - If user exists with wrong role → sync role to match Clerk
5. Backend returns the user data with correct admin role
6. Frontend receives user → redirects to admin dashboard (no profile prompt)

### For Regular Users:
- Unchanged behavior
- Still get the "Complete Profile" prompt if they don't have a backend record
- Need to select a role since they don't have one pre-assigned

## Requirements

For this fix to work, admin/super admin users must have their role set in Clerk's `publicMetadata`. This is typically done via:
- The admin panel when elevating a user to admin
- Scripts like `set-super-admin.ts`
- Direct Clerk dashboard configuration

## Files Changed

| File | Change |
|------|--------|
| `api/src/users/users.controller.ts` | Added auto-creation AND auto-sync logic for admin users in `/users/me` endpoint |
| `api/src/users/users.service.ts` | Added `updateRoleByClerkId` method for syncing roles |

## Testing

1. **Scenario 1 - New admin user:**
   - Create a user in Clerk with `publicMetadata.role = "SUPER_ADMIN"` or `"ADMIN"`
   - Sign in to the frontend
   - Verify the user is redirected to the admin dashboard without seeing "Complete Profile"
   - Verify the user record was created in the database with the correct role

2. **Scenario 2 - Existing user with wrong role:**
   - Have a user in the database with role `PARENT`
   - Update their Clerk `publicMetadata.role` to `"ADMIN"` or `"SUPER_ADMIN"`
   - Sign in to the frontend
   - Verify the user is redirected to the admin dashboard without seeing "Complete Profile"
   - Verify the user record was updated in the database with the correct admin role
