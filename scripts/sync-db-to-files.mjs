#!/usr/bin/env node

/**
 * Sync Database Translations to JSON Files
 * 
 * This script reads translations directly from the database (via Prisma)
 * and writes them to the JSON files that the frontend uses.
 * 
 * This is the missing link - the admin panel updates the database,
 * but the frontend reads from JSON files.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const localesPath = path.join(__dirname, '..', 'packages', 'translations', 'locales');

const languages = ['en', 'fr', 'de'];

/**
 * Convert flat keys to nested object
 * Example: { 'a.b.c': 'value' } => { a: { b: { c: 'value' } } }
 * 
 * IMPORTANT: This function:
 * 1. Only creates string leaf values (never objects with _value)
 * 2. Validates all values are strings
 * 3. Skips conflicting keys rather than creating corrupt structures
 */
function nestKeys(translations) {
  const result = {};
  
  // Build a set of all keys that have children (parent keys)
  const parentKeys = new Set();
  for (const { key } of translations) {
    const parts = key.split('.');
    for (let i = 1; i < parts.length; i++) {
      parentKeys.add(parts.slice(0, i).join('.'));
    }
  }
  
  // Sort by key length (longer first) so leaf nodes take precedence
  const sorted = [...translations].sort((a, b) => b.key.length - a.key.length);
  
  for (const { key, value } of sorted) {
    // Skip if this key is a parent of other keys (would cause object/string conflict)
    if (parentKeys.has(key)) {
      console.warn(`  ⚠️ Skipping parent key with value: ${key}`);
      continue;
    }
    
    // Validate value is a string
    if (typeof value !== 'string') {
      console.warn(`  ⚠️ Skipping non-string value for key: ${key} (type: ${typeof value})`);
      continue;
    }
    
    const parts = key.split('.');
    let current = result;
    let valid = true;
    
    // Navigate/create path to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      } else if (typeof current[part] !== 'object' || current[part] === null) {
        // Conflict: path is blocked by a string value
        console.warn(`  ⚠️ Skipping key due to path conflict: ${key}`);
        valid = false;
        break;
      }
      current = current[part];
    }
    
    if (valid) {
      const lastPart = parts[parts.length - 1];
      // Only set if not already an object (leaf nodes win)
      if (typeof current[lastPart] !== 'object') {
        current[lastPart] = value;
      }
    }
  }
  
  return result;
}

/**
 * Validate and clean the nested object to ensure no corrupt structures
 * Recursively ensures all leaf values are strings
 */
function validateAndClean(obj, path = '') {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Check for corrupt _value pattern
      if ('_value' in value || '0' in value || '1' in value) {
        // This is a corrupt entry - extract the best string value
        const cleanValue = value._value || value['1'] || value['0'] || '';
        if (typeof cleanValue === 'string' && cleanValue !== '0' && cleanValue !== '1') {
          result[key] = cleanValue;
          console.warn(`  🔧 Fixed corrupt structure at: ${fullPath}`);
        } else {
          console.warn(`  ⚠️ Removing corrupt entry: ${fullPath}`);
        }
      } else {
        // Recursively clean nested objects
        const cleaned = validateAndClean(value, fullPath);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      }
    }
    // Skip non-string, non-object values (numbers, booleans, etc.)
  }
  
  return result;
}

/**
 * Get all translations for a language from database
 */
async function getTranslationsFromDB(lang) {
  const translations = await prisma.staticTranslation.findMany({
    where: { lang },
    select: {
      namespace: true,
      key: true,
      value: true,
    },
    orderBy: [
      { namespace: 'asc' },
      { key: 'asc' },
    ],
  });
  
  return translations;
}

/**
 * Group translations by namespace
 */
function groupByNamespace(translations) {
  const grouped = {};
  
  for (const t of translations) {
    if (!grouped[t.namespace]) {
      grouped[t.namespace] = [];
    }
    grouped[t.namespace].push({ key: t.key, value: t.value });
  }
  
  return grouped;
}

/**
 * Write namespace to JSON file
 */
function writeNamespaceFile(lang, namespace, data) {
  const dir = path.join(localesPath, lang);
  const filePath = path.join(dir, `${namespace}.json`);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Convert flat keys to nested structure
  const nested = nestKeys(data);
  
  // Validate and clean to remove any corrupt structures
  const cleaned = validateAndClean(nested);
  
  // Write file with pretty formatting
  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
  
  return Object.keys(cleaned).length;
}

/**
 * Process one language
 */
async function processLanguage(lang) {
  console.log(`\n📥 Fetching ${lang.toUpperCase()} translations from database...`);
  
  const translations = await getTranslationsFromDB(lang);
  
  if (translations.length === 0) {
    console.log(`  ⚠️  No translations found for ${lang}`);
    return { count: 0, namespaces: 0 };
  }
  
  const grouped = groupByNamespace(translations);
  const namespaces = Object.keys(grouped);
  
  console.log(`  📦 Found ${namespaces.length} namespaces, ${translations.length} total translations`);
  
  let totalKeys = 0;
  for (const namespace of namespaces) {
    const keyCount = writeNamespaceFile(lang, namespace, grouped[namespace]);
    console.log(`    ✓ ${lang}/${namespace}.json (${grouped[namespace].length} keys)`);
    totalKeys += grouped[namespace].length;
  }
  
  return { count: totalKeys, namespaces: namespaces.length };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Syncing Database Translations to JSON Files\n');
  console.log(`📂 Output: ${localesPath}\n`);
  console.log('─'.repeat(80));
  
  try {
    let totalTranslations = 0;
    const results = {};
    
    for (const lang of languages) {
      const result = await processLanguage(lang);
      results[lang] = result;
      totalTranslations += result.count;
    }
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ Sync complete!\n');
    console.log('📊 Summary:');
    for (const [lang, result] of Object.entries(results)) {
      console.log(`   ${lang.toUpperCase()}: ${result.count} translations in ${result.namespaces} namespaces`);
    }
    console.log(`   Total: ${totalTranslations} translations\n`);
    
    console.log('📋 Next steps:');
    console.log('   1. Restart your frontend dev server (Ctrl+C then: pnpm dev)');
    console.log('   2. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('   3. Switch to French (FR) - translations should work!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();

