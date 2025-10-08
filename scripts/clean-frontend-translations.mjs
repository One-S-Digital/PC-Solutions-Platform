#!/usr/bin/env node

/**
 * Clean Frontend Translation Files
 * 
 * Removes corrupted keys and self-referential values from frontend translation files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'public', 'locales');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', `frontend-translations-${new Date().toISOString().split('T')[0]}`);

// Invalid keys to remove
const INVALID_KEYS = [' ', ',', '-', '.', 'tailwindcss'];

// Check if value is self-referential
const isSelfReferential = (key, value, prefix = '') => {
  if (typeof value !== 'string') return false;
  const fullKey = prefix ? `${prefix}.${key}` : key;
  return value === fullKey || value === `[FR] ${fullKey}` || value === `[DE] ${fullKey}`;
};

// Recursively clean object
function cleanObject(obj, prefix = '') {
  const cleaned = {};
  let removedCount = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key should be removed
    if (INVALID_KEYS.includes(key)) {
      console.log(`  ❌ Removing invalid key: "${key}"`);
      removedCount++;
      continue;
    }
    
    // Check value
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively clean nested objects
      const [cleanedNested, nestedRemoved] = cleanObject(value, prefix ? `${prefix}.${key}` : key);
      
      // Only include if it has content
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      } else {
        console.log(`  ❌ Removing empty object: "${key}"`);
        removedCount++;
      }
      removedCount += nestedRemoved;
    } else if (typeof value === 'string') {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (isSelfReferential(key, value, prefix)) {
        console.log(`  ❌ Removing self-referential: "${fullKey}": "${value}"`);
        removedCount++;
        continue;
      }
      
      // Keep valid string values
      cleaned[key] = value;
    } else {
      // Keep other types (arrays, numbers, etc.)
      cleaned[key] = value;
    }
  }
  
  return [cleaned, removedCount];
}

// Process a single file
function cleanTranslationFile(filePath, relativePath) {
  console.log(`\n📄 Processing: ${relativePath}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Clean the data
    const [cleaned, removedCount] = cleanObject(data);
    
    if (removedCount > 0) {
      // Create backup
      const backupPath = path.join(BACKUP_DIR, relativePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);
      
      // Write cleaned file
      fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n');
      
      console.log(`  ✅ Cleaned! Removed ${removedCount} invalid entries`);
      console.log(`  📦 Backup saved to: ${backupPath}`);
      
      return { removedCount, success: true };
    } else {
      console.log(`  ✅ No issues found`);
      return { removedCount: 0, success: true };
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { removedCount: 0, success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('🧹 Frontend Translation Cleaner');
  console.log('================================\n');
  
  if (!fs.existsSync(FRONTEND_LOCALES_DIR)) {
    console.log('❌ Frontend locales directory not found:', FRONTEND_LOCALES_DIR);
    process.exit(1);
  }
  
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Backup directory created: ${BACKUP_DIR}\n`);
  
  const languages = ['en', 'fr', 'de'];
  const namespaces = ['common', 'auth', 'dashboard', 'pricing'];
  
  let totalRemoved = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  
  for (const lang of languages) {
    for (const ns of namespaces) {
      const filePath = path.join(FRONTEND_LOCALES_DIR, lang, `${ns}.json`);
      const relativePath = `${lang}/${ns}.json`;
      
      if (fs.existsSync(filePath)) {
        totalProcessed++;
        const result = cleanTranslationFile(filePath, relativePath);
        totalRemoved += result.removedCount;
        if (!result.success) totalErrors++;
      }
    }
  }
  
  console.log('\n\n📊 Summary');
  console.log('==========');
  console.log(`Files processed: ${totalProcessed}`);
  console.log(`Invalid entries removed: ${totalRemoved}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`\n✅ Cleanup complete!`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
