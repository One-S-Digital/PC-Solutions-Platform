/**
 * Database Schema Verification Script
 * 
 * This script verifies that all required tables and columns exist
 * in the database for proper functioning of user signup, login,
 * and all platform features.
 * 
 * Usage: npx ts-node scripts/verify-schema.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

const results: VerificationResult[] = [];

/**
 * Check if all required tables exist
 */
async function checkTables() {
  console.log('📋 Checking required tables...\n');
  
  const requiredTables = [
    'users', 'AppUser', 'AppUserRoleHistory', 'organizations',
    'assets', 'subscriptions', 'user_subscriptions',
    'courses', 'course_enrollments', 'messages',
    'audit_logs', 'email_logs', 'platform_settings',
    'webhooks', 'api_keys', 'content_items'
  ];
  
  const existingTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  
  const existingTableNames = existingTables.map(t => t.tablename);
  const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
  
  if (missingTables.length === 0) {
    results.push({
      category: 'Tables',
      status: 'pass',
      message: `✅ All ${requiredTables.length} required tables exist`
    });
  } else {
    results.push({
      category: 'Tables',
      status: 'fail',
      message: `❌ Missing ${missingTables.length} required tables`,
      details: missingTables
    });
  }
}

/**
 * Check critical columns for user authentication
 */
async function checkUserColumns() {
  console.log('👤 Checking user-related columns...\n');
  
  const criticalColumns = [
    { table: 'users', column: 'id', required: true },
    { table: 'users', column: 'clerkId', required: true },
    { table: 'users', column: 'email', required: true },
    { table: 'users', column: 'firstName', required: false },
    { table: 'users', column: 'lastName', required: false },
    { table: 'users', column: 'role', required: true },
    { table: 'users', column: 'stripeCustomerId', required: false },
    { table: 'users', column: 'isActive', required: true },
    { table: 'users', column: 'createdAt', required: true },
    { table: 'users', column: 'updatedAt', required: true },
    { table: 'AppUser', column: 'id', required: true },
    { table: 'AppUser', column: 'clerkId', required: true },
    { table: 'AppUser', column: 'email', required: false },
    { table: 'AppUser', column: 'role', required: true },
  ];
  
  const missingColumns: string[] = [];
  
  for (const { table, column, required } of criticalColumns) {
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ${table}
        AND column_name = ${column}
    `;
    
    if (result.length === 0 && required) {
      missingColumns.push(`${table}.${column} (required)`);
    } else if (result.length === 0) {
      missingColumns.push(`${table}.${column} (optional)`);
    }
  }
  
  if (missingColumns.length === 0) {
    results.push({
      category: 'User Columns',
      status: 'pass',
      message: '✅ All critical user columns exist'
    });
  } else {
    const hasRequiredMissing = missingColumns.some(c => c.includes('(required)'));
    results.push({
      category: 'User Columns',
      status: hasRequiredMissing ? 'fail' : 'warning',
      message: hasRequiredMissing 
        ? `❌ Missing ${missingColumns.length} critical columns` 
        : `⚠️  Missing ${missingColumns.length} optional columns`,
      details: missingColumns
    });
  }
}

/**
 * Check critical indexes
 */
async function checkIndexes() {
  console.log('⚡ Checking critical indexes...\n');
  
  const criticalIndexes = [
    { table: 'users', index: 'users_clerkId_key' },
    { table: 'users', index: 'users_email_key' },
    { table: 'users', index: 'users_stripeCustomerId_key' },
    { table: 'AppUser', index: 'AppUser_clerkId_key' },
  ];
  
  const missingIndexes: string[] = [];
  
  for (const { table, index } of criticalIndexes) {
    const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = ${table}
        AND indexname = ${index}
    `;
    
    if (result.length === 0) {
      missingIndexes.push(`${table}.${index}`);
    }
  }
  
  if (missingIndexes.length === 0) {
    results.push({
      category: 'Indexes',
      status: 'pass',
      message: '✅ All critical indexes exist'
    });
  } else {
    results.push({
      category: 'Indexes',
      status: 'warning',
      message: `⚠️  Missing ${missingIndexes.length} indexes (performance impact)`,
      details: missingIndexes
    });
  }
}

/**
 * Check foreign key constraints
 */
async function checkForeignKeys() {
  console.log('🔗 Checking foreign key constraints...\n');
  
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
  `;
  
  const count = Number(result[0].count);
  
  if (count >= 50) {
    results.push({
      category: 'Foreign Keys',
      status: 'pass',
      message: `✅ Found ${count} foreign key constraints`
    });
  } else {
    results.push({
      category: 'Foreign Keys',
      status: 'warning',
      message: `⚠️  Found only ${count} foreign key constraints (expected more)`
    });
  }
}

/**
 * Check if assets table has been migrated to AppUser
 */
async function checkAssetsMigration() {
  console.log('🖼️  Checking assets table migration state...\n');
  
  const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
      AND column_name = 'uploadedById'
  `;
  
  if (result.length > 0) {
    results.push({
      category: 'Assets Migration',
      status: 'pass',
      message: '✅ Assets table correctly references AppUser'
    });
  } else {
    results.push({
      category: 'Assets Migration',
      status: 'fail',
      message: '❌ Assets table needs migration to AppUser'
    });
  }
}

/**
 * Print results summary
 */
function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 DATABASE SCHEMA VERIFICATION RESULTS');
  console.log('='.repeat(70) + '\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  for (const result of results) {
    console.log(`[${result.category}]`);
    console.log(`  ${result.message}`);
    if (result.details && result.details.length > 0) {
      console.log(`  Details:`);
      result.details.forEach(d => console.log(`    - ${d}`));
    }
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log(`Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log('='.repeat(70) + '\n');
  
  if (failed > 0) {
    console.log('❌ Schema verification FAILED');
    console.log('\n📝 Next steps:');
    console.log('  1. Run: npx prisma migrate deploy');
    console.log('  2. Check migration files in api/prisma/migrations/');
    console.log('  3. Re-run this verification script\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Schema verification passed with WARNINGS');
    console.log('\n📝 Consider running: npx prisma migrate deploy\n');
    process.exit(0);
  } else {
    console.log('✅ Schema verification PASSED - all checks successful!\n');
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Starting database schema verification...\n');
  console.log('Database:', process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') || 'Not set');
  console.log('');
  
  try {
    await checkTables();
    await checkUserColumns();
    await checkIndexes();
    await checkForeignKeys();
    await checkAssetsMigration();
    
    printResults();
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
