#!/usr/bin/env node

/**
 * Process i18n-missing-keys.json and add missing keys to locale files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read the missing keys file
const missingKeysPath = path.join(rootDir, 'i18n-missing-keys.json');
console.log('📖 Reading missing keys file...');
const missingKeysData = JSON.parse(fs.readFileSync(missingKeysPath, 'utf8'));

// Group missing keys by namespace and language
const grouped = {};

missingKeysData.details.forEach(({ language, missingKeys }) => {
  missingKeys.forEach(({ key, namespace }) => {
    if (!grouped[namespace]) {
      grouped[namespace] = {};
    }
    if (!grouped[namespace][language]) {
      grouped[namespace][language] = [];
    }
    if (!grouped[namespace][language].includes(key)) {
      grouped[namespace][language].push(key);
    }
  });
});

// Helper to set nested value in object
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// Helper to get nested value from object
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

// Generate English value from key path
function generateEnglishValue(key) {
  // Convert key path to human-readable text
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Common patterns
  if (lastPart.endsWith('Label')) {
    return lastPart.replace('Label', '').replace(/([A-Z])/g, ' $1').trim();
  }
  if (lastPart.endsWith('Placeholder')) {
    return `Enter ${lastPart.replace('Placeholder', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`;
  }
  if (lastPart.endsWith('Button') || lastPart.endsWith('Title')) {
    return lastPart.replace(/([A-Z])/g, ' $1').trim();
  }
  if (lastPart.endsWith('Message') || lastPart.endsWith('Text')) {
    return lastPart.replace(/([A-Z])/g, ' $1').trim() + '.';
  }
  
  // Default: capitalize and add spaces
  return lastPart.replace(/([A-Z])/g, ' $1').trim() || key;
}

// Process each namespace
const stats = {
  totalAdded: { en: 0, fr: 0, de: 0 },
  filesChanged: new Set(),
  errors: []
};

for (const [namespace, languages] of Object.entries(grouped)) {
  console.log(`\n📦 Processing namespace: ${namespace}`);
  
  for (const [language, keys] of Object.entries(languages)) {
    const localePath = path.join(rootDir, 'packages', 'translations', 'locales', language, `${namespace}.json`);
    
    // Check if file exists
    if (!fs.existsSync(localePath)) {
      console.log(`  ⚠️  File not found: ${localePath}`);
      stats.errors.push(`File not found: ${localePath}`);
      continue;
    }
    
    // Read existing locale file
    let localeData;
    try {
      localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    } catch (error) {
      console.log(`  ❌ Error reading ${localePath}: ${error.message}`);
      stats.errors.push(`Error reading ${localePath}: ${error.message}`);
      continue;
    }
    
    let added = 0;
    for (const key of keys) {
      // Check if key already exists
      if (getNestedValue(localeData, key) !== undefined) {
        continue; // Skip if already exists
      }
      
      // Generate value
      let value;
      if (language === 'en') {
        value = generateEnglishValue(key);
      } else {
        // For FR/DE, use TODO prefix with EN value
        const enValue = generateEnglishValue(key);
        value = `TODO: ${enValue}`;
      }
      
      // Add the key
      setNestedValue(localeData, key, value);
      added++;
    }
    
    if (added > 0) {
      // Write back to file (with proper formatting)
      const sortedData = sortObjectKeys(localeData);
      fs.writeFileSync(localePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      console.log(`  ✅ ${language}: Added ${added} keys`);
      stats.totalAdded[language] += added;
      stats.filesChanged.add(localePath);
    } else {
      console.log(`  ℹ️  ${language}: No new keys to add`);
    }
  }
}

// Helper to sort object keys recursively
function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`Total keys added - EN: ${stats.totalAdded.en}, FR: ${stats.totalAdded.fr}, DE: ${stats.totalAdded.de}`);
console.log(`\nFiles changed: ${stats.filesChanged.size}`);
stats.filesChanged.forEach(file => {
  console.log(`  - ${path.relative(rootDir, file)}`);
});

if (stats.errors.length > 0) {
  console.log(`\n⚠️  Errors: ${stats.errors.length}`);
  stats.errors.forEach(err => console.log(`  - ${err}`));
}

console.log('\n✅ Processing complete!');

