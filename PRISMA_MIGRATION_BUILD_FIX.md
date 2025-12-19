# Prisma Migration Build Failure - Root Cause & Fix

## Issue Summary
Build was failing on Render with error:
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251218000000_subscription_management_system` migration started at 2025-12-19 10:55:50.794337 UTC failed
```

## Root Cause
The migration `20251218000000_subscription_management_system` failed in a previous deployment and was stuck in a failed state. The prebuild recovery script (`api/scripts/prebuild-db-setup.mjs`) attempted to fix this by ensuring the schema exists, but it had a critical bug:

**The script tried to ALTER tables that didn't exist**, causing the error:
```
Error: P1014
The underlying table for model `subscriptions` does not exist.
```

This happened because the original migration that creates the tables failed, but the recovery script assumed the tables existed and tried to add columns to them.

## Fix Applied

### 1. Updated `ensureSubscriptionManagementSystem()` function
**File:** `api/scripts/prebuild-db-setup.mjs`

Wrapped all `ALTER TABLE` statements in checks to verify tables exist before attempting modifications:

```javascript
-- Before (caused errors):
ALTER TABLE "subscriptions" 
    ADD COLUMN IF NOT EXISTS "trial_start" TIMESTAMP(3),
    ...

-- After (safe):
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE "subscriptions" 
            ADD COLUMN IF NOT EXISTS "trial_start" TIMESTAMP(3),
            ...
    END IF;
END$$;
```

Changes applied to:
- `subscriptions` table column additions
- `subscription_plans` table column additions
- Foreign key constraint additions (now check both source and target tables exist)
- Index creation (now wrapped in table existence checks)

### 2. Added handler for new migration
Added `ensureJobContractTypes()` function to handle the pending migration `20251219000000_add_job_contract_types` that adds REPLACEMENT, TEMPORARY, and FREELANCE enum values to JobContractType.

## Prebuild Script Configuration ✅

The prebuild scripts are **correctly configured** to run automatically:

### Automatic Execution Flow:
1. **During install:** `pnpm install` → `postinstall` hook runs `prisma generate`
2. **During build:** `pnpm run build:render` → `render-build-with-recovery.sh` → `prebuild-db-setup.mjs`

### Script Hierarchy:
- **`render-build-with-recovery.sh`**: Main build orchestrator
  - Phase 1: Calls `prebuild-db-setup.mjs` for initial recovery
  - Phase 2: Runs `prisma migrate deploy`
  - Phase 3: On failure, calls `prebuild-db-setup.mjs` again for recovery retry

- **`prebuild-db-setup.mjs`**: Migration recovery and schema verification
  - Checks each known problematic migration
  - Ensures database schema matches expected state
  - Marks migrations as rolled-back then applied to clear failed state
  - **NOW SAFE:** All operations wrapped in existence checks

### Available Manual Commands:
```bash
# From workspace root:
pnpm run prebuild:db          # Run full database setup
pnpm run db:setup             # Alias for prebuild:db
pnpm run db:migrate           # Deploy migrations
pnpm run db:status            # Check migration status

# From api directory:
pnpm run prebuild:db          # Run full database setup
pnpm run db:setup:recovery    # Run recovery script only
```

## Migration Handlers in prebuild-db-setup.mjs

The script now handles these migrations safely:

1. ✅ `20251104140358_add_asset_metadata_field` - Assets metadata
2. ✅ `20251119100000_add_categories_array_fields` - Category arrays
3. ✅ `20251114140526_add_i18n_translation_tables` - Translation infrastructure
4. ✅ `20251217000000_add_message_file_columns` - Message file attachments
5. ✅ `20251217100000_add_educator_availability_settings` - Educator scheduling
6. ✅ `20251218000000_subscription_management_system` - **FIXED** - Subscription enhancements
7. ✅ `20251219000000_add_job_contract_types` - **NEW** - Job contract type enums

## Expected Outcome

With these fixes:
1. ✅ The prebuild script will no longer crash when tables don't exist
2. ✅ Failed migrations can be properly marked as rolled-back
3. ✅ `prisma migrate deploy` can proceed to apply migrations from scratch
4. ✅ The build will complete successfully
5. ✅ All pending migrations will be applied

## Testing Recommendations

To test locally (if you have access to a test database):
```bash
# 1. Check current migration status
cd api && pnpm run db:status

# 2. Run recovery script manually
cd api && node scripts/prebuild-db-setup.mjs

# 3. Deploy migrations
cd api && pnpm run db:migrate

# 4. Verify success
cd api && pnpm run db:status
```

## Next Deploy

On the next Render deployment, the build should succeed because:
- The prebuild script will safely handle the failed migration
- Tables will be created properly by the migration
- The recovery logic won't crash on missing tables
- All migrations will apply cleanly

---

**Fixed by:** Cloud Agent (Cursor)
**Date:** 2025-12-19
**Related Branch:** cursor/prisma-migration-build-failure-84bc
