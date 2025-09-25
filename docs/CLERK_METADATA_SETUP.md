# Setting Up User Roles in Clerk

**IMPORTANT**: User roles MUST be set in Clerk metadata. Without a valid role, users will be denied access to the system. There is no default role.

## Steps to Set Public Metadata in Clerk Dashboard

1. **Go to Clerk Dashboard**
   - Visit https://dashboard.clerk.com
   - Select your application

2. **Navigate to Users**
   - Click on "Users" in the left sidebar
   - Find your user account

3. **Edit User Metadata**
   - Click on the user to view details
   - Scroll down to "Public metadata" section
   - Click "Edit"

4. **Add Role**
   Add the following JSON:
   ```json
   {
     "role": "SUPER_ADMIN"
   }
   ```

5. **Save Changes**
   - Click "Save"
   - The role will be included in the JWT token

## Available Roles

- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative access
- `FOUNDATION` - Foundation organization access
- `PRODUCT_SUPPLIER` - Product supplier access
- `SERVICE_PROVIDER` - Service provider access
- `EDUCATOR` - Educator access
- `PARENT` - Basic parent access (default)

## Using Clerk SDK to Set Metadata Programmatically

You can also set metadata using the Clerk SDK:

```javascript
import { clerkClient } from '@clerk/clerk-sdk-node';

await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'SUPER_ADMIN'
  }
});
```

## How It Works

1. When a user signs in, their JWT token includes the public metadata
2. The system checks for roles in this order:
   - `publicMetadata.role` (highest priority)
   - `role` claim in JWT
   - `orgRole` (organization role)
3. If NO valid role is found, the user is denied access
4. There is NO default role - users without roles cannot access the system
5. Once the database is available, roles are synced from Clerk metadata

## Testing

After setting the metadata:

1. Sign out and sign back in (to get a new token)
2. Access `/api/admin/frontend-settings`
3. You should now have access even if the database isn't initialized

## Security Note

Public metadata is included in the JWT token and visible to the client. Only store non-sensitive information like roles. Never store secrets or sensitive data in public metadata.

## Troubleshooting

### "No role assigned" Error

If you see this error:
1. Check that the user has a role in Clerk public metadata
2. Ensure the role is spelled correctly (case-sensitive)
3. Verify the role is one of the valid roles listed above
4. Sign out and sign back in to get a new token with updated metadata

### Admin Access Not Working

1. Verify the role in Clerk Dashboard is set to `SUPER_ADMIN` or `ADMIN`
2. Check the browser console for role validation messages
3. Ensure you've signed out and back in after updating metadata
4. Check the API logs for role derivation details