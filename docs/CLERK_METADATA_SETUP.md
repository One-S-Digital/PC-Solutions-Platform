# Setting Up User Roles in Clerk

To grant admin access to users when the database is not initialized, you need to set the user's role in their Clerk public metadata.

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
2. If the database is not initialized, the API uses the role from public metadata
3. Once the database is initialized, the role is synced to the database
4. The database role takes precedence when available

## Testing

After setting the metadata:

1. Sign out and sign back in (to get a new token)
2. Access `/api/admin/frontend-settings`
3. You should now have access even if the database isn't initialized

## Security Note

Public metadata is included in the JWT token and visible to the client. Only store non-sensitive information like roles. Never store secrets or sensitive data in public metadata.