#!/usr/bin/env node

/**
 * Pre-build DB setup / migration recovery for production deploys.
 *
 * Goal:
 * - Be safe to run multiple times (idempotent)
 * - Auto-heal known problematic migrations by ensuring the target schema exists
 * - Resolve (mark rolled-back/applied) those migrations so `prisma migrate deploy` can proceed
 *
 * This script is intentionally conservative: it only contains explicit handlers for
 * known migrations referenced by docs in this repo.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ROOT = path.join(__dirname, '..');
const WORKSPACE_ROOT = path.join(API_ROOT, '..');
const SCHEMA_PATH = path.join(API_ROOT, 'prisma', 'schema.prisma');

const log = (message) => console.log(`[prebuild:db] ${message}`);
const warn = (message) => console.warn(`[prebuild:db] ${message}`);
const error = (message) => console.error(`[prebuild:db] ${message}`);

const envFlag = (value) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toString().toLowerCase());
};

if (!process.env.DATABASE_URL) {
  log('DATABASE_URL not set. Skipping DB setup.');
  process.exit(0);
}

if (envFlag(process.env.SKIP_DB_SETUP) || envFlag(process.env.SKIP_PRISMA_MIGRATION_RECOVERY)) {
  log('Skip flag set. Skipping DB setup.');
  process.exit(0);
}

const prismaBinCandidates = [
  path.join(WORKSPACE_ROOT, 'node_modules', '.bin', 'prisma'),
  path.join(API_ROOT, 'node_modules', '.bin', 'prisma'),
];

const PRISMA_BIN = prismaBinCandidates.find((p) => fs.existsSync(p));

const runPrisma = (args, { silent = false, input } = {}) => {
  const useNpx = !PRISMA_BIN;
  const cmd = useNpx ? 'npx' : PRISMA_BIN;
  const cmdArgs = useNpx ? ['prisma', ...args] : args;

  const shouldPipe = silent || typeof input === 'string';
  const stdio = shouldPipe ? ['pipe', 'pipe', 'pipe'] : 'inherit';

  const result = spawnSync(cmd, cmdArgs, {
    cwd: API_ROOT,
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    stdio,
    encoding: 'utf8',
    input,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed: ${stderr || stdout}`.trim());
  }

  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
};

/**
 * Run Prisma CLI but return status/stdout/stderr (no throw).
 * Useful for commands like `migrate diff --exit-code` where non-zero is expected.
 */
const runPrismaResult = (args, { input } = {}) => {
  const useNpx = !PRISMA_BIN;
  const cmd = useNpx ? 'npx' : PRISMA_BIN;
  const cmdArgs = useNpx ? ['prisma', ...args] : args;

  const result = spawnSync(cmd, cmdArgs, {
    cwd: API_ROOT,
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
    input,
  });

  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
    stderr: typeof result.stderr === 'string' ? result.stderr.trim() : '',
    error: result.error,
    cmd: `${cmd} ${cmdArgs.join(' ')}`.trim(),
  };
};

const runSql = (sql) =>
  runPrisma(['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'], {
    silent: true,
    input: sql,
  });

const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value ?? '').toLowerCase());

/**
 * Extract migration folder names from prisma db execute output.
 * We avoid relying on table formatting and instead regex-scan for names.
 */
const extractMigrationNames = (text) => {
  if (!text) return [];
  const matches = text.match(/\d{8,}_[A-Za-z0-9_]+/g) ?? [];
  return Array.from(new Set(matches));
};

/**
 * Read migrations from the _prisma_migrations table.
 * We intentionally use string_agg so we can parse output reliably.
 */
const getMigrationNamesFromDb = (whereClauseSql) => {
  const sql = `
SELECT COALESCE(string_agg("migration_name", E'\\n'), '') AS names
FROM "public"."_prisma_migrations"
WHERE ${whereClauseSql};
`;
  const out = runSql(sql);
  return extractMigrationNames(out);
};

const getAppliedMigrationNamesFromDb = () =>
  getMigrationNamesFromDb(`"finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`);

const getFailedMigrationNamesFromDb = () =>
  getMigrationNamesFromDb(`"finished_at" IS NULL AND "rolled_back_at" IS NULL`);

/**
 * Force mark a migration as applied by updating the tracking table directly.
 * This is ONLY safe when the migration record already exists (e.g. FAILED state)
 * and the DB schema has already been brought to the post-migration shape.
 */
const forceMarkMigrationApplied = (migrationName) => {
  const sql = `
UPDATE "public"."_prisma_migrations"
SET "finished_at" = NOW(),
    "rolled_back_at" = NULL
WHERE "migration_name" = '${migrationName.replace(/'/g, "''")}';
`;
  try {
    runSql(sql);
    log(`✅ Force-marked migration ${migrationName} as applied.`);
    return true;
  } catch (e) {
    warn(`⚠️  Could not force-mark migration ${migrationName} as applied: ${e.message}`);
    return false;
  }
};

const getPrismaMigrationsTableExists = () => {
  const sql = `
-- Return a stable scalar value so parsing is reliable across Prisma/psql output formats.
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = '_prisma_migrations'
) THEN 1 ELSE 0 END AS "exists";
`;
  try {
    const out = runSql(sql);
    // Prisma db execute output may include headers/formatting; accept any standalone "1".
    // Check for both "1" and exclude "0" to be more robust
    const outputStr = String(out);
    if (outputStr.includes('1') && !outputStr.match(/\b0\b/)) {
      return true;
    }
    if (/(^|\s)1(\s|$)/.test(outputStr)) {
      return true;
    }
    // If output contains "0" explicitly, table doesn't exist
    if (/\b0\b/.test(outputStr) || outputStr.trim() === '0') {
      return false;
    }
    // Fallback: try to query the table directly to confirm existence
    return checkMigrationsTableDirectly();
  } catch (e) {
    // On error, try direct check as fallback
    return checkMigrationsTableDirectly();
  }
};

/**
 * Fallback check: try to query the _prisma_migrations table directly.
 * If the table doesn't exist, we'll get an error. If it does, we'll get results (or empty).
 */
const checkMigrationsTableDirectly = () => {
  const sql = `SELECT COUNT(*) FROM "_prisma_migrations" LIMIT 1;`;
  try {
    runSql(sql);
    // If we got here without error, the table exists
    return true;
  } catch (e) {
    // Error likely means table doesn't exist (relation does not exist)
    return false;
  }
};

/**
 * Check for any failed migrations directly in the _prisma_migrations table.
 * This is a more reliable check than relying on table existence detection.
 */
const hasFailedMigrationsDirectCheck = () => {
  const sql = `
SELECT COUNT(*) AS cnt
FROM "_prisma_migrations"
WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL;
`;
  try {
    const out = runSql(sql);
    const match = out.match(/(\d+)/);
    return match ? Number(match[1]) > 0 : false;
  } catch (e) {
    // Table likely doesn't exist
    return false;
  }
};

const getNonPrismaTableCount = () => {
  const sql = `
SELECT COUNT(*)::int AS count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name <> '_prisma_migrations';
`;
  const out = runSql(sql);
  const match = out.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const getMigrationsOnDisk = () => {
  const migrationsDir = path.join(API_ROOT, 'prisma', 'migrations');
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    // Prisma expects migration folder names in chronological order (timestamp prefix)
    .sort((a, b) => a.localeCompare(b));
};

const dbMatchesPrismaSchema = () => {
  // Exit codes (with --exit-code):
  // - 0: no differences
  // - 2: differences found
  // Prisma may return 1 for unexpected errors (bad connection, etc).
  // 
  // NOTE: The Prisma CLI syntax for migrate diff is:
  //   --from-schema-datasource <path>  (path to schema file, uses DB connection from it)
  //   --to-schema-datamodel <path>     (path to schema file, uses datamodel from it)
  // The --schema flag is NOT valid for migrate diff.
  const res = runPrismaResult([
    'migrate',
    'diff',
    '--from-schema-datasource',
    SCHEMA_PATH,
    '--to-schema-datamodel',
    SCHEMA_PATH,
    '--exit-code',
  ]);

  if (res.error) {
    throw res.error;
  }

  if (res.status === 0) return true;
  if (res.status === 2) return false;

  // Unexpected failure: surface stderr for actionable debugging.
  throw new Error(`${res.cmd} failed: ${res.stderr || res.stdout}`.trim());
};

/**
 * Baseline a non-empty database that matches schema.prisma but is missing Prisma migration history.
 * This prevents Prisma P3005 during `prisma migrate deploy` on Render.
 *
 * Safety:
 * - Only runs when we can confirm DB schema matches schema.prisma (no diff)
 * - Otherwise we fail fast with clear instructions (don’t guess / don’t mutate history)
 */
const maybeBaselineExistingDatabase = async () => {
  let migrationsTableExists = false;
  let nonPrismaTableCount = 0;

  try {
    migrationsTableExists = getPrismaMigrationsTableExists();
    nonPrismaTableCount = getNonPrismaTableCount();
  } catch (e) {
    // If we can’t even query information_schema, Prisma migrations will fail anyway.
    throw new Error(`Could not inspect database schema: ${e.message}`);
  }

  if (migrationsTableExists) return;
  if (nonPrismaTableCount === 0) return; // empty DB, normal migrate deploy will work

  // Detect Render environment (Render typically sets multiple RENDER_* env vars)
  const isRenderEnv =
    Boolean(process.env.RENDER) || Object.keys(process.env).some((k) => k === 'RENDER' || k.startsWith('RENDER_'));
  const autoBaselineEnabled = isTruthy(process.env.PRISMA_AUTO_BASELINE) || isRenderEnv;

  warn(
    `⚠️  Detected non-empty database schema without Prisma migration history (_prisma_migrations missing). ` +
      `Prisma migrate deploy will fail with P3005 unless this database is baselined.`
  );

  if (!autoBaselineEnabled) {
    warn('ℹ️  Auto-baseline is disabled. To enable safe auto-baseline, set PRISMA_AUTO_BASELINE=true.');
    warn('   Alternatively, use a fresh empty database, or baseline manually:');
    warn(
      '   1) Confirm schema matches: npx prisma migrate diff --schema prisma/schema.prisma --from-schema-datasource --to-schema-datamodel prisma/schema.prisma --exit-code'
    );
    warn('   2) Mark migrations applied: npx prisma migrate resolve --applied <migration_name> (repeat for each migration)');
    return;
  }

  log('🔎 Verifying database schema matches prisma/schema.prisma before baselining...');
  const matches = dbMatchesPrismaSchema();

  if (!matches) {
    error(
      '❌ Database schema does NOT match prisma/schema.prisma, so auto-baseline is unsafe and will not run.'
    );
    error('   You are likely pointing at the wrong database, or it is out of date / drifted.');
    error('   Fix options:');
    error('   - Point DATABASE_URL at the correct environment DB');
    error('   - Use a fresh empty database and let Prisma apply migrations');
    error('   - Or manually reconcile schema drift, then baseline (see Prisma baseline docs: https://pris.ly/d/migrate-baseline)');
    throw new Error('Auto-baseline aborted due to schema drift.');
  }

  log('✅ Schema matches. Creating Prisma migration baseline by marking migrations as applied...');
  const migrations = getMigrationsOnDisk();
  for (const name of migrations) {
    try {
      await resolveMigration('applied', name);
    } catch (e) {
      // resolveMigration already logs warnings; treat as fatal here because baseline must be complete
      throw new Error(`Failed to baseline migration ${name}: ${e.message}`);
    }
  }
  log(`✅ Baseline complete (${migrations.length} migrations marked as applied).`);
};

const resolveMigration = async (status, migrationName) => {
  const flag = status === 'applied' ? '--applied' : '--rolled-back';
  try {
    runPrisma(['migrate', 'resolve', '--schema', SCHEMA_PATH, flag, migrationName], { silent: true });
    log(`✅ Marked migration ${migrationName} as ${status}.`);
    return true;
  } catch (e) {
    // Check if it's already in the desired state (P3008 for applied, P3012 for rolled-back not needed)
    const alreadyInState = e.message.includes('P3008') || e.message.includes('already recorded as applied');
    const cannotRollback = e.message.includes('P3012') || e.message.includes('cannot be rolled back');
    
    if (alreadyInState && status === 'applied') {
      log(`ℹ️  Migration ${migrationName} already marked as ${status}.`);
      return true;
    } else if (cannotRollback && status === 'rolled-back') {
      log(`ℹ️  Migration ${migrationName} not in failed state, skipping rollback.`);
      return false;
    } else {
      warn(`⚠️  Could not mark ${migrationName} as ${status}: ${e.message}`);
      return false;
    }
  }
};

/**
 * Force mark a failed migration as rolled-back by updating the tracking table directly.
 * This clears the failed state so prisma migrate deploy can run the migration fresh.
 */
const forceMarkMigrationRolledBack = (migrationName) => {
  const sql = `
UPDATE "_prisma_migrations" 
SET finished_at = NOW(),
    rolled_back_at = NOW()
WHERE migration_name = '${migrationName}' 
AND finished_at IS NULL;
`;
  
  try {
    log(`🔨 Force-marking migration ${migrationName} as rolled-back...`);
    runSql(sql);
    log(`✅ Marked migration ${migrationName} as rolled-back. Prisma will re-run it.`);
    return true;
  } catch (e) {
    warn(`⚠️  Could not force-mark migration ${migrationName}: ${e.message}`);
    return false;
  }
};

const ensureAssetMetadataColumn = () => {
  // Matches prisma migration `20251104140358_add_asset_metadata_field`, but safe to re-run.
  const sql = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assets'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE "assets" ADD COLUMN "metadata" JSONB;
  END IF;
END
$$;
`;

  log('Ensuring assets.metadata exists...');
  runSql(sql);
  log('✅ assets.metadata verified.');
};

const ensureAssetUrlConstraintFixed = () => {
  // Legacy hotfix: some production DBs may still have a NOT NULL "url" column that Prisma
  // no longer writes to. Make it nullable and sync data between url/publicUrl if needed.
  // Safe to re-run.
  const sql = `
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assets'
        AND column_name = 'url'
        AND table_schema = 'public'
    ) THEN
        -- Sync data to publicUrl if publicUrl is empty or null, but url has data
        UPDATE "assets"
        SET "publicUrl" = "url"
        WHERE ("publicUrl" IS NULL OR "publicUrl" = '') AND "url" IS NOT NULL AND "url" != '';

        -- Sync data from publicUrl to url if url is empty (keeps legacy readers consistent)
        UPDATE "assets"
        SET "url" = "publicUrl"
        WHERE ("url" IS NULL OR "url" = '') AND "publicUrl" IS NOT NULL AND "publicUrl" != '';

        -- Make url nullable to prevent insert errors from Prisma (which doesn't know about 'url')
        ALTER TABLE "assets" ALTER COLUMN "url" DROP NOT NULL;
    END IF;
END $$;
`;

  log('Ensuring legacy assets.url (if present) will not block inserts...');
  runSql(sql);
  log('✅ assets.url legacy constraint handled (or column absent).');
};

const ensureCategoriesColumns = () => {
  // Matches prisma migration `20251119100000_add_categories_array_fields`, but guarded.
  const sql = `
-- Add array columns if missing
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from legacy single-category columns only if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='category'
  ) THEN
    UPDATE "products"
    SET "categories" = ARRAY[category]
    WHERE "category" IS NOT NULL AND "category" != '' AND ("categories" IS NULL OR array_length("categories", 1) IS NULL OR array_length("categories", 1) = 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='services' AND column_name='category'
  ) THEN
    UPDATE "services"
    SET "categories" = ARRAY[category::text]
    WHERE "category" IS NOT NULL AND ("categories" IS NULL OR array_length("categories", 1) IS NULL OR array_length("categories", 1) = 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizations' AND column_name='productCategory'
  ) THEN
    UPDATE "organizations"
    SET "productCategories" = ARRAY["productCategory"]
    WHERE "productCategory" IS NOT NULL AND "productCategory" != '' AND ("productCategories" IS NULL OR array_length("productCategories", 1) IS NULL OR array_length("productCategories", 1) = 0);
  END IF;
END
$$;
`;

  log('Ensuring categories array columns exist + are backfilled...');
  runSql(sql);
  log('✅ Categories columns verified.');
};

/**
 * Ensure message file columns exist in messages table.
 * Matches migration `20251221000000_add_message_file_columns`.
 * CRITICAL: Fixes messaging "The column messages.fileUrl does not exist" error.
 */
const ensureMessageFileColumns = () => {
  const sql = `
-- Add fileUrl column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileUrl'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileUrl" TEXT;
    END IF;
END $$;

-- Add fileName column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileName'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileName" TEXT;
    END IF;
END $$;

-- Add fileSize column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileSize" BIGINT;
    END IF;
END $$;

-- Add mimeType column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'mimeType'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "mimeType" TEXT;
    END IF;
END $$;
`;

  log('Ensuring messages file columns exist (fileUrl, fileName, fileSize, mimeType)...');
  runSql(sql);
  log('✅ Messages file columns verified.');
};

/**
 * Ensure educator availability settings column exists in users table.
 * Matches migration `20251217100000_add_educator_availability_settings`.
 * This enables the Calendly-style scheduling feature for educators.
 */
const ensureEducatorAvailabilitySettings = () => {
  const sql = `
-- Add availabilitySettings JSONB column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'availabilitySettings'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "availabilitySettings" JSONB;
        
        -- Add a comment to document the field
        COMMENT ON COLUMN "public"."users"."availabilitySettings" IS 'Structured availability settings for educators (Calendly-style scheduling). Contains employmentType, weeklySchedule, dateOverrides, timezone, and notes.';
    END IF;
END $$;

-- Create index for querying by employment type (commonly used in searches)
CREATE INDEX IF NOT EXISTS "users_availability_employment_type_idx" 
ON "public"."users" ((("availabilitySettings"->>'employmentType')));
`;

  log('Ensuring users.availabilitySettings exists (educator scheduling)...');
  runSql(sql);
  log('✅ Educator availability settings column verified.');
};

/**
 * Ensure subscription management system schema exists.
 * Matches migration `20251218000000_subscription_management_system`.
 * Adds new subscription statuses, audit logging, scheduling, and enhanced fields.
 * 
 * CRITICAL: This ensures base tables exist (from init migration) before adding enhancements.
 * If base tables are missing, they will be created. This is proper recovery, not masking errors.
 */
const ensureSubscriptionManagementSystem = () => {
  const sql = `
-- Ensure base enums exist (required for subscriptions table)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
        CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');
    END IF;
END $$;

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
-- Use snake_case column names to match Prisma schema @map directives
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "features" TEXT[],
    "limits" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "stripe_price_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- Fix column names from camelCase to snake_case for existing databases
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'billingPeriod') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "billingPeriod" TO "billing_period";
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'isActive') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "isActive" TO "is_active";
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'isPopular') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "isPopular" TO "is_popular";
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'stripePriceId') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "stripePriceId" TO "stripe_price_id";
    END IF;
END$$;

-- Add new enum values to SubscriptionStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAUSED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPIRED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRIAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GRACE_PERIOD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE_PERIOD';
    END IF;
END$$;

-- Add new columns to subscriptions table
ALTER TABLE "subscriptions" 
    ADD COLUMN IF NOT EXISTS "trial_start" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "trial_end" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "paused_until" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "is_manual" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "activated_by" TEXT,
    ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "grace_period_end" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "notes" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add new columns to subscription_plans table
ALTER TABLE "subscription_plans" 
    ADD COLUMN IF NOT EXISTS "code" TEXT,
    ADD COLUMN IF NOT EXISTS "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "stripe_product_id" TEXT;

-- Create unique index on subscription_plans code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code") WHERE "code" IS NOT NULL;

-- Create SubscriptionAction table for audit logging
CREATE TABLE IF NOT EXISTS "subscription_actions" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    
    CONSTRAINT "subscription_actions_pkey" PRIMARY KEY ("id")
);

-- Create SubscriptionSchedule table for scheduled actions
CREATE TABLE IF NOT EXISTS "subscription_schedules" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "scheduled_action" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "target_plan_id" TEXT,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "subscription_schedules_pkey" PRIMARY KEY ("id")
);

-- Create SubscriptionNote table for admin notes
CREATE TABLE IF NOT EXISTS "subscription_notes" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "subscription_notes_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints (safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscription_actions_subscription_id_fkey'
        AND table_name = 'subscription_actions'
    ) THEN
        ALTER TABLE "subscription_actions" 
            ADD CONSTRAINT "subscription_actions_subscription_id_fkey" 
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscription_schedules_subscription_id_fkey'
        AND table_name = 'subscription_schedules'
    ) THEN
        ALTER TABLE "subscription_schedules" 
            ADD CONSTRAINT "subscription_schedules_subscription_id_fkey" 
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscription_notes_subscription_id_fkey'
        AND table_name = 'subscription_notes'
    ) THEN
        ALTER TABLE "subscription_notes" 
            ADD CONSTRAINT "subscription_notes_subscription_id_fkey" 
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "subscription_actions_subscription_id_idx" ON "subscription_actions"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_actions_performed_at_idx" ON "subscription_actions"("performed_at");
CREATE INDEX IF NOT EXISTS "subscription_schedules_scheduled_date_is_processed_idx" ON "subscription_schedules"("scheduled_date", "is_processed");
CREATE INDEX IF NOT EXISTS "subscription_notes_subscription_id_idx" ON "subscription_notes"("subscription_id");

-- Add indexes to subscriptions table for new queries
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");
CREATE INDEX IF NOT EXISTS "subscriptions_is_manual_idx" ON "subscriptions"("is_manual");
`;

  log('Ensuring subscription management system schema exists...');
  runSql(sql);
  log('✅ Subscription management system schema verified.');
};

/**
 * Ensure foundation subscription tier schema exists (PricingTier scoping).
 * Matches migration `20251221000002_foundation_subscription_tiers`.
 */
const ensureFoundationSubscriptionTiers = () => {
  const sql = `
-- Ensure pricing_tiers table exists (from init migration)
CREATE TABLE IF NOT EXISTS "pricing_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "discounts" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- Ensure base enum exists (defensive for early bootstrap)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM (
          'SUPER_ADMIN',
          'ADMIN',
          'FOUNDATION',
          'PRODUCT_SUPPLIER',
          'SERVICE_PROVIDER',
          'EDUCATOR',
          'PARENT'
        );
    END IF;
END $$;

-- Ensure columns for scoping exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_tiers' AND column_name = 'role') THEN
        ALTER TABLE "public"."pricing_tiers" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'FOUNDATION';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_tiers' AND column_name = 'subscription_tier') THEN
        ALTER TABLE "public"."pricing_tiers" ADD COLUMN "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'BASIC';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_tiers' AND column_name = 'display_order') THEN
        ALTER TABLE "public"."pricing_tiers" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS "pricing_tiers_role_idx" ON "public"."pricing_tiers" ("role");
CREATE INDEX IF NOT EXISTS "pricing_tiers_subscription_tier_idx" ON "public"."pricing_tiers" ("subscription_tier");
CREATE INDEX IF NOT EXISTS "pricing_tiers_role_subscription_tier_idx" ON "public"."pricing_tiers" ("role", "subscription_tier");

-- Ensure uniqueness constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pricing_tiers_role_subscription_tier_billing_period_key'
  ) THEN
    ALTER TABLE "public"."pricing_tiers"
      ADD CONSTRAINT "pricing_tiers_role_subscription_tier_billing_period_key"
      UNIQUE ("role", "subscription_tier", "billingPeriod");
  END IF;
END $$;

-- Seed default Foundation tiers if missing
INSERT INTO "public"."pricing_tiers" (
  "id",
  "role",
  "subscription_tier",
  "name",
  "basePrice",
  "currency",
  "billingPeriod",
  "discounts",
  "isActive",
  "display_order",
  "createdAt",
  "updatedAt"
)
SELECT
  v.id,
  'FOUNDATION'::"public"."UserRole",
  v.subscription_tier::"public"."SubscriptionTier",
  v.name,
  v.base_price,
  'CHF',
  'monthly',
  jsonb_build_object('yearlyDiscount', 0, 'volumeDiscounts', '[]'::jsonb),
  TRUE,
  v.display_order,
  NOW(),
  NOW()
FROM (
  VALUES
    ('2c31bb25-8b79-4d2a-8cda-0ab2d2621158', 'BASIC', 'Foundation - Basic', 0.0, 10),
    ('c7fc6d30-cbb5-4b13-9d24-4c8c50b1246e', 'ESSENTIAL', 'Foundation - Essential', 0.0, 20),
    ('70c3aa20-f9bd-44b8-8624-4313f3b70423', 'PROFESSIONAL', 'Foundation - Professional', 0.0, 30),
    ('d9c81d07-9774-4b8b-93a4-7c78b02b0b3e', 'ENTERPRISE', 'Foundation - Enterprise', 0.0, 40)
) AS v(id, subscription_tier, name, base_price, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM "public"."pricing_tiers" pt
  WHERE pt."role" = 'FOUNDATION'::"public"."UserRole"
    AND pt."subscription_tier" = v.subscription_tier::"public"."SubscriptionTier"
    AND pt."billingPeriod" = 'monthly'
);
`;

  log('Ensuring foundation subscription tiers schema exists...');
  runSql(sql);
  log('✅ Foundation subscription tiers schema verified.');
};

/**
 * Ensure job contract type enum has new values.
 * Matches migration `20251219000000_add_job_contract_types`.
 * Adds REPLACEMENT, TEMPORARY, FREELANCE to JobContractType enum.
 */
const ensureJobContractTypes = () => {
  const sql = `
-- Add new enum values to JobContractType
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobContractType') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REPLACEMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobContractType')) THEN
            ALTER TYPE "JobContractType" ADD VALUE 'REPLACEMENT';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TEMPORARY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobContractType')) THEN
            ALTER TYPE "JobContractType" ADD VALUE 'TEMPORARY';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FREELANCE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobContractType')) THEN
            ALTER TYPE "JobContractType" ADD VALUE 'FREELANCE';
        END IF;
    END IF;
END$$;
`;

  log('Ensuring JobContractType enum has new values (REPLACEMENT, TEMPORARY, FREELANCE)...');
  runSql(sql);
  log('✅ Job contract types verified.');
};

/**
 * Ensure email grace period setting exists in system_settings.
 * Matches migration `20251221000002_add_email_grace_period_setting`.
 *
 * Strategy:
 * - Ensure the base table exists (defensive for drifted prod DBs)
 * - Insert the setting only if missing
 * - Uses an extension-free TEXT id generator (md5) to avoid pgcrypto dependency
 */
const ensureEmailGracePeriodSetting = () => {
  const sql = `
-- Ensure system_settings table exists (from init migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_settings'
  ) THEN
    CREATE TABLE "public"."system_settings" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "value" JSONB NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
      "isPublic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "public"."system_settings"("key");
  END IF;
END $$;

-- Seed email grace period setting if missing
INSERT INTO "public"."system_settings" (
  "id",
  "key",
  "value",
  "description",
  "category",
  "isEncrypted",
  "isPublic",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  'email.grace_period_days',
  to_jsonb(7),
  'Number of days to keep old email addresses before automatic deletion after an email change. This grace period allows users to recover access if needed.',
  'email',
  false,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."system_settings" WHERE "key" = 'email.grace_period_days'
);
`;

  log('Ensuring email grace period system setting exists (email.grace_period_days)...');
  runSql(sql);
  log('✅ Email grace period setting verified.');
};

/**
 * Ensure all translation infrastructure tables exist.
 * Matches migration `20251114140526_add_i18n_translation_tables`.
 * CRITICAL: Fixes admin translation page 500 error when static_translations table is missing.
 */
const ensureTranslationInfrastructure = () => {
  const sql = `
-- Ensure TranslationStatus enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TranslationStatus') THEN
        CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');
    END IF;
END $$;

-- Create entity_translations table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'entity_translations'
    ) THEN
        CREATE TABLE "entity_translations" (
            "entityType" TEXT NOT NULL,
            "entityId" TEXT NOT NULL,
            "lang" TEXT NOT NULL,
            "field" TEXT NOT NULL,
            "text" TEXT NOT NULL,
            "origin" TEXT NOT NULL DEFAULT 'machine',
            "verified" BOOLEAN NOT NULL DEFAULT false,
            "sourceHash" TEXT NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "approvedAt" TIMESTAMP(3),
            "approvedBy" TEXT,
            "mtProvider" TEXT,
            "reviewedAt" TIMESTAMP(3),
            "reviewedBy" TEXT,
            "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
            "translatedAt" TIMESTAMP(3),
            CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("entityType","entityId","lang","field")
        );
    END IF;
END $$;

-- Add columns if missing (for existing tables)
ALTER TABLE "entity_translations"
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "mtProvider" TEXT,
    ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "translatedAt" TIMESTAMP(3);

-- Create entity_sources table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'entity_sources'
    ) THEN
        CREATE TABLE "entity_sources" (
            "entityType" TEXT NOT NULL,
            "entityId" TEXT NOT NULL,
            "sourceLang" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "entity_sources_pkey" PRIMARY KEY ("entityType","entityId")
        );
    END IF;
END $$;

-- Create static_translations table (CRITICAL for admin translation page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'static_translations'
    ) THEN
        CREATE TABLE "static_translations" (
            "namespace" TEXT NOT NULL,
            "key" TEXT NOT NULL,
            "lang" TEXT NOT NULL,
            "value" TEXT NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "needsReview" BOOLEAN NOT NULL DEFAULT false,
            "reviewedBy" TEXT,
            "reviewedAt" TIMESTAMP(3),
            CONSTRAINT "static_translations_pkey" PRIMARY KEY ("namespace","key","lang")
        );
    END IF;
END $$;

-- Create translation_memory table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'translation_memory'
    ) THEN
        CREATE TABLE "translation_memory" (
            "id" TEXT NOT NULL,
            "sourceTextHash" TEXT NOT NULL,
            "sourceLang" TEXT NOT NULL,
            "targetLang" TEXT NOT NULL,
            "translatedText" TEXT NOT NULL,
            "mtProvider" TEXT NOT NULL,
            "usageCount" INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "translation_memory_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- Create translation_releases table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'translation_releases'
    ) THEN
        CREATE TABLE "translation_releases" (
            "id" TEXT NOT NULL,
            "version" TEXT NOT NULL,
            "description" TEXT,
            "createdBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "isActive" BOOLEAN NOT NULL DEFAULT false,
            CONSTRAINT "translation_releases_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- Create translation_audit_logs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'translation_audit_logs'
    ) THEN
        CREATE TABLE "translation_audit_logs" (
            "id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "namespace" TEXT,
            "entityType" TEXT,
            "entityId" TEXT,
            "key" TEXT,
            "field" TEXT,
            "lang" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "oldValue" TEXT,
            "newValue" TEXT,
            "userId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "translation_audit_logs_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- Create mt_cost_tracking table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'mt_cost_tracking'
    ) THEN
        CREATE TABLE "mt_cost_tracking" (
            "id" TEXT NOT NULL,
            "date" DATE NOT NULL,
            "provider" TEXT NOT NULL,
            "sourceLang" TEXT NOT NULL,
            "targetLang" TEXT NOT NULL,
            "characters" INTEGER NOT NULL,
            "cost" DECIMAL(10,4) NOT NULL,
            "jobCount" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "mt_cost_tracking_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- Create all indexes (outside IF blocks so they're created even if table already existed)
CREATE INDEX IF NOT EXISTS "entity_translations_entityType_lang_idx" ON "entity_translations"("entityType", "lang");
CREATE INDEX IF NOT EXISTS "entity_translations_status_updatedAt_idx" ON "entity_translations"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "static_translations_namespace_lang_idx" ON "static_translations"("namespace", "lang");
CREATE INDEX IF NOT EXISTS "static_translations_key_idx" ON "static_translations"("key");
CREATE INDEX IF NOT EXISTS "translation_memory_sourceLang_targetLang_idx" ON "translation_memory"("sourceLang", "targetLang");
CREATE UNIQUE INDEX IF NOT EXISTS "translation_memory_sourceTextHash_sourceLang_targetLang_key" ON "translation_memory"("sourceTextHash", "sourceLang", "targetLang");
CREATE UNIQUE INDEX IF NOT EXISTS "translation_releases_version_key" ON "translation_releases"("version");
CREATE INDEX IF NOT EXISTS "translation_releases_isActive_createdAt_idx" ON "translation_releases"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "translation_audit_logs_type_createdAt_idx" ON "translation_audit_logs"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "translation_audit_logs_userId_createdAt_idx" ON "translation_audit_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "mt_cost_tracking_date_provider_idx" ON "mt_cost_tracking"("date", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "mt_cost_tracking_date_provider_sourceLang_targetLang_key" ON "mt_cost_tracking"("date", "provider", "sourceLang", "targetLang");
`;

  log('Ensuring translation infrastructure tables exist...');
  runSql(sql);
  log('✅ Translation infrastructure verified.');
};

/**
 * CRITICAL: Clear ALL failed migrations from the database FIRST.
 * This is the most important recovery step - failed migrations (P3009) block everything.
 * We use direct SQL to avoid Prisma CLI version/argument issues.
 */
const clearAllFailedMigrationsDirect = () => {
  // First check if table exists
  try {
    runSql(`SELECT 1 FROM "_prisma_migrations" LIMIT 1;`);
  } catch (e) {
    // Table doesn't exist - fresh database, nothing to clear
    log('ℹ️  No _prisma_migrations table yet (fresh database).');
    return { tableExists: false, clearedCount: 0 };
  }

  // Get list of failed migrations before clearing (for logging)
  let failedNames = [];
  try {
    const listSql = `
SELECT "migration_name" FROM "_prisma_migrations"
WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL;
`;
    const out = runSql(listSql);
    failedNames = extractMigrationNames(out);
  } catch (e) {
    // Ignore - we'll try to clear anyway
  }

  if (failedNames.length > 0) {
    log(`⚠️  Found ${failedNames.length} FAILED migration(s): ${failedNames.join(', ')}`);
  }

  // Clear all failed migrations by marking them as rolled back
  const clearSql = `
UPDATE "_prisma_migrations"
SET 
  "finished_at" = NOW(),
  "rolled_back_at" = NOW()
WHERE "finished_at" IS NULL 
  AND "rolled_back_at" IS NULL;
`;
  try {
    runSql(clearSql);
    if (failedNames.length > 0) {
      log(`✅ Cleared ${failedNames.length} failed migration(s). Prisma will re-run them.`);
    }
    return { tableExists: true, clearedCount: failedNames.length };
  } catch (e) {
    warn(`⚠️  Could not clear failed migrations via SQL: ${e.message}`);
    // Try individual force-clear as fallback
    let cleared = 0;
    for (const name of failedNames) {
      if (forceMarkMigrationRolledBack(name)) {
        cleared++;
      }
    }
    return { tableExists: true, clearedCount: cleared };
  }
};

const main = async () => {
  log(`Using schema: ${SCHEMA_PATH}`);
  log(`Using Prisma CLI: ${PRISMA_BIN ? PRISMA_BIN : 'npx prisma (fallback)'}`);

  // ============================================================
  // CRITICAL FIRST STEP: Clear all failed migrations immediately
  // ============================================================
  // This MUST happen before any other logic because P3009 blocks everything.
  // Failed migrations from previous deploys will block all new migrations.
  log('');
  log('🔧 CRITICAL: Checking for and clearing any failed migrations...');
  const clearResult = clearAllFailedMigrationsDirect();
  
  // Verify no failed migrations remain
  if (clearResult.tableExists) {
    try {
      const checkSql = `
SELECT "migration_name" FROM "_prisma_migrations"
WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL;
`;
      const out = runSql(checkSql);
      const remaining = extractMigrationNames(out);
      if (remaining.length > 0) {
        warn(`⚠️  ${remaining.length} migration(s) still failed: ${remaining.join(', ')}`);
        // Last resort: try forceMarkMigrationRolledBack for each
        for (const name of remaining) {
          forceMarkMigrationRolledBack(name);
        }
      } else if (clearResult.clearedCount > 0) {
        log('✅ All failed migrations successfully cleared.');
      } else {
        log('✅ No failed migrations to clear.');
      }
    } catch (e) {
      // Ignore verification errors
    }
  }
  log('');

  // ============================================================
  // STEP 2: Database state inspection
  // ============================================================
  log('🔍 Inspecting database state...');
  let migrationsTableExists = clearResult.tableExists;
  let nonPrismaTableCount = 0;
  try {
    migrationsTableExists = getPrismaMigrationsTableExists();
    nonPrismaTableCount = getNonPrismaTableCount();
  } catch (e) {
    // If we can’t inspect the DB, migrations will fail anyway. Surface a clear error.
    throw new Error(`Could not inspect database schema: ${e.message}`);
  }

  log(
    `Database inspection: _prisma_migrations=${migrationsTableExists ? 'present' : 'missing'}, ` +
      `nonPrismaTables=${nonPrismaTableCount}`
  );

  // CRITICAL FIX: Even if we think the migrations table is missing, do a secondary check
  // for failed migrations. The primary detection can have false negatives due to Prisma
  // output formatting changes.
  if (!migrationsTableExists) {
    const hasFailedMigrations = hasFailedMigrationsDirectCheck();
    if (hasFailedMigrations) {
      log('⚠️  Secondary check found failed migrations! Correcting detection...');
      migrationsTableExists = true;
    }
  }

  if (!migrationsTableExists) {
    if (nonPrismaTableCount === 0) {
      // Final safety check: try one more direct query to confirm no failed migrations
      // This catches edge cases where Prisma output parsing fails
      const finalCheck = hasFailedMigrationsDirectCheck();
      if (finalCheck) {
        log('⚠️  Final check detected failed migrations. Proceeding with recovery...');
        migrationsTableExists = true;
      } else {
        log(
          'Empty database detected (no tables, no Prisma migration history). ' +
            'Skipping prebuild recovery steps so `prisma migrate deploy` can bootstrap the schema.'
        );
        log('Done.');
        return;
      }
    }

    // Non-empty schema but no Prisma migration history: Prisma will throw P3005.
    // Do NOT attempt to "help" by creating more tables here; that only increases drift.
    // Instead, attempt safe baseline (only if the schema matches) and otherwise fail fast
    // with actionable instructions.
    await maybeBaselineExistingDatabase();

    // Re-check: if we still don't have a migrations table, stop here.
    migrationsTableExists = getPrismaMigrationsTableExists();
    if (!migrationsTableExists) {
      error(
        '❌ Database has tables but no `_prisma_migrations` history table. ' +
          '`prisma migrate deploy` will fail with P3005 until this DB is reset or baselined.'
      );
      error('   Dev fix: use a fresh empty database (recommended) or wipe/reset this database.');
      error('   Prisma baseline docs: https://pris.ly/d/migrate-baseline');
      throw new Error('Database is not managed by Prisma Migrate (P3005 precondition).');
    }
  }

  // ------------------------------------------------------------
  // Migration history inspection
  // ------------------------------------------------------------
  let appliedMigrations = new Set();
  let failedMigrations = new Set();
  try {
    appliedMigrations = new Set(getAppliedMigrationNamesFromDb());
    failedMigrations = new Set(getFailedMigrationNamesFromDb());
  } catch (e) {
    warn(`⚠️  Could not read _prisma_migrations status: ${e.message}`);
  }

  const isRenderEnv =
    Boolean(process.env.RENDER) || Object.keys(process.env).some((k) => k === 'RENDER' || k.startsWith('RENDER_'));
  const autoReconcileEnabled = isTruthy(process.env.PRISMA_AUTO_RECONCILE) || isRenderEnv;

  // If the DB already matches schema.prisma exactly, but migration history is drifted
  // (missing entries / failed entries), we can safely reconcile by marking all migrations applied.
  // This unblocks Render deploys without requiring terminal access.
  if (autoReconcileEnabled) {
    try {
      const matches = dbMatchesPrismaSchema();
      if (matches) {
        log('✅ Database matches schema.prisma. Reconciling migration history (marking all migrations applied)...');
        const allMigrations = getMigrationsOnDisk();
        for (const name of allMigrations) {
          try {
            await resolveMigration('applied', name);
          } catch (e) {
            // If resolve fails for an existing failed record, attempt a direct update.
            // (We cannot safely INSERT a new record without Prisma because checksum is required.)
            if (String(e?.message || '').includes('P3019') || String(e?.message || '').includes('P3009')) {
              forceMarkMigrationApplied(name);
            }
          }
        }
        log(`✅ Reconciled migration history (${allMigrations.length} migrations).`);
        log('Done.');
        return;
      }
    } catch (e) {
      warn(`⚠️  Auto-reconcile skipped (could not diff schema): ${e.message}`);
    }
  }

  // Known migration handlers (documented in api/scripts/README-MIGRATION-RECOVERY.md)
  // For already-applied migrations, just ensure schema exists (idempotent safety net)
  try {
    ensureAssetUrlConstraintFixed();
    ensureAssetMetadataColumn();
  } catch (e) {
    warn(`⚠️  asset schema verification failed: ${e.message}`);
  }

  try {
    ensureCategoriesColumns();
  } catch (e) {
    warn(`⚠️  categories schema verification failed: ${e.message}`);
  }

  // IMPORTANT:
  // Do NOT pre-create translation tables unless the migration is already applied (or failed).
  // The migration SQL contains CREATE TABLE statements without IF NOT EXISTS and will fail
  // if these tables already exist.
  const I18N_MIGRATION = '20251114140526_add_i18n_translation_tables';
  if (failedMigrations.has(I18N_MIGRATION)) {
    try {
      log(`🔧 Detected FAILED migration ${I18N_MIGRATION}. Repairing translation infra + marking applied...`);
      ensureTranslationInfrastructure();
      let ok = await resolveMigration('applied', I18N_MIGRATION);
      if (!ok) {
        ok = forceMarkMigrationApplied(I18N_MIGRATION);
      }
      if (!ok) {
        warn(`⚠️  Could not mark ${I18N_MIGRATION} as applied (migration may remain blocked).`);
      }
    } catch (e) {
      warn(`⚠️  translation infrastructure repair failed: ${e.message}`);
    }
  } else if (appliedMigrations.has(I18N_MIGRATION)) {
    try {
      ensureTranslationInfrastructure();
    } catch (e) {
      warn(`⚠️  translation infrastructure verification failed: ${e.message}`);
    }
  } else {
    log(`ℹ️  ${I18N_MIGRATION} not applied yet; skipping translation infra pre-creation (Prisma will create it).`);
  }

  // Fix for Render/prod: failed migration can block all subsequent deploys until resolved.
  // `20251106001000_user_email_nullable` historically failed due to a regclass lookup using an
  // unquoted identifier for the legacy "AppUser" table. If this migration is FAILED, clear its
  // state so Prisma can retry it (the migration SQL is now safe).
  const USER_EMAIL_NULLABLE = '20251106001000_user_email_nullable';
  if (failedMigrations.has(USER_EMAIL_NULLABLE)) {
    try {
      log(`🔧 Detected FAILED migration ${USER_EMAIL_NULLABLE}. Clearing failed state so Prisma can retry...`);
      let cleared = await resolveMigration('rolled-back', USER_EMAIL_NULLABLE);
      if (!cleared) {
        log('⚠️  Standard resolve failed, force-marking as rolled-back...');
        cleared = forceMarkMigrationRolledBack(USER_EMAIL_NULLABLE);
      }
      if (!cleared) {
        warn(`⚠️  Could not clear failed state for ${USER_EMAIL_NULLABLE} (deploy may remain blocked).`);
      }
    } catch (e) {
      warn(`⚠️  Could not clear failed state for ${USER_EMAIL_NULLABLE}: ${e.message}`);
    }
  }

  try {
    ensureMessageFileColumns();
  } catch (e) {
    warn(`⚠️  message file columns verification failed: ${e.message}`);
  }

  try {
    ensureEducatorAvailabilitySettings();
  } catch (e) {
    warn(`⚠️  educator availability settings verification failed: ${e.message}`);
  }

  // Subscription management system (enhanced subscription features)
  // Strategy: 
  // 1. Clear failed state (mark as rolled-back)
  // 2. Ensure schema exists (so migration won't fail when Prisma runs it)
  // 3. Let `prisma migrate deploy` run the migration normally and mark it applied
  try {
    log('🔧 Preparing for subscription management system migration...');
    
    // Step 1: Clear failed state - try standard command first
    let cleared = await resolveMigration('rolled-back', '20251218000000_subscription_management_system');
    
    // If standard command doesn't work, force-update the tracking table
    if (!cleared) {
      log('⚠️  Standard resolve failed, force-marking as rolled-back...');
      cleared = forceMarkMigrationRolledBack('20251218000000_subscription_management_system');
    }
    
    if (cleared) {
      log('✅ Migration cleared from failed state. Prisma will re-run it.');
    }
    
    // Step 2: Ensure schema exists so migration will succeed when Prisma runs it
    ensureSubscriptionManagementSystem();
    log('✅ Database schema prepared for migration.');
    log('📋 Prisma migrate deploy will now run this migration and mark it complete.');
    
  } catch (e) {
    warn(`⚠️  Subscription management system preparation failed: ${e.message}`);
    // Try force rollback anyway
    try {
      forceMarkMigrationRolledBack('20251218000000_subscription_management_system');
      ensureSubscriptionManagementSystem();
    } catch (e2) {
      error(`❌ Could not prepare for migration: ${e2.message}`);
    }
  }

  // Foundation subscription tiers (PricingTier scoping + seed)
  try {
    log('🔧 Preparing for foundation subscription tiers migration...');
    let cleared = await resolveMigration('rolled-back', '20251221000002_foundation_subscription_tiers');
    if (!cleared) {
      log('⚠️  Standard resolve failed, force-marking as rolled-back...');
      cleared = forceMarkMigrationRolledBack('20251221000002_foundation_subscription_tiers');
    }
    if (cleared) {
      log('✅ Migration cleared from failed state. Prisma will re-run it.');
    }
    ensureFoundationSubscriptionTiers();
    log('✅ Database schema prepared for migration.');
    log('📋 Prisma migrate deploy will now run this migration and mark it complete.');
  } catch (e) {
    warn(`⚠️  Foundation subscription tiers preparation failed: ${e.message}`);
    try {
      forceMarkMigrationRolledBack('20251221000002_foundation_subscription_tiers');
      ensureFoundationSubscriptionTiers();
    } catch (e2) {
      error(`❌ Could not prepare for migration: ${e2.message}`);
    }
  }

  // Job contract types (adds REPLACEMENT, TEMPORARY, FREELANCE enum values)
  try {
    log('🔧 Preparing for job contract types migration...');
    ensureJobContractTypes();
    log('✅ Job contract types schema prepared.');
  } catch (e) {
    warn(`⚠️  job contract types preparation failed: ${e.message}`);
  }

  // Email grace period setting (admin-configurable email change grace window)
  // Strategy:
  // 1. Clear failed migration state (mark as rolled-back) so Prisma can re-run it
  // 2. Ensure the table + setting exist so the migration will not fail
  try {
    log('🔧 Preparing for email grace period setting migration...');

    let cleared = await resolveMigration('rolled-back', '20251221000002_add_email_grace_period_setting');
    if (!cleared) {
      log('⚠️  Standard resolve failed, force-marking as rolled-back...');
      cleared = forceMarkMigrationRolledBack('20251221000002_add_email_grace_period_setting');
    }
    if (cleared) {
      log('✅ Migration cleared from failed state. Prisma will re-run it.');
    }

    ensureEmailGracePeriodSetting();
    log('✅ Email grace period schema prepared.');
    log('📋 Prisma migrate deploy will now run this migration and mark it complete.');
  } catch (e) {
    warn(`⚠️  Email grace period setting preparation failed: ${e.message}`);
    try {
      forceMarkMigrationRolledBack('20251221000002_add_email_grace_period_setting');
      ensureEmailGracePeriodSetting();
    } catch (e2) {
      error(`❌ Could not prepare for migration: ${e2.message}`);
    }
  }

  log('Done.');
};

main().catch((e) => {
  error(e?.stack || e?.message || String(e));
  process.exit(1);
});

