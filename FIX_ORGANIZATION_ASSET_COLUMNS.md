# Fix: Organization Asset Columns Missing in Production Database

## Problem
The production database is missing the `logoAssetId` and `coverAssetId` columns in the `organizations` table, causing the following error when creating service provider profiles:

```
PrismaClientKnownRequestError: 
Invalid `prisma.organization.create()` invocation:
The column `organizations.coverAssetId` does not exist in the current database.
```

## Root Cause
- The Prisma schema defines `logoAssetId` and `coverAssetId` columns in the Organization model
- These columns were in the initial migration (`20240101000000_init/migration.sql`)
- However, the production database doesn't have these columns
- Subsequent comprehensive migrations (`20251030_comprehensive_schema_audit_fix` and `20251220000003_add_missing_organization_columns`) did not include these asset columns

## Solution
A new migration has been created to add these missing columns:

**Migration**: `/workspace/api/prisma/migrations/20251115_add_organization_asset_columns/migration.sql`

This migration:
1. Adds `logoAssetId` column to organizations table (if missing)
2. Adds `coverAssetId` column to organizations table (if missing)
3. Adds foreign key constraints to the assets table
4. Uses `IF NOT EXISTS` checks to be safe to run multiple times

## How to Apply the Fix

### Option 1: Auto-apply on next deployment
If your Render deployment is configured to run migrations automatically:
1. Commit this migration to the repository
2. Push to the branch
3. Render will apply the migration during deployment

### Option 2: Manual application via Render Shell
1. Go to Render Dashboard → Your API Service
2. Click "Shell" to open a terminal
3. Run:
```bash
cd /opt/render/project/src/api
npx prisma migrate deploy
```

### Option 3: Manual SQL execution
Connect to your Render PostgreSQL database and run the migration SQL directly:
```bash
# On Render shell or via psql
psql $DATABASE_URL -f /opt/render/project/src/api/prisma/migrations/20251115_add_organization_asset_columns/migration.sql
```

## Verification
After applying the migration, verify the columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('logoAssetId', 'coverAssetId');
```

Expected output:
```
  column_name   | data_type 
----------------+-----------
 logoAssetId    | text
 coverAssetId   | text
```

## Testing
After applying the migration:
1. Navigate to the service provider profile settings page
2. Fill out the profile form
3. Click "Save Settings"
4. Verify the profile saves successfully without errors

## Additional Notes
- This migration is idempotent (safe to run multiple times)
- No data will be lost - existing organizations remain unchanged
- The columns are nullable, so existing records don't require updates
- After the migration, you may also need to regenerate the Prisma client: `npx prisma generate`
