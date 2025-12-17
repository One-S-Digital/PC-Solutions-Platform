# Admin Profile Completion Bypass Fix

## Issue

Super Admin and Admin users were being prompted to complete their profile when accessing the frontend dashboard. This should not happen as admin users don't need to select a role or complete profile information.

## Root Cause

When admin/super admin users are created directly in Clerk (with their role set in `publicMetadata`), the Clerk webhook skips automatic user creation because it only looks for role information in `unsafe_metadata`. This is intentional for OAuth users who need to select a role during signup, but it also affected admin users who don't need profile completion.

As a result, when admin users tried to access the frontend:
1. The backend couldn't find them in the database
2. The frontend received a "pending" response
3. Users were shown the "Complete Your Profile" screen

## Solution

### Backend Change (`api/src/users/users.controller.ts`)

Modified the `/users/me` endpoint to auto-create admin users when they don't exist in the database but have an admin role in Clerk's `publicMetadata`:

```typescript
@Get('me')
async getCurrentUser(@Request() request) {
  const clerkId = request.user.clerkId;
  let user = await this.usersService.findByClerkId(clerkId);
  
  if (!user) {
    // Check if they're an admin in Clerk's publicMetadata
    if (this.clerk) {
      const clerkUser = await this.clerk.users.getUser(clerkId);
      const clerkRole = clerkUser.publicMetadata?.role;
      
      // Auto-create admin users without requiring profile completion
      if (clerkRole === 'ADMIN' || clerkRole === 'SUPER_ADMIN') {
        user = await this.usersService.completeProfile(clerkId, email, {
          role: clerkRole,
          contactPerson: `${firstName} ${lastName}`,
        });
        // Return the created user
      }
    }
    // Return pending for non-admin users...
  }
  return { success: true, data: user };
}
```

## How It Works Now

### For Admin/Super Admin Users:
1. Admin signs in to Clerk
2. Frontend calls `/users/me`
3. Backend checks database → user not found
4. Backend fetches user from Clerk API → sees `publicMetadata.role = "ADMIN"` or `"SUPER_ADMIN"`
5. Backend auto-creates the user with the admin role
6. Backend returns the user data
7. Frontend receives user → redirects to admin dashboard (no profile prompt)

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
| `api/src/users/users.controller.ts` | Added auto-creation logic for admin users in `/users/me` endpoint |
| `frontend/App.tsx` | Minor cleanup (removed unnecessary admin-specific handling) |

## Testing

1. Create a user in Clerk with `publicMetadata.role = "SUPER_ADMIN"` or `"ADMIN"`
2. Sign in to the frontend
3. Verify the user is redirected to the admin dashboard without seeing "Complete Profile"
4. Verify the user record was created in the database with the correct role
