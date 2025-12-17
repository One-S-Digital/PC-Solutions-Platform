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
        ALTER TABLE "public"."messages" ADD COLUMN "fileSize" INTEGER;
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
    await resolveMigration('rolled-back', '20251221000000_add_message_file_columns');
    await resolveMigration('applied', '20251221000000_add_message_file_columns');
  } catch (e) {
    warn(`⚠️  message file columns handler failed: ${e.message}`);
  }

  log('Done.');
};

main().catch((e) => {
  error(e?.stack || e?.message || String(e));
  process.exit(1);
});

