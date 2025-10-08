#!/usr/bin/env node

/**
 * Consolidate All Translations into packages/translations
 * 
 * Merges frontend + admin translations into a single source of truth
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public', 'locales');
const ADMIN_DIR = path.join(__dirname, '..', 'admin', 'src', 'i18n', 'locales');
const PACKAGES_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales');

function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    } else {
      // Prefer source value if different
      output[key] = source[key];
    }
  }
  
  return output;
}

function consolidateNamespace(namespace, language) {
  let consolidated = {};
  
  // Start with packages (if exists)
  const packagesFile = path.join(PACKAGES_DIR, language, `${namespace}.json`);
  if (fs.existsSync(packagesFile)) {
    const content = JSON.parse(fs.readFileSync(packagesFile, 'utf8'));
    consolidated = deepMerge(consolidated, content);
  }
  
  // Merge admin (if exists)
  const adminFile = path.join(ADMIN_DIR, language, `${namespace}.json`);
  if (fs.existsSync(adminFile)) {
    const content = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
    consolidated = deepMerge(consolidated, content);
  }
  
  // Merge frontend (if exists) - frontend takes precedence
  const frontendFile = path.join(FRONTEND_DIR, language, `${namespace}.json`);
  if (fs.existsSync(frontendFile)) {
    const content = JSON.parse(fs.readFileSync(frontendFile, 'utf8'));
    consolidated = deepMerge(consolidated, content);
  }
  
  return consolidated;
}

async function main() {
  console.log('🔄 Consolidating Translations\n');
  
  const languages = ['en', 'fr', 'de'];
  const namespaces = ['common', 'auth', 'dashboard', 'pricing'];
  
  let totalKeys = 0;
  
  for (const lang of languages) {
    console.log(`📁 Processing: ${lang.toUpperCase()}`);
    
    // Ensure directory exists
    const langDir = path.join(PACKAGES_DIR, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }
    
    for (const ns of namespaces) {
      const consolidated = consolidateNamespace(ns, lang);
      const keyCount = JSON.stringify(consolidated).split('"').length;
      totalKeys += keyCount;
      
      // Write consolidated file
      const outputFile = path.join(PACKAGES_DIR, lang, `${ns}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(consolidated, null, 2) + '\n');
      
      console.log(`  ✅ ${ns}.json - ${keyCount} entries`);
    }
    console.log('');
  }
  
  console.log(`✅ Consolidation complete!`);
  console.log(`📊 Total entries processed: ${totalKeys}`);
  console.log(`📂 Output: ${PACKAGES_DIR}`);
  console.log(`\n💡 Next: Run validation with: node scripts/validate-translations.mjs`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
