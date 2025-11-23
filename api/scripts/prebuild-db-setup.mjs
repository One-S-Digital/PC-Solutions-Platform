#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');

const log = (message) => console.log(message);
const warn = (message) => console.warn(message);

if (!process.env.DATABASE_URL) {
  log('⚠️  DATABASE_URL not set. Skipping database pre-build tasks.');
  process.exit(0);
}

const runPrisma = (args, { silent = false, allowFailure = false, input } = {}) => {
  const shouldPipe = silent || typeof input === 'string';
  const stdio = shouldPipe ? ['pipe', 'pipe', 'pipe'] : 'inherit';

  const result = spawnSync('npx', ['prisma', ...args], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio,
    encoding: 'utf8',
    input,
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  const stdoutTrimmed = stdout.trim();
  const stderrTrimmed = stderr.trim();
  const combinedOutput = [stdoutTrimmed, stderrTrimmed].filter(Boolean).join('\n');

  if (result.status !== 0) {
    if (allowFailure) {
      if (combinedOutput) {
        warn(combinedOutput);
      }
      return stdoutTrimmed || stderrTrimmed;
    }
    throw new Error(`prisma ${args.join(' ')} failed${combinedOutput ? `: ${combinedOutput}` : ''}`);
  }

  return stdoutTrimmed;
};

const parseJsonOutput = (raw) => {
  if (!raw) {
    return {};
  }

  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`Unable to parse JSON output:\n${trimmed}`);
  }

  return JSON.parse(trimmed.slice(jsonStart));
};

let cachedJsonStatusSupport;

const prismaMigrateStatusSupportsJson = () => {
  if (typeof cachedJsonStatusSupport === 'boolean') {
    return cachedJsonStatusSupport;
  }

  try {
    const helpOutput = runPrisma(
      ['migrate', 'status', '--help'],
      { silent: true },
    );
    cachedJsonStatusSupport = /\B--json\b/.test(helpOutput) || /--output(?:\s+|\=)json/.test(helpOutput);
  } catch (error) {
    cachedJsonStatusSupport = false;
    warn(`⚠️  Unable to determine Prisma CLI JSON support: ${error.message}`);
  }

  return cachedJsonStatusSupport;
};

const getFailedMigrations = () => {
  try {
    const supportsJson = prismaMigrateStatusSupportsJson();

    if (supportsJson) {
      // First try JSON format if supported
      const raw = runPrisma(
        ['migrate', 'status', '--schema', SCHEMA_PATH, '--json'],
        { silent: true, allowFailure: true },
      );
      if (raw) {
        try {
          const parsed = parseJsonOutput(raw);
          if (Array.isArray(parsed.failedMigrationNames) && parsed.failedMigrationNames.length > 0) {
            log(`📋 Detected failed migrations via JSON: ${parsed.failedMigrationNames.join(', ')}`);
            return parsed.failedMigrationNames;
          }
        } catch (parseError) {
          warn(`⚠️  Could not parse JSON status, trying text format...`);
        }
      }
    }
    
    // Fallback: try text format and parse it
    const textRaw = runPrisma(
      ['migrate', 'status', '--schema', SCHEMA_PATH],
      { silent: true, allowFailure: true },
    );
    
    if (textRaw) {
      const failedMigrations = [];
      const lines = textRaw.split('\n');
      
      for (const line of lines) {
        // Match patterns like "Following migration have failed:" followed by migration names
        // or "The `20251119100000_add_categories_array_fields` migration ... failed"
        if (line.includes('have failed:') || line.includes('Following migration')) {
          continue; // Header line
        }
        
        // Look for migration names (format: YYYYMMDDHHMMSS_name)
        const migrationMatch = line.match(/(\d{14}_[a-z_]+)/i);
        if (migrationMatch && (line.includes('failed') || line.toLowerCase().includes('failed'))) {
          failedMigrations.push(migrationMatch[1]);
        }
        
        // Also match the specific format in the error message
        if (line.includes('migration started at') && line.includes('failed')) {
          const nameMatch = line.match(/`([^`]+)`/);
          if (nameMatch) {
            failedMigrations.push(nameMatch[1]);
          }
        }
      }
      
      if (failedMigrations.length > 0) {
        const unique = [...new Set(failedMigrations)];
        log(`📋 Detected failed migrations via text parsing: ${unique.join(', ')}`);
        return unique;
      }
    }
    
    return [];
  } catch (error) {
    warn(`⚠️  Unable to detect failed migrations: ${error.message}`);
    return [];
  }
};

const resolveMigration = (action, migration) => {
  runPrisma(
    ['migrate', 'resolve', `--${action}`, migration, '--schema', SCHEMA_PATH],
    { silent: true, allowFailure: true },
  );
};

const ensureMetadataColumn = () => {
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
        ALTER TABLE "assets"
        ADD COLUMN "metadata" JSONB;
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureCategoriesColumns = () => {
  const sql = `
DO $$
BEGIN
    -- Add categories column to products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "products" SET "categories" = ARRAY[category] 
        WHERE "category" IS NOT NULL AND "category" != '';
    END IF;

    -- Add categories column to services table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "services" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "services" SET "categories" = ARRAY[category::text] 
        WHERE "category" IS NOT NULL;
    END IF;

    -- Add productCategories column to organizations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'productCategories'
    ) THEN
        ALTER TABLE "organizations" ADD COLUMN "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "organizations" SET "productCategories" = ARRAY[productCategory] 
        WHERE "productCategory" IS NOT NULL AND "productCategory" != '';
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureProductMetadataColumns = () => {
  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ProductAvailabilityStatus'
    ) THEN
        CREATE TYPE "ProductAvailabilityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'OUT_OF_STOCK');
    END IF;
END
$$;

ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "subtitle" TEXT,
    ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'CHF',
    ADD COLUMN IF NOT EXISTS "primaryCategory" TEXT,
    ADD COLUMN IF NOT EXISTS "productHighlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT,
    ADD COLUMN IF NOT EXISTS "availabilityStatus" "ProductAvailabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS "sku" TEXT,
    ADD COLUMN IF NOT EXISTS "vendorSku" TEXT,
    ADD COLUMN IF NOT EXISTS "ean" TEXT,
    ADD COLUMN IF NOT EXISTS "minOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "maxOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "stockStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "deliveryLeadTimeDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "restockCadence" TEXT,
    ADD COLUMN IF NOT EXISTS "usageNotes" TEXT,
    ADD COLUMN IF NOT EXISTS "packagingDetails" TEXT,
    ADD COLUMN IF NOT EXISTS "materials" TEXT,
    ADD COLUMN IF NOT EXISTS "complianceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "ageRanges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryFees" JSONB,
    ADD COLUMN IF NOT EXISTS "supportedCantons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "visibilityStart" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "visibilityEnd" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "volumePricing" JSONB,
    ADD COLUMN IF NOT EXISTS "variants" JSONB,
    ADD COLUMN IF NOT EXISTS "galleryAssetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "specSheetAssetId" TEXT,
    ADD COLUMN IF NOT EXISTS "msdsAssetId" TEXT;

ALTER TABLE "products"
    ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "categories" SET DEFAULT ARRAY[]::TEXT[];
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureTranslationInfrastructure = () => {
  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TranslationStatus'
    ) THEN
        CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
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
END
$$;

ALTER TABLE "entity_translations"
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "mtProvider" TEXT,
    ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "translatedAt" TIMESTAMP(3);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
          AND column_name = 'updatedAt'
          AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE "entity_translations"
        ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const handleFailedMigration = (migration) => {
  switch (migration) {
    case '20251104140358_add_asset_metadata_field':
      log(`   • Resolving ${migration} (metadata column)`);
      ensureMetadataColumn();
      resolveMigration('applied', migration);
      break;
    // case '20251114140526_add_i18n_translation_tables':
    //   log(`   • Resolving ${migration} (translation infrastructure)`);
    //   ensureTranslationInfrastructure();
    //   resolveMigration('applied', migration);
    //   break;
    case '20251119100000_add_categories_array_fields':
      log(`   • Resolving ${migration} (categories columns)`);
      ensureCategoriesColumns();
      resolveMigration('applied', migration);
      break;
    case '20251120120000_expand_product_metadata':
      log(`   • Resolving ${migration} (product metadata columns)`);
      ensureProductMetadataColumns();
      resolveMigration('applied', migration);
      break;
    default:
      log(`   • Rolling back failed migration ${migration}`);
      resolveMigration('rolled-back', migration);
      break;
  }
};

log('🔧 Running database pre-build cleanup...');
log(`📍 Database URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
log(`📍 Schema path: ${SCHEMA_PATH}`);

// log('🔁 Ensuring translation infrastructure is present...');
// ensureTranslationInfrastructure();

const failedMigrations = getFailedMigrations();
const forcedMigrationsEnv = process.env.FORCE_RESOLVE_MIGRATIONS || '';
const forcedMigrations = forcedMigrationsEnv
  .split(',')
  .map((migration) => migration.trim())
  .filter(Boolean);
const forcedOnly = forcedMigrations.filter((migration) => !failedMigrations.includes(migration));
const migrationsToProcess = [...new Set([...failedMigrations, ...forcedMigrations])];

if (migrationsToProcess.length === 0) {
  log('✅ No failed migrations detected.');
} else {
  if (failedMigrations.length > 0) {
    log(`❗ Detected ${failedMigrations.length} failed migration(s). Attempting automatic cleanup...`);
  }
  if (forcedOnly.length > 0) {
    log(`⚙️  Force-resolving migration(s): ${forcedOnly.join(', ')}`);
  }
  migrationsToProcess.forEach((migration) => {
    log(`   🔄 Processing: ${migration}`);
    handleFailedMigration(migration);
  });
  log('✅ Failed migrations processed.');
}

log('✅ Database pre-build cleanup complete.');
