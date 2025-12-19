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

const runSql = (sql) =>
  runPrisma(['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'], {
    silent: true,
    input: sql,
  });

const resolveMigration = async (status, migrationName) => {
  const flag = status === 'applied' ? '--applied' : '--rolled-back';
  try {
    runPrisma(['migrate', 'resolve', '--schema', SCHEMA_PATH, flag, migrationName], { silent: true });
    log(`✅ Marked migration ${migrationName} as ${status}.`);
  } catch (e) {
    // It's fine if it is already in the desired state; Prisma may error depending on state.
    warn(`ℹ️  Could not mark ${migrationName} as ${status}: ${e.message}`);
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
 */
const ensureSubscriptionManagementSystem = () => {
  const sql = `
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

-- Add new columns to subscriptions table (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
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
    END IF;
END$$;

-- Add new columns to subscription_plans table (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscription_plans'
    ) THEN
        ALTER TABLE "subscription_plans" 
            ADD COLUMN IF NOT EXISTS "code" TEXT,
            ADD COLUMN IF NOT EXISTS "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
            ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "stripe_product_id" TEXT;
    END IF;
END$$;

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

-- Add foreign key constraints (safely - only if both source and target tables exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscription_actions'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_actions_subscription_id_fkey'
            AND table_name = 'subscription_actions'
        ) THEN
            ALTER TABLE "subscription_actions" 
                ADD CONSTRAINT "subscription_actions_subscription_id_fkey" 
                FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscription_schedules'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_schedules_subscription_id_fkey'
            AND table_name = 'subscription_schedules'
        ) THEN
            ALTER TABLE "subscription_schedules" 
                ADD CONSTRAINT "subscription_schedules_subscription_id_fkey" 
                FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscription_notes'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_notes_subscription_id_fkey'
            AND table_name = 'subscription_notes'
        ) THEN
            ALTER TABLE "subscription_notes" 
                ADD CONSTRAINT "subscription_notes_subscription_id_fkey" 
                FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END$$;

-- Create indexes for performance (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_actions') THEN
        CREATE INDEX IF NOT EXISTS "subscription_actions_subscription_id_idx" ON "subscription_actions"("subscription_id");
        CREATE INDEX IF NOT EXISTS "subscription_actions_performed_at_idx" ON "subscription_actions"("performed_at");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_schedules') THEN
        CREATE INDEX IF NOT EXISTS "subscription_schedules_scheduled_date_is_processed_idx" ON "subscription_schedules"("scheduled_date", "is_processed");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_notes') THEN
        CREATE INDEX IF NOT EXISTS "subscription_notes_subscription_id_idx" ON "subscription_notes"("subscription_id");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
        CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");
        CREATE INDEX IF NOT EXISTS "subscriptions_is_manual_idx" ON "subscriptions"("is_manual");
    END IF;
END$$;
`;

  log('Ensuring subscription management system schema exists...');
  runSql(sql);
  log('✅ Subscription management system schema verified.');
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

const main = async () => {
  log(`Using schema: ${SCHEMA_PATH}`);
  log(`Using Prisma CLI: ${PRISMA_BIN ? PRISMA_BIN : 'npx prisma (fallback)'}`);

  // Known migration handlers (documented in api/scripts/README-MIGRATION-RECOVERY.md)
  try {
    ensureAssetUrlConstraintFixed();
    ensureAssetMetadataColumn();
    // If the migration previously failed, clearing it first makes "applied" resolve more reliable.
    await resolveMigration('rolled-back', '20251104140358_add_asset_metadata_field');
    await resolveMigration('applied', '20251104140358_add_asset_metadata_field');
  } catch (e) {
    warn(`⚠️  asset schema/legacy handler failed: ${e.message}`);
  }

  try {
    ensureCategoriesColumns();
    await resolveMigration('rolled-back', '20251119100000_add_categories_array_fields');
    await resolveMigration('applied', '20251119100000_add_categories_array_fields');
  } catch (e) {
    warn(`⚠️  categories handler failed: ${e.message}`);
  }

  // Translation infrastructure (fixes admin translation page 500 error)
  try {
    ensureTranslationInfrastructure();
    await resolveMigration('rolled-back', '20251114140526_add_i18n_translation_tables');
    await resolveMigration('applied', '20251114140526_add_i18n_translation_tables');
  } catch (e) {
    warn(`⚠️  translation infrastructure handler failed: ${e.message}`);
  }

  // Message file columns (fixes messaging "fileUrl does not exist" error)
  try {
    ensureMessageFileColumns();
    await resolveMigration('rolled-back', '20251217000000_add_message_file_columns');
    await resolveMigration('applied', '20251217000000_add_message_file_columns');
  } catch (e) {
    warn(`⚠️  message file columns handler failed: ${e.message}`);
  }

  // Educator availability settings (Calendly-style scheduling for replacement staff)
  try {
    ensureEducatorAvailabilitySettings();
    await resolveMigration('rolled-back', '20251217100000_add_educator_availability_settings');
    await resolveMigration('applied', '20251217100000_add_educator_availability_settings');
  } catch (e) {
    warn(`⚠️  educator availability settings handler failed: ${e.message}`);
  }

  // Subscription management system (enhanced subscription features)
  try {
    ensureSubscriptionManagementSystem();
    await resolveMigration('rolled-back', '20251218000000_subscription_management_system');
    await resolveMigration('applied', '20251218000000_subscription_management_system');
  } catch (e) {
    warn(`⚠️  subscription management system handler failed: ${e.message}`);
  }

  // Job contract types (adds REPLACEMENT, TEMPORARY, FREELANCE enum values)
  try {
    ensureJobContractTypes();
    await resolveMigration('rolled-back', '20251219000000_add_job_contract_types');
    await resolveMigration('applied', '20251219000000_add_job_contract_types');
  } catch (e) {
    warn(`⚠️  job contract types handler failed: ${e.message}`);
  }

  log('Done.');
};

main().catch((e) => {
  error(e?.stack || e?.message || String(e));
  process.exit(1);
});

