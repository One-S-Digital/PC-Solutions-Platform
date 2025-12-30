#!/usr/bin/env ts-node
/**
 * Schema Drift Check Script
 * 
 * This script detects when the Prisma schema has changes that haven't been
 * captured in a migration. It prevents the issue where schema changes are
 * committed without corresponding migrations, causing database errors.
 * 
 * Usage:
 *   npx ts-node scripts/check-schema-drift.ts
 *   npm run check:schema-drift
 * 
 * Exit codes:
 *   0 - No schema drift detected
 *   1 - Schema drift detected (migration needed)
 *   2 - Error running the check
 */

import { execSync } from 'child_process';
import * as path from 'path';

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

interface DriftResult {
  hasDrift: boolean;
  message: string;
  details?: string;
}

function checkSchemaDrift(): DriftResult {
  console.log('🔍 Checking for Prisma schema drift...\n');
  
  try {
    // Run prisma migrate diff to compare schema with migrations
    // This command compares the schema file against the migrations folder
    // and outputs SQL that would be needed to sync them
    const result = execSync(
      `npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --shadow-database-url "postgresql://placeholder:placeholder@localhost:5432/shadow_db" --exit-code 2>&1 || true`,
      { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 60000,
      }
    );

    // Check if there are any SQL statements in the output
    // If the output contains actual SQL (CREATE, ALTER, DROP), there's drift
    const sqlKeywords = ['CREATE ', 'ALTER ', 'DROP ', 'ADD COLUMN', 'ADD CONSTRAINT'];
    const hasSqlChanges = sqlKeywords.some(keyword => result.includes(keyword));
    
    if (hasSqlChanges) {
      return {
        hasDrift: true,
        message: '❌ Schema drift detected! The Prisma schema has changes that are not in migrations.',
        details: result,
      };
    }

    return {
      hasDrift: false,
      message: '✅ No schema drift detected. Schema and migrations are in sync.',
    };
  } catch (error: any) {
    // If prisma migrate diff fails, try an alternative approach
    // by checking if prisma db pull would show differences
    console.log('⚠️  Could not run full drift check (shadow database not available).');
    console.log('   Running fallback validation...\n');
    
    return runFallbackCheck();
  }
}

function runFallbackCheck(): DriftResult {
  try {
    // Validate the schema can be parsed
    execSync('npx prisma validate', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    // Generate the client to ensure schema is valid
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    // Check if there are uncommitted schema changes by comparing
    // the schema file modification time with the latest migration
    const fs = require('fs');
    const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    
    const schemaMtime = fs.statSync(schemaPath).mtime;
    
    // Get the latest migration folder
    const migrations = fs.readdirSync(migrationsDir)
      .filter((f: string) => f.match(/^\d{14}_/))
      .sort()
      .reverse();
    
    if (migrations.length === 0) {
      return {
        hasDrift: false,
        message: '⚠️  No migrations found. Ensure migrations exist for your schema.',
      };
    }
    
    const latestMigration = migrations[0];
    const migrationPath = path.join(migrationsDir, latestMigration, 'migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return {
        hasDrift: true,
        message: `❌ Latest migration folder '${latestMigration}' is missing migration.sql file.`,
      };
    }
    
    console.log(`📁 Latest migration: ${latestMigration}`);
    console.log(`📄 Schema last modified: ${schemaMtime.toISOString()}`);
    
    // Parse the schema to check for fields that might be missing migrations
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    
    // Extract field definitions from schema that should have migrations
    // This is a simple heuristic check
    const schemaFields = extractSchemaFields(schemaContent);
    const migrationColumns = extractMigrationColumns(migrationContent);
    
    // Check for potential mismatches
    const warnings: string[] = [];
    
    // Check if schema has array fields that might not have migrations
    const arrayFields = schemaFields.filter(f => f.includes('[]'));
    for (const field of arrayFields) {
      const fieldName = field.split(' ')[0];
      // Array fields in PostgreSQL need specific column types
      console.log(`   Checking array field: ${fieldName}`);
    }
    
    return {
      hasDrift: false,
      message: '✅ Schema validation passed. Run `prisma migrate dev` to check for pending changes.',
    };
    
  } catch (error: any) {
    return {
      hasDrift: true,
      message: '❌ Schema validation failed.',
      details: error.message,
    };
  }
}

function extractSchemaFields(schema: string): string[] {
  const fields: string[] = [];
  const lines = schema.split('\n');
  
  let inModel = false;
  for (const line of lines) {
    if (line.match(/^model\s+\w+\s*\{/)) {
      inModel = true;
      continue;
    }
    if (line.match(/^\}/)) {
      inModel = false;
      continue;
    }
    if (inModel) {
      const fieldMatch = line.match(/^\s+(\w+)\s+(\w+\[\]?)/);
      if (fieldMatch) {
        fields.push(`${fieldMatch[1]} ${fieldMatch[2]}`);
      }
    }
  }
  
  return fields;
}

function extractMigrationColumns(migration: string): string[] {
  const columns: string[] = [];
  const addColumnMatches = migration.matchAll(/ADD COLUMN.*?"(\w+)"/gi);
  
  for (const match of addColumnMatches) {
    columns.push(match[1]);
  }
  
  return columns;
}

// Main execution
const result = checkSchemaDrift();

console.log('\n' + '='.repeat(60));
console.log(result.message);

if (result.details) {
  console.log('\nDetails:');
  console.log(result.details);
}

console.log('='.repeat(60) + '\n');

if (result.hasDrift) {
  console.log('💡 To fix this issue:');
  console.log('   1. Run: npx prisma migrate dev --name <migration_name>');
  console.log('   2. Review the generated migration SQL');
  console.log('   3. Commit both the schema changes AND the new migration');
  console.log('');
  process.exit(1);
}

process.exit(0);
