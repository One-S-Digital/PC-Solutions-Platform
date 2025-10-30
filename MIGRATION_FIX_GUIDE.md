# Migration Failure Fix Guide

## Problem Summary

The Render backend deployment is failing due to database migration issues:

### Root Causes

1. **Ghost Migrations**: The production database has migrations that don't exist in the local codebase:
   - `20250926_unify_asset_appuser` (appears 4 times - duplicates!)
   - `20251017_add_firstname_lastname_to_appuser`

2. **Failed Migration**: The `20251030_comprehensive_schema_audit_fix` migration failed because it tried to create an index on the `storageKey` column before ensuring the column exists.

3. **Database State Mismatch**: The production database is in an inconsistent state where some migrations were recorded but their changes weren't fully applied.

## Error Details

```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Migration name: 20251030_comprehensive_schema_audit_fix
Database error code: 42703
Database error: ERROR: column "storageKey" does not exist
```

## Solutions Applied

### 1. Fixed the Migration File ✅

**File**: `/workspace/api/prisma/migrations/20251030_comprehensive_schema_audit_fix/migration.sql`

**Changes**:
- Added a check to ensure `storageKey` column exists before creating an index on it
- Wrapped index creation in conditional blocks that verify column existence first
- Made the migration defensive and idempotent

**Key Fix**:
```sql
-- Before (would fail):
CREATE INDEX IF NOT EXISTS "assets_storageKey_idx" ON "assets"("storageKey");

-- After (checks first):
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'storageKey'
    ) THEN
        CREATE INDEX IF NOT EXISTS "assets_storageKey_idx" ON "assets"("storageKey");
        RAISE NOTICE '✅ Created index on storageKey';
    END IF;
END $$;
```

### 2. Enhanced Migration Script ✅

**File**: `/workspace/api/scripts/render-migrate.sh`

**Changes**:
- Added automatic resolution of ghost migrations
- Added failed migration cleanup before attempting new migrations
- Improved error handling and logging
- Made the script more robust for production deployments

**Key Features**:
```bash
# Resolves ghost migrations automatically
GHOST_MIGRATIONS=(
    "20250926_unify_asset_appuser"
    "20251017_add_firstname_lastname_to_appuser"
)

for migration in "${GHOST_MIGRATIONS[@]}"; do
    npx prisma migrate resolve --applied "$migration" || true
done

# Resolves failed migrations
npx prisma migrate resolve --rolled-back "20251030_comprehensive_schema_audit_fix" || true
```

### 3. Created Manual Fix Script ✅

**File**: `/workspace/api/scripts/fix-migration-state.sql`

A SQL script that can be run manually if automatic resolution fails. It:
- Removes duplicate migration entries
- Cleans up ghost migrations
- Ensures critical columns exist
- Verifies the database state

## How the Fix Works

### Automated Fix (Primary Method)

The next Render deployment will automatically:

1. **Generate Prisma Client**: Ensures the ORM is up to date
2. **Check Migration Status**: Identifies issues
3. **Resolve Ghost Migrations**: Marks non-existent migrations as applied
4. **Resolve Failed Migrations**: Marks the failed migration as rolled back
5. **Deploy Migrations**: Applies all pending migrations with the fixed SQL
6. **Verify Connection**: Ensures the database is healthy

### Manual Fix (Fallback Method)

If the automated fix doesn't work, you can:

1. Connect to the production database:
   ```bash
   psql $DATABASE_URL
   ```

2. Run the fix script:
   ```sql
   \i api/scripts/fix-migration-state.sql
   ```

3. Trigger a new deployment on Render

## Expected Outcome

After the fix is deployed:

✅ Ghost migrations will be marked as applied (removed from blocking state)
✅ Failed migration will be resolved
✅ All pending migrations will apply successfully
✅ The `storageKey` column will exist (or be created if missing)
✅ Indexes will be created on assets table
✅ Backend will start successfully

## Verification

After deployment, verify:

1. **Check Deployment Logs** on Render for:
   ```
   ✅ Database migrations completed successfully
   ✨ Migration process complete!
   ```

2. **Verify Migration Status** (if you have DB access):
   ```sql
   SELECT migration_name, finished_at 
   FROM "_prisma_migrations" 
   ORDER BY finished_at DESC 
   LIMIT 10;
   ```

3. **Test the API**:
   ```bash
   curl https://pc-solutions-api.onrender.com/api/health
   ```

## Prevention

To prevent this in the future:

1. **Never manually run migrations in production** without recording them in code
2. **Always keep migrations in version control** and sync them with the database
3. **Test migrations locally** before deploying to production
4. **Use `prisma migrate resolve`** carefully and document any manual interventions
5. **Monitor migration status** during deployments

## Troubleshooting

### If migrations still fail:

1. Check the Render logs for the specific error
2. Run the manual fix script (see Manual Fix section above)
3. Check if the `_prisma_migrations` table has any stuck entries:
   ```sql
   SELECT * FROM "_prisma_migrations" 
   WHERE finished_at IS NULL;
   ```
4. Verify column existence:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'assets';
   ```

### If the database is completely corrupted:

**⚠️ NUCLEAR OPTION** (only if nothing else works):
```bash
npx prisma migrate reset --force
```
This will:
- Drop all tables
- Re-run all migrations from scratch
- ⚠️ **DELETE ALL DATA** ⚠️

Only use this in a non-production environment or if you have a backup!

## Files Modified

1. ✅ `/workspace/api/prisma/migrations/20251030_comprehensive_schema_audit_fix/migration.sql`
2. ✅ `/workspace/api/scripts/render-migrate.sh`
3. ✅ `/workspace/api/scripts/fix-migration-state.sql` (new file)
4. ✅ `/workspace/MIGRATION_FIX_GUIDE.md` (this file)

## Next Steps

1. **Commit these changes** to your repository
2. **Push to the branch** that's connected to Render
3. **Trigger a new deployment** on Render (or wait for auto-deploy)
4. **Monitor the deployment logs** for success messages
5. **Test your API** after deployment

## Need Help?

If issues persist:
1. Check the Render deployment logs
2. Review the `_prisma_migrations` table in the database
3. Run the manual fix script if needed
4. Check if there are any other ghost migrations not listed here

---

**Created**: 2025-10-30
**Status**: Ready for deployment
**Tested**: Pending production deployment
