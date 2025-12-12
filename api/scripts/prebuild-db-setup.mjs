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

const main = async () => {
  log(`Using schema: ${SCHEMA_PATH}`);
  log(`Using Prisma CLI: ${PRISMA_BIN ? PRISMA_BIN : 'npx prisma (fallback)'}`);

  // Known migration handlers (documented in api/scripts/README-MIGRATION-RECOVERY.md)
  try {
    ensureAssetMetadataColumn();
    // If the migration previously failed, clearing it first makes "applied" resolve more reliable.
    await resolveMigration('rolled-back', '20251104140358_add_asset_metadata_field');
    await resolveMigration('applied', '20251104140358_add_asset_metadata_field');
  } catch (e) {
    warn(`⚠️  assets.metadata handler failed: ${e.message}`);
  }

  try {
    ensureCategoriesColumns();
    await resolveMigration('rolled-back', '20251119100000_add_categories_array_fields');
    await resolveMigration('applied', '20251119100000_add_categories_array_fields');
  } catch (e) {
    warn(`⚠️  categories handler failed: ${e.message}`);
  }

  log('Done.');
};

main().catch((e) => {
  error(e?.stack || e?.message || String(e));
  process.exit(1);
});

