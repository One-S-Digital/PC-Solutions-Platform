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
  log('⚠️  DATABASE_URL not set. Skipping asset URL constraint fix.');
  process.exit(0);
}

const runPrisma = (args, { silent = false, input } = {}) => {
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
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    throw new Error(`prisma ${args.join(' ')} failed: ${stderr || stdout}`);
  }

  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
};

const fixAssetUrlConstraint = () => {
  const sql = `
DO $$
BEGIN
    -- Check if 'url' column exists in 'assets' table
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

        -- Also sync data FROM publicUrl TO url if url is empty (to keep them in sync if url is used by something else)
        UPDATE "assets"
        SET "url" = "publicUrl"
        WHERE ("url" IS NULL OR "url" = '') AND "publicUrl" IS NOT NULL AND "publicUrl" != '';

        -- Make url nullable to prevent insert errors from Prisma (which doesn't know about 'url')
        ALTER TABLE "assets" ALTER COLUMN "url" DROP NOT NULL;
        
        RAISE NOTICE 'Fixed asset url constraint and synced data.';
    ELSE
        RAISE NOTICE 'Column url does not exist in assets table, skipping fix.';
    END IF;
END $$;
`;

  try {
    log('🔧 Fixing asset URL constraint...');
    runPrisma(
      ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
      { silent: true, input: sql },
    );
    log('✅ Asset URL constraint fixed.');
  } catch (error) {
    warn(`⚠️  Failed to fix asset URL constraint: ${error.message}`);
    // Don't exit with error, just warn, as this might run in environments where DB is not reachable or ready
  }
};

fixAssetUrlConstraint();
