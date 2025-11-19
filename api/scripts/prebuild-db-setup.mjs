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
    const raw = runPrisma(
      ['migrate', 'status', '--schema', SCHEMA_PATH, '--json'],
      { silent: true, allowFailure: true },
    );
    if (!raw) {
      return [];
    }
    const parsed = parseJsonOutput(raw);
    return Array.isArray(parsed.failedMigrationNames) ? parsed.failedMigrationNames : [];
  } catch (error) {
    warn(`⚠️  Unable to detect failed migrations automatically: ${error.message}`);
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

const handleFailedMigration = (migration) => {
  switch (migration) {
    case '20251104140358_add_asset_metadata_field':
      log(`   • Resolving ${migration} (metadata column)`);
      ensureMetadataColumn();
      resolveMigration('applied', migration);
      break;
    default:
      log(`   • Rolling back failed migration ${migration}`);
      resolveMigration('rolled-back', migration);
      break;
  }
};

log('🔧 Running database pre-build cleanup...');

const failedMigrations = getFailedMigrations();

if (failedMigrations.length === 0) {
  log('✅ No failed migrations detected.');
} else {
  log('❗ Detected failed migrations. Attempting automatic cleanup...');
  failedMigrations.forEach(handleFailedMigration);
}

log('✅ Database pre-build cleanup complete.');
