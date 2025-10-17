# How to Set SUPER_ADMIN Role

## Why SUPER_ADMIN Can't Be Set Through Signup

SUPER_ADMIN is a privileged role that grants full system access. For security reasons:
- ❌ NOT available in signup form
- ❌ NOT set through webhook
- ✅ Must be manually assigned by existing admin or script

## Method 1: Using the Update Role Script (First Super Admin)

### Step 1: Get Your Clerk User ID

After signing up, your Clerk user ID appears in backend logs:
```
🔐 Auth Debug: AppUser missing, creating baseline user with PARENT role
{ userId: 'user_3294hGWOgY28Bu8V8P8kPdpA6NB' }  ← This is your Clerk ID
```

Or you can find it in Clerk Dashboard → Users → Click on your user

### Step 2: Update the Script

Edit `api/scripts/update-user-role.ts`:

```typescript
// Line 71 - Replace with your Clerk ID
const clerkId = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';  // Your actual Clerk ID

// Line 76 - Uncomment this line
updateUserRole(clerkId, UserRole.SUPER_ADMIN);
```

### Step 3: Run the Script

**Locally (with database access):**
```bash
cd api
DATABASE_URL="your_database_url_from_render" node -r tsconfig-paths/register -r ts-node/register scripts/update-user-role.ts
```

**Or on Render (via shell):**
```bash
# In Render Dashboard → Shell
cd api
ts-node scripts/update-user-role.ts
```

### Step 4: Verify

The script will output:
```
Current user:
  email: your@email.com
  role: PARENT  ← Before

Updated user:
  email: your@email.com
  role: SUPER_ADMIN  ← After
```

## Method 2: Direct Database Update

**If you have database access:**

```sql
-- Find your user
SELECT id, "clerkId", email, role FROM "User" 
WHERE "clerkId" = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';

-- Update to SUPER_ADMIN
UPDATE "User" 
SET role = 'SUPER_ADMIN' 
WHERE "clerkId" = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';

-- Also update AppUser table
UPDATE "AppUser" 
SET role = 'SUPER_ADMIN' 
WHERE "clerkId" = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';

-- Verify
SELECT * FROM "User" WHERE "clerkId" = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';
```

## Method 3: Using Role Management API (After You're Super Admin)

Once you have SUPER_ADMIN access, you can assign roles through the API:

```bash
# Get your auth token from browser (logged in as SUPER_ADMIN)
# Then use the role management endpoint

curl -X PATCH https://pc-solutions-v2.onrender.com/api/admin/role-management/users/{userId}/role \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "SUPER_ADMIN"}'
```

Or use the admin UI if there's a role management page.

## Quick Script for Your Account

Here's a ready-to-use script:

**File: `api/scripts/set-my-super-admin.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function setMySuperAdmin() {
  // Replace with your Clerk ID from the logs
  const myClerkId = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';

  try {
    console.log('🔍 Looking for user:', myClerkId);

    // Update AppUser
    const appUser = await prisma.appUser.update({
      where: { clerkId: myClerkId },
      data: { role: UserRole.SUPER_ADMIN },
    });

    console.log('✅ AppUser updated:', appUser);

    // Update User (if exists)
    try {
      const user = await prisma.user.update({
        where: { clerkId: myClerkId },
        data: { role: UserRole.SUPER_ADMIN },
      });
      console.log('✅ User updated:', user);
    } catch (e) {
      console.log('ℹ️  User table not updated (might not exist yet)');
    }

    console.log('🎉 You are now SUPER_ADMIN!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setMySuperAdmin();
```

**Run it:**
```bash
cd api
DATABASE_URL="your_render_database_url" ts-node scripts/set-my-super-admin.ts
```

## Important Notes

1. **First Super Admin**: Must be set via script or direct database update
2. **Security**: Only trusted users should have SUPER_ADMIN
3. **Subsequent Admins**: Can be assigned by existing SUPER_ADMINs through the UI/API
4. **Role Hierarchy**:
   - SUPER_ADMIN - Full system access
   - ADMIN - Limited admin access
   - FOUNDATION, SUPPLIER, etc. - Regular users

## After Setting Super Admin

1. Log out
2. Log back in
3. Backend will fetch your updated role
4. You'll have full system access

## Troubleshooting

**Script errors:**
- Make sure DATABASE_URL is correct
- Check Clerk ID is correct (from logs or Clerk Dashboard)
- Ensure database connection works

**Role doesn't update:**
- Check both AppUser and User tables were updated
- Log out and log back in
- Clear browser cache

**Permission denied:**
- Make sure you're using a user that exists in the database
- Check the user was created (either via webhook or fallback)

## Role Assignment Best Practices

1. **Bootstrap**: Set first SUPER_ADMIN via script
2. **Subsequent admins**: Use role management UI/API
3. **Regular users**: Roles set automatically via signup/webhook
4. **Never**: Allow SUPER_ADMIN selection in signup forms

Your account should be upgraded to SUPER_ADMIN using one of these methods!
