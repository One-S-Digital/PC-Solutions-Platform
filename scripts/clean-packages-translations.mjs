#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGES_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales');

function isSelfReferential(key, value, prefix = '') {
  if (typeof value !== 'string') return false;
  const fullKey = prefix ? `${prefix}.${key}` : key;
  const lowerValue = value.toLowerCase();
  const lowerKey = key.toLowerCase();
  
  // Check if value contains the key name (case-insensitive)
  return lowerValue.includes(lowerKey) && 
         (lowerValue.includes('modal') || lowerValue.includes('page') || 
          lowerValue.includes('form') || lowerValue.includes('.'));
}

function cleanObject(obj, prefix = '') {
  const cleaned = {};
  let removedCount = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const result = cleanObject(value, prefix ? `${prefix}.${key}` : key);
      if (Object.keys(result.cleaned).length > 0) {
        cleaned[key] = result.cleaned;
      } else {
        removedCount++;
      }
      removedCount += result.removedCount;
    } else if (typeof value === 'string') {
      if (isSelfReferential(key, value, prefix)) {
        console.log(`  ❌ Removing self-referential: ${prefix}.${key}: ${value.substring(0, 60)}...`);
        removedCount++;
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return { cleaned, removedCount };
}

console.log('🧹 Cleaning Packages/Translations\n');

const languages = ['en', 'fr', 'de'];
const namespaces = ['common', 'auth', 'dashboard', 'pricing'];

let totalRemoved = 0;

for (const lang of languages) {
  for (const ns of namespaces) {
    const filePath = path.join(PACKAGES_DIR, lang, `${ns}.json`);
    
    if (!fs.existsSync(filePath)) continue;
    
    console.log(`📄 Processing: ${lang}/${ns}.json`);
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const result = cleanObject(content);
    
    if (result.removedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(result.cleaned, null, 2) + '\n');
      console.log(`  ✅ Cleaned ${result.removedCount} errors\n`);
      totalRemoved += result.removedCount;
    } else {
      console.log(`  ✅ No issues found\n`);
    }
  }
}

console.log(`✅ Total self-referential values removed: ${totalRemoved}`);
console.log(`\n💡 Run validation: node scripts/validate-translations.mjs`);
