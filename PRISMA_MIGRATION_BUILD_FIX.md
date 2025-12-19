# Prisma Migration Build Failure - Root Cause & Fix

## Issue Summary
Build was failing on Render with error:
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251218000000_subscription_management_system` migration started at 2025-12-19 10:55:50.794337 UTC failed
```

Additionally, the prebuild recovery script was crashing with:
```
Error: P1014
The underlying table for model `subscriptions` does not exist.
```

## Root Cause Analysis

### Primary Issue
The migration `20251218000000_subscription_management_system` failed in a previous deployment and was stuck in a failed state in the Prisma migration tracking table.

### Secondary Issue (Critical)
The prebuild recovery script (`api/scripts/prebuild-db-setup.mjs`) had a **critical design flaw**:
- It tried to ALTER tables (`subscriptions`, `subscription_plans`) that didn't exist
- The original init migration (`20240101000000_init`) that creates these base tables never ran successfully
- When the recovery script tried to add columns to non-existent tables, it crashed
- This prevented the recovery mechanism from working at all

### Why This Happened
The `ensureSubscriptionManagementSystem()` function assumed the base tables already existed and only tried to add new columns and features. When the base infrastructure was missing, the entire recovery failed.

## The Correct Fix

### ❌ Wrong Approach (Initial Fix Attempt)
Wrapping all operations in `IF EXISTS` checks that silently skip when tables are missing. This **masks the real problem** and makes issues harder to diagnose.

### ✅ Correct Approach (Current Fix)
**Create the missing infrastructure** in the recovery script, ensuring:
1. Base tables (`subscriptions`, `subscription_plans`) are created if they don't exist
2. Base indexes are created
3. New enum values are added
4. New columns are added to existing tables
5. New tables (`subscription_actions`, `subscription_schedules`, `subscription_notes`) are created
6. Foreign keys and indexes are properly set up

This way:
- If the init migration failed, we create the base infrastructure
- If it succeeded, `CREATE TABLE IF NOT EXISTS` safely skips
- Genuine errors (like missing enum types) still surface for diagnosis
- The recovery actually fixes the broken state instead of hiding it

## Changes Made

### File: `api/scripts/prebuild-db-setup.mjs`

#### Updated `ensureSubscriptionManagementSystem()` function:

**Added base table creation:**
```sql
-- Ensure base subscriptions table exists (from init migration)
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Ensure base indexes exist for subscriptions
CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx" ON "subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- Ensure base subscription_plans table exists (from init migration)
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "features" TEXT[],
    "limits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
```

**Then adds enhancements:**
- New enum values (PAUSED, EXPIRED, TRIAL, PENDING, GRACE_PERIOD)
- New columns to existing tables
- New audit/scheduling tables
- Foreign keys and indexes

**Removed problematic table existence checks** that were masking errors:
- No more wrapping ALTER TABLE in IF EXISTS checks
- If tables don't exist now, they get created above
- If genuinely required items are missing (like enum types), errors surface properly

#### Added `ensureJobContractTypes()` function:
Handles the pending migration `20251219000000_add_job_contract_types` by adding REPLACEMENT, TEMPORARY, FREELANCE values to the JobContractType enum.

## Statistics
- **Lines changed:** +98, -105 (net simplification while adding functionality)
- **Net result:** More robust, clearer error paths, proper infrastructure recovery

## Why This Fix Is Better

### Advantages:
1. **Proper Recovery:** Actually creates missing infrastructure instead of silently skipping
2. **Clear Errors:** Genuine issues (missing enums, type mismatches) surface immediately
3. **Idempotent:** Safe to run multiple times - `CREATE IF NOT EXISTS` handles existing tables
4. **Self-Healing:** If init migration never ran, recovery creates the base infrastructure
5. **Maintainable:** Clear what infrastructure is expected vs created

### Prevents:
- ❌ Silent failures that hide database schema issues
- ❌ Unclear error messages about missing operations
- ❌ Build failures with no actionable information
- ❌ State where migrations can't proceed because base tables are missing

## Prebuild Script Configuration ✅

The prebuild scripts **are correctly configured** to run automatically:

### Build Flow on Render:
```
pnpm install --frozen-lockfile
  └─> runs postinstall: prisma generate
  
cd api && pnpm run build:render
  └─> ./scripts/render-build-with-recovery.sh
      ├─> Phase 1: node ./scripts/prebuild-db-setup.mjs (first attempt)
      ├─> Phase 2: prisma migrate deploy
      └─> Phase 3: node ./scripts/prebuild-db-setup.mjs (recovery retry if Phase 2 fails)
```

## Migration Handlers in prebuild-db-setup.mjs

The script now properly handles these migrations:

1. ✅ `20251104140358_add_asset_metadata_field` - Assets metadata
2. ✅ `20251119100000_add_categories_array_fields` - Category arrays
3. ✅ `20251114140526_add_i18n_translation_tables` - Translation infrastructure
4. ✅ `20251217000000_add_message_file_columns` - Message file attachments
5. ✅ `20251217100000_add_educator_availability_settings` - Educator scheduling
6. ✅ `20251218000000_subscription_management_system` - **FIXED** - Creates base tables + enhancements
7. ✅ `20251219000000_add_job_contract_types` - **NEW** - Job contract type enums

## Expected Outcome

On the next Render deployment:
1. ✅ Prebuild script creates base `subscriptions` and `subscription_plans` tables if missing
2. ✅ Failed migration gets marked as rolled-back
3. ✅ `prisma migrate deploy` applies migrations cleanly from scratch or incrementally
4. ✅ All new tables, columns, indexes, and constraints are created
5. ✅ Build completes successfully
6. ✅ Future migrations can proceed normally

## Files Changed

```
api/scripts/prebuild-db-setup.mjs     (+98, -105 lines)
PRISMA_MIGRATION_BUILD_FIX.md          (new documentation)
```

---

**Fixed by:** Cloud Agent (Cursor)  
**Date:** 2025-12-19  
**Branch:** cursor/prisma-migration-build-failure-84bc  
**Approach:** Proper infrastructure creation, not error masking
