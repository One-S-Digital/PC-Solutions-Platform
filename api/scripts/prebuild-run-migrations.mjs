#!/usr/bin/env node

/**
 * Runs `prisma migrate deploy` before building so that required tables
 * (including the translation infrastructure) always exist in the target DB.
 * Skips gracefully if DATABASE_URL is not configured or if the caller sets
 * SKIP_PRISMA_MIGRATIONS=true.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');

const log = (message) => console.log(`[prebuild:migrate] ${message}`);
const error = (message) => console.error(`[prebuild:migrate] ${message}`);

const envFlag = (value) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toString().toLowerCase());
};

if (!process.env.DATABASE_URL) {
  log('DATABASE_URL not set. Skipping Prisma migrations.');
  process.exit(0);
}

if (envFlag(process.env.SKIP_PRISMA_MIGRATIONS)) {
  log('SKIP_PRISMA_MIGRATIONS is set. Skipping Prisma migrations.');
  process.exit(0);
}

log(`Applying Prisma migrations using schema: ${SCHEMA_PATH}`);

const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'deploy', '--schema', SCHEMA_PATH],
  {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  error(`Failed to run Prisma CLI: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  error('`prisma migrate deploy` exited with a non-zero status.');
  process.exit(result.status ?? 1);
}

log('✅ Prisma migrations applied successfully.');
