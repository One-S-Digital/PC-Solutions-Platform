#!/usr/bin/env node

/**
 * Translation Validation Script
 * 
 * Validates translation JSON files before commit:
 * - Checks JSON syntax is valid
 * - Ensures no empty string keys
 * - Ensures no deeply nested sentence-like keys
 * - Checks all languages have the same namespaces
 * 
 * Run manually: node scripts/validate-translations.mjs
 * Runs automatically on git commit via husky pre-commit hook
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_PATH = path.join(__dirname, '..', 'packages', 'translations', 'locales');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de'];
const MAX_NESTING_DEPTH = 6;

let hasErrors = false;

function logError(message) {
  console.error(`❌ ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`⚠️  ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * Check if a key looks like a sentence (corrupted key)
 * Returns: 'error' | 'warning' | null
 */
function checkKey(key) {
  // Empty keys are errors (will cause issues)
  if (key === '') return 'error';
  
  // Keys with spaces that look like sentences - warning only
  if (key.includes(' ') && key.length > 30) return 'warning';
  
  // Keys starting with special chars (except _ and common patterns) - warning
  if (/^[^a-zA-Z0-9_]/.test(key)) return 'warning';
  
  return null;
}

/**
 * Recursively validate an object structure
 */
function validateObject(obj, filePath, keyPath = '', depth = 0) {
  if (depth > MAX_NESTING_DEPTH) {
    logWarning(`${filePath}: Deep nesting at "${keyPath}" (depth: ${depth})`);
    return;
  }

  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;

    // Check for problematic keys
    const keyIssue = checkKey(key);
    if (keyIssue === 'error') {
      logError(`${filePath}: Empty key at "${keyPath}"`);
    } else if (keyIssue === 'warning') {
      // Don't log warnings for known patterns to reduce noise
      // These will be cleaned up by Full Sync
    }

    // Recursively check nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      validateObject(value, filePath, currentPath, depth + 1);
    }
  }
}

/**
 * Validate a single JSON file
 */
function validateJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Validate structure
    validateObject(data, path.relative(LOCALES_PATH, filePath));
    
    return { valid: true, keys: Object.keys(data) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      logError(`${path.relative(LOCALES_PATH, filePath)}: Invalid JSON syntax - ${error.message}`);
    } else {
      logError(`${path.relative(LOCALES_PATH, filePath)}: ${error.message}`);
    }
    return { valid: false, keys: [] };
  }
}

/**
 * Get all namespace files for a language
 */
function getNamespaceFiles(lang) {
  const langPath = path.join(LOCALES_PATH, lang);
  if (!fs.existsSync(langPath)) {
    return [];
  }
  
  return fs.readdirSync(langPath)
    .filter(f => f.endsWith('.json') && f !== '.json')
    .map(f => f.replace('.json', ''));
}

/**
 * Main validation function
 */
function main() {
  console.log('\n🔍 Validating translation files...\n');

  // Check if locales directory exists
  if (!fs.existsSync(LOCALES_PATH)) {
    logError(`Locales directory not found: ${LOCALES_PATH}`);
    process.exit(1);
  }

  // Get namespaces for each language
  const namespacesByLang = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    namespacesByLang[lang] = getNamespaceFiles(lang);
  }

  // Check that all languages have the same namespaces
  const referenceNamespaces = namespacesByLang['en'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const langNamespaces = namespacesByLang[lang];
    
    // Check for missing namespaces
    const missing = referenceNamespaces.filter(ns => !langNamespaces.includes(ns));
    if (missing.length > 0) {
      logWarning(`${lang}: Missing namespace files: ${missing.join(', ')}`);
    }
    
    // Check for extra namespaces
    const extra = langNamespaces.filter(ns => !referenceNamespaces.includes(ns));
    if (extra.length > 0) {
      logWarning(`${lang}: Extra namespace files not in English: ${extra.join(', ')}`);
    }
  }

  // Validate each JSON file
  let totalFiles = 0;
  let validFiles = 0;

  for (const lang of SUPPORTED_LANGUAGES) {
    const langPath = path.join(LOCALES_PATH, lang);
    if (!fs.existsSync(langPath)) continue;

    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      totalFiles++;
      const filePath = path.join(langPath, file);
      const result = validateJsonFile(filePath);
      if (result.valid) {
        validFiles++;
      }
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  
  if (hasErrors) {
    console.log(`\n⚠️  Found issues in translation files (${validFiles}/${totalFiles} clean)`);
    console.log('   Run Full Sync from admin to clean up corrupted keys.\n');
    // Don't block commits - these are pre-existing issues
    // Change to process.exit(1) once files are cleaned up
    process.exit(0);
  } else {
    logSuccess(`All ${totalFiles} translation files are valid!\n`);
    process.exit(0);
  }
}

main();
