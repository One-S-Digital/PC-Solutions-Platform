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

  if (result.status !== 0) {
    const output = (result.stderr || result.stdout || '').trim();
    if (allowFailure) {
      if (output) {
        warn(output);
      }
      return '';
    }
    throw new Error(`prisma ${args.join(' ')} failed${output ? `: ${output}` : ''}`);
  }

  return (result.stdout || '').trim();
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

const getFailedMigrations = () => {
  try {
    // First try JSON format
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

const handleFailedMigration = (migration) => {
  switch (migration) {
    case '20251104140358_add_asset_metadata_field':
      log(`   • Resolving ${migration} (metadata column)`);
      ensureMetadataColumn();
      resolveMigration('applied', migration);
      break;
    case '20251119100000_add_categories_array_fields':
      log(`   • Resolving ${migration} (categories columns)`);
      ensureCategoriesColumns();
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

const failedMigrations = getFailedMigrations();

if (failedMigrations.length === 0) {
  log('✅ No failed migrations detected.');
} else {
  log(`❗ Detected ${failedMigrations.length} failed migration(s). Attempting automatic cleanup...`);
  failedMigrations.forEach((migration) => {
    log(`   🔄 Processing: ${migration}`);
    handleFailedMigration(migration);
  });
  log('✅ Failed migrations processed.');
}

log('✅ Database pre-build cleanup complete.');
