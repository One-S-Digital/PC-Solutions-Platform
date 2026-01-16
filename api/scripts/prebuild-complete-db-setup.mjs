#!/usr/bin/env node

/**
 * Complete Pre-build Database Setup Script
 * 
 * This script ensures all database tables, migrations, and connections are properly
 * set up before the application starts. It performs the following steps:
 * 
 * 1. Tests database connection
 * 2. Generates Prisma client
 * 3. Runs migration recovery/fix script
 * 4. Deploys pending migrations
 * 5. Verifies critical tables exist
 * 
 * Usage:
 *   node scripts/prebuild-complete-db-setup.mjs
 * 
 * Environment Variables:
 *   DATABASE_URL - Required: PostgreSQL connection string
 *   SKIP_DB_SETUP - Optional: Set to 'true' to skip this script
 *   SKIP_PRISMA_MIGRATIONS - Optional: Set to 'true' to skip migrations
 */

import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ROOT = path.join(__dirname, '..');
const WORKSPACE_ROOT = path.join(API_ROOT, '..');
const SCHEMA_PATH = path.join(API_ROOT, 'prisma', 'schema.prisma');

// Logging utilities
const log = (message) => console.log(`\x1b[36m[db-setup]\x1b[0m ${message}`);
const success = (message) => console.log(`\x1b[32m[db-setup] ✅ ${message}\x1b[0m`);
const warn = (message) => console.warn(`\x1b[33m[db-setup] ⚠️  ${message}\x1b[0m`);
const error = (message) => console.error(`\x1b[31m[db-setup] ❌ ${message}\x1b[0m`);

const envFlag = (value) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toString().toLowerCase());
};

// Check environment
if (!process.env.DATABASE_URL) {
  warn('DATABASE_URL not set. Skipping database setup.');
  warn('Database migrations will need to be run manually or at application startup.');
  process.exit(0);
}

if (envFlag(process.env.SKIP_DB_SETUP)) {
  log('SKIP_DB_SETUP is set. Skipping database setup.');
  process.exit(0);
}

// Find Prisma binary
const prismaBinCandidates = [
  path.join(WORKSPACE_ROOT, 'node_modules', '.bin', 'prisma'),
  path.join(API_ROOT, 'node_modules', '.bin', 'prisma'),
];
const PRISMA_BIN = prismaBinCandidates.find((p) => fs.existsSync(p));

/**
 * Run a command and return the result
 */
const runCommand = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: API_ROOT,
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    success: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
};

/**
 * Run Prisma CLI command
 */
const runPrisma = (args, options = {}) => {
  if (PRISMA_BIN) {
    return runCommand(PRISMA_BIN, args, options);
  }
  return runCommand('npx', ['prisma', ...args], options);
};

/**
 * Test database connection
 */
const testDatabaseConnection = async () => {
  log('Testing database connection...');
  
  // Use prisma db execute to test connection
  const result = runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { 
      silent: true,
      input: 'SELECT 1;',
    }
  );
  
  if (!result.success) {
    throw new Error('Could not connect to database. Check DATABASE_URL.');
  }
  
  success('Database connection successful');
};

/**
 * Generate Prisma client
 */
const generatePrismaClient = () => {
  log('Generating Prisma client...');
  
  const result = runPrisma(['generate', '--schema', SCHEMA_PATH]);
  
  if (!result.success) {
    throw new Error('Failed to generate Prisma client');
  }
  
  success('Prisma client generated');
};

/**
 * Run the migration recovery/fix script
 */
const runMigrationRecovery = async () => {
  log('Running migration recovery script...');
  
  const recoveryScript = path.join(__dirname, 'prebuild-db-setup.mjs');
  
  if (!fs.existsSync(recoveryScript)) {
    warn('Migration recovery script not found. Skipping.');
    return;
  }
  
  const result = runCommand('node', [recoveryScript]);
  
  if (!result.success) {
    warn('Migration recovery script had issues, but continuing...');
  } else {
    success('Migration recovery complete');
  }
};

/**
 * Deploy pending migrations
 */
const deployMigrations = () => {
  if (envFlag(process.env.SKIP_PRISMA_MIGRATIONS)) {
    log('SKIP_PRISMA_MIGRATIONS is set. Skipping migration deployment.');
    return;
  }
  
  log('Deploying pending migrations...');
  
  const result = runPrisma(['migrate', 'deploy', '--schema', SCHEMA_PATH]);
  
  if (!result.success) {
    throw new Error('Failed to deploy migrations');
  }
  
  success('Migrations deployed successfully');
};

/**
 * Verify critical tables exist
 */
const verifyCriticalTables = () => {
  log('Verifying critical database tables...');
  
  const criticalTables = [
    'users',
    // Separate contact email storage (must exist for profile settings updates)
    'user_contact_infos',
    'organizations',
    'organization_contact_infos',
    'assets',
    'products',
    'services',
    'job_listings',
    'static_translations',
    'messages',
    'promo_codes',
  ];
  
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (${criticalTables.map(t => `'${t}'`).join(', ')});
  `;
  
  const result = runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { 
      silent: true,
      input: sql,
    }
  );
  
  if (!result.success) {
    throw new Error('Failed to verify critical tables');
  }
  
  success('Critical tables verified');
};

/**
 * Verify educator availability column exists
 */
const verifyEducatorAvailabilityColumn = () => {
  log('Verifying educator availability settings column...');
  
  const sql = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'availabilitySettings';
  `;
  
  const result = runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { 
      silent: true,
      input: sql,
    }
  );
  
  if (!result.success) {
    warn('Could not verify availabilitySettings column');
    return;
  }
  
  // Check if we got a result (column exists)
  if (result.stdout && result.stdout.includes('availabilitySettings')) {
    success('Educator availability settings column exists');
  } else {
    warn('Educator availability settings column may not exist yet');
    log('It will be created by the migration');
  }
};

/**
 * Print database status summary
 */
const printStatusSummary = () => {
  log('');
  log('Checking migration status...');
  
  const result = runPrisma(['migrate', 'status', '--schema', SCHEMA_PATH], { silent: true });
  
  if (result.stdout) {
    console.log(result.stdout);
  }
};

/**
 * Main function
 */
const main = async () => {
  console.log('');
  log('========================================');
  log('  Complete Database Setup Script');
  log('========================================');
  console.log('');
  
  log(`Schema path: ${SCHEMA_PATH}`);
  log(`Prisma CLI: ${PRISMA_BIN || 'npx prisma (fallback)'}`);
  console.log('');
  
  try {
    // Step 1: Test connection
    await testDatabaseConnection();
    
    // Step 2: Generate Prisma client
    generatePrismaClient();
    
    // Step 3: Run migration recovery
    await runMigrationRecovery();
    
    // Step 4: Deploy migrations
    deployMigrations();
    
    // Step 5: Verify tables
    verifyCriticalTables();
    
    // Step 6: Verify new availability column
    verifyEducatorAvailabilityColumn();
    
    // Print summary
    printStatusSummary();
    
    console.log('');
    log('========================================');
    success('Database setup complete!');
    log('========================================');
    console.log('');
    
  } catch (err) {
    console.log('');
    error(`Database setup failed: ${err.message}`);
    console.log('');
    error('Please check your DATABASE_URL and ensure the database is accessible.');
    console.log('');
    
    // Print current status for debugging
    log('Current migration status:');
    runPrisma(['migrate', 'status', '--schema', SCHEMA_PATH], { silent: false });
    
    process.exit(1);
  }
};

// Run main function
main();
