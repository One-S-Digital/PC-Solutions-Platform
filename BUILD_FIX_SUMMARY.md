# Build Failure Fix - Correct Solution

## Problem
Migration `20251218000000_subscription_management_system` was stuck in **FAILED** state, blocking all subsequent migrations.

## Root Causes

1. **Missing Base Infrastructure**: Base `subscriptions` and `subscription_plans` tables didn't exist
2. **Stuck Failed Migration**: Entry in `_prisma_migrations` table with `finished_at IS NULL` blocked all migrations
3. **Migration Can't Complete**: Migration tries to ALTER non-existent tables, fails again

## The Correct Solution

### ✅ What We Do (Prepare Ground)
The prebuild script prepares the database so the migration can succeed:

1. **Clear the failed state** - Mark migration as rolled-back (removes roadblock)
2. **Create missing infrastructure** - Ensure base tables exist
3. **Exit cleanly** - Let Prisma handle the rest

### ✅ What Prisma Does (Complete Migration)
Then `prisma migrate deploy` runs normally:

1. Sees migration is rolled-back (not failed)
2. Runs the migration fresh
3. Migration succeeds (infrastructure already exists)
4. Marks migration as applied in history
5. Moves on to next migrations

## Key Changes

### 1. Force Mark as Rolled-Back (Not Delete, Not Apply)

```javascript
const forceMarkMigrationRolledBack = (migrationName) => {
  const sql = `
UPDATE "_prisma_migrations" 
SET finished_at = NOW(),
    rolled_back_at = NOW()
WHERE migration_name = '${migrationName}' 
AND finished_at IS NULL;  -- Only if it's stuck in failed state
`;
  runSql(sql);
};
```

This **clears the failed state** without deleting history, allowing Prisma to re-run it.

### 2. Prepare Database Schema

```javascript
// Ensure base tables exist
CREATE TABLE IF NOT EXISTS "subscriptions" (...);
CREATE TABLE IF NOT EXISTS "subscription_plans" (...);

// Let Prisma add the enhancement columns when it runs the migration
```

### 3. Let Prisma Complete the Migration

**Before (Wrong):**
```javascript
ensureSchema();
markAsApplied(); // ❌ We manually mark it complete
// Migration history is incomplete
```

**After (Correct):**
```javascript
clearFailedState();  // Remove roadblock
ensureSchema();      // Prepare infrastructure  
// ✅ Let `prisma migrate deploy` run and complete the migration
```

## Build Flow

```
┌─────────────────────────────────────────┐
│ Phase 1: Prebuild (prepare ground)     │
├─────────────────────────────────────────┤
│ 1. Detect failed migration              │
│ 2. Mark as rolled-back (clear failed)   │
│ 3. Create base tables if missing        │
│ 4. Exit - ready for Prisma              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Phase 2: Prisma migrate deploy         │
├─────────────────────────────────────────┤
│ 1. See migration is rolled-back         │
│ 2. Run migration (SQL executes)         │
│ 3. Migration succeeds (infra exists!)   │
│ 4. Mark as applied in history ✅        │
│ 5. Move to next migration               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Phase 3: Build completes ✅             │
└─────────────────────────────────────────┘
```

## Why This Is Correct

✅ **Migration history is complete** - Prisma tracks it properly  
✅ **Migration actually runs** - SQL executes through Prisma  
✅ **Auditable** - Full history of what happened  
✅ **Future migrations work** - Normal flow restored  
✅ **Rollback possible** - Migration is properly tracked  

## What Changed in Code

### Simplified Handlers
Other migrations (already applied) just verify schema exists:

```javascript
// Old way - tried to manipulate migration history
ensureSchema();
await resolveMigration('rolled-back', 'migration_name');
await resolveMigration('applied', 'migration_name');

// New way - just ensure schema (safety net)
ensureSchema();
// Let Prisma handle the migration lifecycle
```

### Failed Migration Recovery
Only for stuck/failed migrations:

```javascript
// 1. Clear failed state
forceMarkMigrationRolledBack('20251218000000_subscription_management_system');

// 2. Prepare infrastructure
ensureSubscriptionManagementSystem();

// 3. Done - Prisma will run it
log('Prisma migrate deploy will now run this migration');
```

## Expected Outcome

```
Build Logs:
[prebuild:db] 🔧 Preparing for subscription management system migration...
[prebuild:db] 🔨 Force-marking migration as rolled-back...
[prebuild:db] ✅ Marked migration as rolled-back. Prisma will re-run it.
[prebuild:db] ✅ Database schema prepared for migration.
[prebuild:db] 📋 Prisma migrate deploy will now run this migration and mark it complete.
[prebuild:db] Done.

🔄 Deploying database migrations...
Prisma schema loaded from prisma/schema.prisma

Applying migration `20251218000000_subscription_management_system`
✅ Migration applied successfully

Applying migration `20251219000000_add_job_contract_types`  
✅ Migration applied successfully

✅ Migrations deployed successfully
✅ Build preparation complete!
```

## Files Changed

```
api/scripts/prebuild-db-setup.mjs     (simplified, lets Prisma do its job)
BUILD_FIX_SUMMARY.md                  (this file)
PRISMA_MIGRATION_BUILD_FIX.md         (technical docs)
```

---

**Key Principle:** Prebuild prepares the ground, Prisma completes the migration properly.  
**Result:** Clean migration history, proper tracking, future migrations work.
