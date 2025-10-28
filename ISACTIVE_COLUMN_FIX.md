# isActive Column Fix for Clerk Webhook Issue

## Problem Summary

The Clerk webhook is failing because the `isActive` column is missing from the `users` table in your database.

## Root Cause Analysis

1. **Your SQL had a table name error**: You used `"User"` (Prisma model name) instead of `"users"` (actual PostgreSQL table name)
2. **Table Structure**:
   - `users` table (User model): Full user profile - **NEEDS** `isActive` column
   - `app_users` table (AppUser model): Lightweight auth only - **DOES NOT NEED** `isActive` column

3. **Prisma Schema**: Already defines `isActive Boolean @default(true)` on the User model (line 146 in schema.prisma)
4. **Initial Migration**: Already includes the column definition, but may not have been applied to your database

## Solution

### Option 1: Run Prisma Migration (Recommended)

If you're using Prisma migrations:

```bash
cd api
npx prisma migrate deploy
```

This will apply all pending migrations including the one that adds `isActive`.

### Option 2: Manual SQL Fix (If migrations aren't working)

Run this SQL directly on your database:

```sql
-- Add isActive column to users table (note: lowercase 'users', not 'User')
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Verify it was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'isActive';
```

### Verification Steps

1. **Check if column exists**:
   ```bash
   psql $DATABASE_URL -f api/prisma/migrations/verify-isactive.sql
   ```

2. **Test the Clerk webhook**:
   - Create a test user in Clerk
   - Check your API logs for successful user creation
   - Verify both `app_users` and `users` tables have the new user

## Important Notes

### Do NOT add isActive to AppUser

The `AppUser` model is intentionally lightweight for authentication only. It does **NOT** need an `isActive` column because:
- It's only used for auth verification
- The full `User` model handles all user state and preferences
- The Clerk webhook creates entries in both tables with the correct structure

### Key Differences

| Table | Purpose | Has isActive? |
|-------|---------|---------------|
| `users` | Full user profile, subscriptions, relationships | ✅ YES |
| `app_users` | Lightweight auth (clerkId, email, role) | ❌ NO |

## Troubleshooting

### If webhook still fails after adding column:

1. **Check API logs** for the specific error message
2. **Verify table name**: Must be `"users"` not `"User"`
3. **Check Prisma schema** matches your database:
   ```bash
   cd api
   npx prisma db pull
   ```
4. **Regenerate Prisma client**:
   ```bash
   cd api
   npx prisma generate
   ```
5. **Restart your API server**

### If you need to check existing data:

```sql
-- See current users table structure
\d users

-- Count users by active status
SELECT "isActive", COUNT(*) 
FROM users 
GROUP BY "isActive";
```

## Testing the Fix

After applying the fix, test with a new Clerk user signup:

1. Go to your frontend signup page
2. Create a new user
3. Check the API logs - you should see:
   ```
   ✅ [handleUserCreated] AppUser upserted
   ✅ [handleUserCreated] User upserted successfully
   ```
4. Verify in database:
   ```sql
   SELECT id, email, role, "isActive" FROM users ORDER BY "createdAt" DESC LIMIT 1;
   ```

## Additional Resources

- Clerk Webhook Controller: `api/src/webhooks/clerk-webhook.controller.ts`
- Prisma Schema: `api/prisma/schema.prisma` (lines 124-190 for User model)
- Initial Migration: `api/prisma/migrations/20240101000000_init/migration.sql` (line 63)
