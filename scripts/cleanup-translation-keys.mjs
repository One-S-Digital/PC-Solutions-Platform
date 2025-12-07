#!/usr/bin/env node

/**
 * Cleanup Translation Keys Script
 * 
 * Fixes corrupted translation keys:
 * - Removes empty string keys ("")
 * - Flattens sentence-like nested structures
 * - Removes duplicate keys (keeps the properly nested one)
 * - Fixes deep nesting issues
 * 
 * Run: node scripts/cleanup-translation-keys.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_PATH = path.join(__dirname, '..', 'packages', 'translations', 'locales');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de'];
const MAX_NESTING_DEPTH = 6;

let cleanedCount = 0;
let removedCount = 0;

/**
 * Check if a key looks like a sentence (should be flattened)
 */
function isSentenceLikeKey(key) {
  if (!key || key === '') return false;
  // Keys with spaces and length > 20 that look like sentences
  return key.includes(' ') && key.length > 20 && /^[A-Z]/.test(key.trim());
}

/**
 * Check if a key is empty
 */
function isEmptyKey(key) {
  return key === '';
}

/**
 * Recursively clean an object, removing empty keys and flattening corrupted structures
 */
function cleanObject(obj, filePath, keyPath = '', depth = 0, stats = { cleaned: 0, removed: 0 }, allKeys = new Set()) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;

    // Remove empty keys
    if (isEmptyKey(key)) {
      stats.removed++;
      removedCount++;
      console.log(`  ❌ Removing empty key at "${keyPath}"`);
      continue;
    }

    // Handle sentence-like keys that have empty string children (corrupted structure)
    if (isSentenceLikeKey(key) && typeof value === 'object' && value !== null) {
      // Check if this structure has an empty key with a value (corrupted pattern)
      const hasEmptyKeyWithValue = value[''] && typeof value[''] === 'string';
      
      if (hasEmptyKeyWithValue) {
        // This is definitely corrupted - remove it
        // The proper key should exist elsewhere (e.g., in "order.cannotSubmitMissingInfo")
        stats.removed++;
        removedCount++;
        console.log(`  🗑️  Removing corrupted sentence-like key "${currentPath}" (has empty key child)`);
        continue;
      }
      
      // Also check for deeply nested sentence structures
      const hasOnlySentenceChildren = Object.keys(value).every(k => isSentenceLikeKey(k));
      if (hasOnlySentenceChildren) {
        stats.removed++;
        removedCount++;
        console.log(`  🗑️  Removing corrupted nested sentence structure "${currentPath}"`);
        continue;
      }
    }

    // Handle deep nesting - check before recursing
    if (depth >= MAX_NESTING_DEPTH && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Try to extract the actual string value from deep nesting
      const extracted = extractStringFromDeepObject(value);
      if (extracted) {
        cleaned[key] = extracted;
        stats.cleaned++;
        cleanedCount++;
        console.log(`  ✅ Flattened deep nesting at "${currentPath}" (depth: ${depth + 1})`);
        continue;
      } else {
        // Can't extract - remove the deep nesting
        stats.removed++;
        removedCount++;
        console.log(`  🗑️  Removing deep nesting at "${currentPath}" (depth: ${depth + 1}, no extractable value)`);
        continue;
      }
    }

    // Recursively clean nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const cleanedValue = cleanObject(value, filePath, currentPath, depth + 1, stats, allKeys);
      if (cleanedValue && typeof cleanedValue === 'object' && Object.keys(cleanedValue).length > 0) {
        cleaned[key] = cleanedValue;
      } else if (typeof cleanedValue === 'string') {
        // If cleaning resulted in a string, keep it
        cleaned[key] = cleanedValue;
      }
    } else {
      // Leaf value - keep as is
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Extract string value from deeply nested object
 */
function extractStringFromDeepObject(obj, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return null;
  }
  
  // Look for empty key with string value (common corrupted pattern)
  if (obj[''] && typeof obj[''] === 'string') {
    return obj[''];
  }
  
  // If object has only one key with a string value, extract it
  const entries = Object.entries(obj);
  if (entries.length === 1) {
    const [singleKey, singleValue] = entries[0];
    if (typeof singleValue === 'string') {
      return singleValue;
    }
    // Recursively search the single nested object
    return extractStringFromDeepObject(singleValue, maxDepth, currentDepth + 1);
  }
  
  // If all values are strings, return the first one (heuristic)
  const allStrings = entries.every(([_, v]) => typeof v === 'string');
  if (allStrings && entries.length > 0) {
    return entries[0][1];
  }
  
  return null;
}

/**
 * Flatten a deeply nested object to find string values
 */
function flattenDeepObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenDeepObject(value, fullKey));
    }
  }
  return result;
}

/**
 * Remove duplicate keys - if a key exists both at root and inside a namespace, keep the nested one
 */
function removeDuplicateKeys(obj, namespace = '') {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  const cleaned = {};
  const seenKeys = new Set();

  // First pass: collect all keys from nested namespaces
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // This might be a namespace - collect its keys
      for (const nestedKey of Object.keys(value)) {
        seenKeys.add(nestedKey);
      }
    }
  }

  // Second pass: remove duplicates
  for (const [key, value] of Object.entries(obj)) {
    // If this key exists both at root and in a namespace, prefer the nested one
    if (seenKeys.has(key) && namespace === '') {
      // This is a duplicate at root level - skip it
      continue;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = removeDuplicateKeys(value, key);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Clean a single JSON file
 */
function cleanJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const stats = { cleaned: 0, removed: 0 };
    
    // Step 1: Clean empty keys and corrupted structures
    let cleaned = cleanObject(data, filePath, '', 0, stats);
    
    // Step 2: Remove duplicate keys (prefer nested over root)
    cleaned = removeDuplicateKeys(cleaned);
    
    // Write back if changes were made
    if (stats.cleaned > 0 || stats.removed > 0) {
      const newContent = JSON.stringify(cleaned, null, 2) + '\n';
      fs.writeFileSync(filePath, newContent, 'utf8');
      return { 
        success: true, 
        cleaned: stats.cleaned, 
        removed: stats.removed 
      };
    }
    
    return { success: true, cleaned: 0, removed: 0 };
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n🧹 Cleaning translation files...\n');

  if (!fs.existsSync(LOCALES_PATH)) {
    console.error(`❌ Locales directory not found: ${LOCALES_PATH}`);
    process.exit(1);
  }

  let totalFiles = 0;
  let cleanedFiles = 0;
  let totalCleaned = 0;
  let totalRemoved = 0;

  for (const lang of SUPPORTED_LANGUAGES) {
    const langPath = path.join(LOCALES_PATH, lang);
    if (!fs.existsSync(langPath)) continue;

    const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      totalFiles++;
      const filePath = path.join(langPath, file);
      const relativePath = path.relative(LOCALES_PATH, filePath);
      
      console.log(`📄 Processing ${relativePath}...`);
      const result = cleanJsonFile(filePath);
      
      if (result.success) {
        if (result.cleaned > 0 || result.removed > 0) {
          cleanedFiles++;
          totalCleaned += result.cleaned;
          totalRemoved += result.removed;
          console.log(`  ✅ Cleaned: ${result.cleaned} keys, Removed: ${result.removed} keys\n`);
        } else {
          console.log(`  ✓ No issues found\n`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}\n`);
      }
    }
  }

  console.log('─'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files cleaned: ${cleanedFiles}`);
  console.log(`   Total keys cleaned: ${totalCleaned}`);
  console.log(`   Total keys removed: ${totalRemoved}`);
  console.log(`\n✅ Cleanup complete!\n`);
  
  if (totalRemoved > 0 || totalCleaned > 0) {
    console.log('💡 Run validation again: node scripts/validate-translations.mjs\n');
  }
}

main();

