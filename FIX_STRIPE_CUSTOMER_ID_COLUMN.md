# Fix: Missing stripeCustomerId Column

## Problem
Your webhook is working but failing with:
```
ERROR: column users.stripeCustomerId does not exist at character 792
```

## Solution
Run the database migration to add the missing column.

## Steps to Fix on Render

### Option 1: Run Migration via Render Shell (Recommended)

1. **Go to Render Dashboard**
   - Navigate to your API service
   - Click "Shell" tab

2. **Run the migration:**
   ```bash
   cd /workspace/api
   npx prisma migrate deploy
   ```

   This will apply the new migration that adds the `stripeCustomerId` column.

3. **Verify the fix:**
   ```bash
   npx prisma db pull
   ```

### Option 2: Manual SQL Query (If migration fails)

If the migration fails, you can manually run the SQL:

1. Go to your database provider (e.g., Render PostgreSQL Dashboard)
2. Open SQL console
3. Run this query:

```sql
-- Add stripeCustomerId column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'stripeCustomerId'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "stripeCustomerId" TEXT;
        CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
    END IF;
END $$;
```

### Option 3: Trigger Redeploy (Simplest)

If your Render service has automatic migrations enabled:

1. **Force a redeploy:**
   - Go to Render Dashboard > Your API service
   - Click "Manual Deploy" > "Deploy latest commit"

2. **Check build logs** to ensure migrations run successfully

## After the Fix

Once the migration is complete:

1. **Test the webhook again** from Clerk Dashboard
2. **Create a real test user** through your app's sign-up page (recommended over Clerk test webhooks)
3. **Check Render logs** - you should see:
   ```
   ✅ [E2E DEBUG] USER CREATION COMPLETE: user_xxx with role PARENT
   ```

## Why This Happened

The `stripeCustomerId` column is defined in your Prisma schema but wasn't created in your production database. This typically happens when:
- Initial migrations weren't fully run on production
- The column was accidentally dropped
- Database was restored from an old backup

## Prevention

To prevent this in the future:
- Always run `npx prisma migrate deploy` after deploying new code
- Use Render's automatic migration feature in your build command
- Add database schema validation to your health check endpoint

## Quick Verification

After running the migration, verify it worked:

```bash
# Connect to your database and check the column exists
psql $DATABASE_URL -c "\d users" | grep stripeCustomerId
```

You should see:
```
 stripeCustomerId | text | | | 
```

## Need Help?

If you encounter errors:
1. Check Render logs for migration errors
2. Verify DATABASE_URL is correctly set
3. Ensure database user has ALTER TABLE permissions
4. Check if there are any foreign key constraints blocking the change
