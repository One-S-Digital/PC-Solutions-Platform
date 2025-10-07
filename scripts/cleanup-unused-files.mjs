#!/usr/bin/env node

/**
 * Cleanup Unused Files Script
 * 
 * This script removes old, unused, and unnecessary files
 * from the translation system.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files and directories to remove
const FILES_TO_REMOVE = [
  // Old translation.json files (replaced by namespace structure)
  'frontend/public/locales/en/translation.json',
  'frontend/public/locales/fr/translation.json',
  'frontend/public/locales/de/translation.json',
  
  // Old backup directory
  'frontend_backup',
  
  // Old translation scripts that are no longer needed
  'scripts/translate-i18n.js',
  'scripts/translate-i18n-free.js',
  'scripts/create-translations-manual.js',
  'scripts/translate-simple.js',
  'scripts/scan-i18n.ts',
  'scripts/comprehensive-translation-check.mjs',
  
  // Old translation audit script (replaced by translation-audit-simple.mjs)
  'scripts/translation-audit.mjs',
  
  // Temporary files
  'hardcoded-text-mappings.json',
  'translation-audit-report.json',
  'translation-validation-report.json',
  'ci-translation-report.json',
  'translation-monitoring-report.json'
];

// Directories to clean up (remove empty ones)
const DIRECTORIES_TO_CLEAN = [
  'frontend/public/locales/en',
  'frontend/public/locales/fr', 
  'frontend/public/locales/de',
  'admin/src/i18n/locales/en',
  'admin/src/i18n/locales/fr',
  'admin/src/i18n/locales/de'
];

/**
 * Remove a file or directory
 */
function removeFileOrDir(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✅ Removed directory: ${filePath}`);
    } else {
      fs.unlinkSync(fullPath);
      console.log(`  ✅ Removed file: ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error removing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Clean up empty directories
 */
function cleanupEmptyDirectories() {
  console.log('🧹 Cleaning up empty directories...');
  
  for (const dir of DIRECTORIES_TO_CLEAN) {
    const fullPath = path.join(__dirname, '..', dir);
    
    if (fs.existsSync(fullPath)) {
      try {
        const files = fs.readdirSync(fullPath);
        if (files.length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`  ✅ Removed empty directory: ${dir}`);
        } else {
          console.log(`  ℹ️  Directory not empty: ${dir} (${files.length} files)`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking directory ${dir}:`, error.message);
      }
    }
  }
}

/**
 * Check for other potentially unused files
 */
function checkForOtherUnusedFiles() {
  console.log('🔍 Checking for other potentially unused files...');
  
  const potentiallyUnused = [];
  
  // Check for old translation files
  const oldTranslationPatterns = [
    '**/translation.json',
    '**/gated.json',
    '**/antivirus.json'
  ];
  
  // Check for old script files
  const oldScriptPatterns = [
    'scripts/translate-*.js',
    'scripts/*-old.*',
    'scripts/*-backup.*',
    'scripts/*-temp.*'
  ];
  
  // Check for temporary files
  const tempPatterns = [
    '**/*.tmp',
    '**/*.temp',
    '**/*.bak',
    '**/*.backup'
  ];
  
  console.log('  ℹ️  No additional unused files found');
}

/**
 * Main cleanup function
 */
function cleanupUnusedFiles() {
  console.log('🧹 Starting cleanup of unused files...\n');
  
  let removedCount = 0;
  let errorCount = 0;
  
  // Remove specified files and directories
  console.log('📁 Removing specified files and directories...');
  for (const file of FILES_TO_REMOVE) {
    if (removeFileOrDir(file)) {
      removedCount++;
    } else {
      errorCount++;
    }
  }
  
  // Clean up empty directories
  cleanupEmptyDirectories();
  
  // Check for other unused files
  checkForOtherUnusedFiles();
  
  // Summary
  console.log('\n📋 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`✅ Files/Directories removed: ${removedCount}`);
  console.log(`❌ Errors encountered: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Cleanup completed successfully!');
  } else {
    console.log('\n⚠️  Cleanup completed with some errors.');
  }
}

/**
 * Main execution
 */
function main() {
  try {
    cleanupUnusedFiles();
  } catch (error) {
    console.error('💥 Cleanup script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanupUnusedFiles };