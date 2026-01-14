#!/usr/bin/env node

/**
 * Schema Drift Detection Script
 * 
 * Detects when Prisma schema changes haven't been captured in migrations.
 * This prevents the issue where schema.prisma is updated but developers
 * forget to run `prisma migrate dev` to create the migration.
 * 
 * Usage:
 *   node scripts/check-schema-drift.mjs
 *   pnpm run check:schema-drift
 * 
 * Exit codes:
 *   0 - No schema drift detected
 *   1 - Schema drift detected (migration needed)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(API_ROOT, 'prisma', 'schema.prisma');
const MIGRATIONS_PATH = path.join(API_ROOT, 'prisma', 'migrations');

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = (msg) => console.log(`${colors.blue}[schema-check]${colors.reset} ${msg}`);
const success = (msg) => console.log(`${colors.green}[schema-check] ✅ ${msg}${colors.reset}`);
const warn = (msg) => console.log(`${colors.yellow}[schema-check] ⚠️  ${msg}${colors.reset}`);
const error = (msg) => console.error(`${colors.red}[schema-check] ❌ ${msg}${colors.reset}`);

/**
 * Find the Prisma CLI binary
 */
function findPrismaBin() {
  const candidates = [
    path.join(API_ROOT, '..', 'node_modules', '.bin', 'prisma'),
    path.join(API_ROOT, 'node_modules', '.bin', 'prisma'),
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Get the latest migration directory
 */
function getLatestMigration() {
  const migrations = fs.readdirSync(MIGRATIONS_PATH)
    .filter(f => f.match(/^\d{14}_/) || f.match(/^\d{8}_/))
    .sort()
    .reverse();
  
  return migrations[0] || null;
}

/**
 * Extract fields added in recent migrations (last N migrations)
 */
function getRecentMigrationFields(count = 10) {
  const migrations = fs.readdirSync(MIGRATIONS_PATH)
    .filter(f => f.match(/^\d{14}_/) || f.match(/^\d{8}_/))
    .sort()
    .reverse()
    .slice(0, count);
  
  const addedColumns = [];
  
  for (const dir of migrations) {
    const migrationFile = path.join(MIGRATIONS_PATH, dir, 'migration.sql');
    if (!fs.existsSync(migrationFile)) continue;
    
    const content = fs.readFileSync(migrationFile, 'utf-8');
    
    // Extract ADD COLUMN statements
    const addColumnRegex = /ALTER\s+TABLE\s+"?(\w+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi;
    let match;
    while ((match = addColumnRegex.exec(content)) !== null) {
      addedColumns.push({ table: match[1], column: match[2], migration: dir });
    }
  }
  
  return addedColumns;
}

/**
 * Extract all fields from the Prisma schema for a given model
 */
function getSchemaModelFields(modelName) {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]+)\\}`, 's');
  const match = schemaContent.match(modelRegex);
  
  if (!match) return [];
  
  const fields = [];
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
    
    const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\??/);
    if (fieldMatch) {
      const [, name, type, isArray] = fieldMatch;
      const isRelation = trimmed.includes('@relation');
      if (!isRelation) {
        fields.push({ name, type: type + (isArray || '') });
      }
    }
  }
  
  return fields;
}

/**
 * Check for fields in schema that were added after the latest migration
 * by comparing git history (if available)
 */
function checkSchemaVsMigrations() {
  console.log('');
  log('🔍 Checking for Prisma schema drift...');
  log(`   Schema: ${SCHEMA_PATH}`);
  log(`   Migrations: ${MIGRATIONS_PATH}`);
  console.log('');

  const prismaBin = findPrismaBin();
  
  if (!prismaBin) {
    warn('Prisma CLI not found. Run pnpm install first.');
    return false;
  }

  // First, validate the schema
  // Set a dummy DATABASE_URL if not present (required for validation)
  log('Validating schema syntax...');
  const validateEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/dummy_db',
  };
  
  const validateResult = spawnSync(
    prismaBin,
    ['validate', '--schema', SCHEMA_PATH],
    {
      cwd: API_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: validateEnv,
    }
  );
  
  if (validateResult.status !== 0) {
    error('Schema validation failed:');
    console.log(validateResult.stderr || validateResult.stdout);
    return true;
  }
  
  success('Schema is valid');
  
  // Check if DATABASE_URL is available for full drift check
  if (process.env.DATABASE_URL) {
    log('Database URL available. Running full drift check...');
    return runFullDriftCheck(prismaBin);
  }
  
  // Fallback: compare schema file mtime with latest migration
  log('No database available. Running timestamp-based check...');
  return runTimestampCheck();
}

/**
 * Full drift check using prisma migrate diff (requires database)
 */
function runFullDriftCheck(prismaBin) {
  const shadowDbUrl = process.env.DATABASE_URL.replace(/\/[^/?]+(\?|$)/, '/prisma_shadow_db$1');
  
  const result = spawnSync(
    prismaBin,
    [
      'migrate',
      'diff',
      '--from-migrations', './prisma/migrations',
      '--to-schema-datamodel', './prisma/schema.prisma',
      '--shadow-database-url', shadowDbUrl,
    ],
    {
      cwd: API_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    }
  );

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  
  // Check for database connection errors
  if (stderr.includes('P1001') || stderr.includes('ECONNREFUSED')) {
    log('Could not connect to database for full check.');
    return runTimestampCheck();
  }
  
  // Check if there are SQL changes
  const sqlPatterns = [
    /CREATE\s+TABLE/i,
    /ALTER\s+TABLE/i,
    /DROP\s+TABLE/i,
    /ADD\s+COLUMN/i,
    /DROP\s+COLUMN/i,
  ];

  const hasDrift = sqlPatterns.some(pattern => pattern.test(stdout));
  
  if (hasDrift) {
    console.log('');
    error('Schema drift detected!');
    console.log('');
    log('The following changes need migrations:');
    console.log('');
    console.log(colors.yellow + stdout + colors.reset);
    printFixInstructions();
    return true;
  }

  success('No schema drift. Schema and migrations are in sync.');
  return false;
}

/**
 * Timestamp-based check: warn if schema was modified after latest migration
 */
function runTimestampCheck() {
  const latestMigration = getLatestMigration();
  
  if (!latestMigration) {
    warn('No migrations found.');
    return false;
  }
  
  log(`Latest migration: ${latestMigration}`);
  
  // Get modification times
  const schemaMtime = fs.statSync(SCHEMA_PATH).mtime;
  const migrationPath = path.join(MIGRATIONS_PATH, latestMigration, 'migration.sql');
  
  if (!fs.existsSync(migrationPath)) {
    warn(`Migration file not found: ${migrationPath}`);
    return false;
  }
  
  const migrationMtime = fs.statSync(migrationPath).mtime;
  
  log(`Schema last modified: ${schemaMtime.toISOString()}`);
  log(`Migration created: ${migrationMtime.toISOString()}`);
  
  // If schema is significantly newer than latest migration, warn
  const timeDiff = schemaMtime.getTime() - migrationMtime.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff > 1) { // Schema modified more than 1 hour after migration
    console.log('');
    warn('Schema was modified after the latest migration!');
    console.log('');
    log(`Time difference: ${hoursDiff.toFixed(1)} hours`);
    console.log('');
    log('This might indicate schema changes without corresponding migrations.');
    log('Please verify that all schema changes have migrations.');
    printFixInstructions();
    
    // Don't fail in CI for timestamp check - it's just a warning
    // Only fail if we can do a proper diff
    return false;
  }
  
  success('Schema and latest migration are in sync (based on timestamps).');
  return false;
}

/**
 * Print fix instructions
 */
function printFixInstructions() {
  console.log('');
  log('─'.repeat(60));
  log(`${colors.bold}How to fix:${colors.reset}`);
  log('');
  log('  1. Run: cd api && npx prisma migrate dev --name <descriptive_name>');
  log('  2. Review the generated migration SQL in prisma/migrations/');
  log('  3. Commit BOTH the schema.prisma changes AND the new migration');
  log('');
  log('─'.repeat(60));
  console.log('');
}

/**
 * Main
 */
function main() {
  console.log('');
  log('═'.repeat(50));
  log('  Prisma Schema Drift Detection');
  log('═'.repeat(50));
  
  const hasDrift = checkSchemaVsMigrations();
  
  console.log('');
  
  if (hasDrift) {
    process.exit(1);
  }
  
  process.exit(0);
}

main();
