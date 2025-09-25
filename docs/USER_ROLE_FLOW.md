# User Role Management Flow

This document explains how user roles are managed throughout the signup and authentication process.

## Overview

The system uses a secure flow to manage user roles:

1. **Frontend signup** → Stores role in `unsafeMetadata`
2. **Webhook sync** → Moves role to `publicMetadata` 
3. **JWT token** → Includes role from `publicMetadata`
4. **API validation** → Checks role from JWT or database

## Why This Flow?

### Security Considerations

- **publicMetadata** can only be set server-side with the secret key
- This prevents users from giving themselves admin roles
- `unsafeMetadata` can be set client-side but isn't included in JWT tokens
- The webhook ensures the role is validated before being promoted to `publicMetadata`

## Detailed Flow

### 1. User Signup (Frontend)

```typescript
// In CustomSignupForm.tsx
const result = await signUp.create({
  emailAddress: formData.email,
  password: formData.password,
  firstName: formData.firstName,
  lastName: formData.lastName,
  unsafeMetadata: {
    role: formData.role, // User-selected role stored temporarily
    // ... other metadata
  },
});
```

### 2. Clerk Webhook (Backend)

When Clerk creates the user, it sends a webhook to `/api/webhooks/clerk`:

```typescript
// In clerk-webhook.controller.ts
private async handleUserCreated(clerkUser: any) {
  const roleFromSignup = clerkUser.unsafe_metadata?.role;
  
  if (roleFromSignup && this.isValidUserRole(roleFromSignup)) {
    // Move role to publicMetadata (secure, server-side only)
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: roleFromSignup,
      },
    });

    // Create user in database
    await this.userSyncService.createUser({
      clerkId: clerkUser.id,
      email: clerkUser.email_addresses[0]?.email_address || '',
      firstName: clerkUser.first_name || '',
      lastName: clerkUser.last_name || '',
      role: roleFromSignup,
    });
  }
}
```

### 3. JWT Token

After the webhook completes, subsequent logins include the role in the JWT:

```json
{
  "sub": "user_xxx",
  "email": "user@example.com",
  "publicMetadata": {
    "role": "PARENT"
  }
}
```

### 4. API Authentication

The API checks for roles in this order:

```typescript
// In clerk-auth.service.ts
private deriveRoleFromClerkPayload(payload: ClerkJwtPayload): UserRole | null {
  // 1. Check publicMetadata first (most authoritative)
  if (payload.publicMetadata?.role) {
    return payload.publicMetadata.role;
  }
  
  // 2. Check direct role claim
  if (payload.role) {
    return payload.role;
  }
  
  // 3. Check organization role
  if (payload.orgRole) {
    return payload.orgRole;
  }
  
  // No role = no access
  return null;
}
```

## Setting Up Webhooks

### 1. In Clerk Dashboard

1. Go to **Webhooks** in your Clerk dashboard
2. Add endpoint: `https://your-api.onrender.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret

### 2. In Render Environment

Add environment variable:
```
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Manual Role Assignment

For existing users or special cases:

### Via Clerk Dashboard

1. Go to Users
2. Select a user
3. Edit Public metadata:
```json
{
  "role": "ADMIN"
}
```

### Via API (with secret key)

```javascript
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'ADMIN'
  }
});
```

## Security Best Practices

1. **Never trust client-provided roles** - Always validate server-side
2. **Use publicMetadata for roles** - It's included in JWT but can't be set by clients
3. **Validate webhook signatures** - Ensures requests come from Clerk
4. **Fail closed** - No role means no access, never default to a role
5. **Audit role changes** - Log when roles are assigned or changed

## Troubleshooting

### User has no role after signup

1. Check webhook logs in Clerk dashboard
2. Verify webhook secret is configured
3. Check API logs for webhook errors
4. Manually set role in Clerk dashboard as fallback

### Role not updating

1. User needs to sign out and back in for new JWT
2. Check if webhook processed the update
3. Verify role is valid (matches UserRole enum)

### 403 Forbidden errors

1. Check user's publicMetadata in Clerk
2. Verify role meets endpoint requirements
3. Check API logs for role validation details