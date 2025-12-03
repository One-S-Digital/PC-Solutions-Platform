#!/usr/bin/env node

/**
 * Sync Translation Keys to All Languages
 * 
 * Ensures FR and DE have the same keys as EN
 * Adds missing keys with [FR] or [DE] prefix for manual translation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales');

const namespaces = ['common', 'auth', 'dashboard', 'pricing', 'admin', 'marketplace', 'recruitment', 'content', 'users', 'settings', 'messages', 'signup', 'parentLeadForm', 'profile'];
const languages = ['en', 'fr', 'de'];

function getAllKeys(obj, prefix = '') {
  const keys = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(keys, getAllKeys(value, fullKey));
    } else {
      keys[fullKey] = value;
    }
  }
  
  return keys;
}

function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

console.log('🔄 Syncing Translation Keys Across Languages\n');

namespaces.forEach(ns => {
  console.log(`📝 Processing ${ns}...`);
  
  // Load English (source)
  const enFile = path.join(TRANSLATIONS_DIR, 'en', `${ns}.json`);
  const enContent = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const enKeys = getAllKeys(enContent);
  
  // Process French
  const frFile = path.join(TRANSLATIONS_DIR, 'fr', `${ns}.json`);
  const frContent = fs.existsSync(frFile) ? JSON.parse(fs.readFileSync(frFile, 'utf8')) : {};
  const frKeys = getAllKeys(frContent);
  
  let frAdded = 0;
  Object.entries(enKeys).forEach(([key, value]) => {
    if (!frKeys[key]) {
      setNestedValue(frContent, key, `[FR] ${value}`);
      frAdded++;
    }
  });
  
  fs.writeFileSync(frFile, JSON.stringify(frContent, null, 2) + '\n');
  console.log(`  ✅ French: Added ${frAdded} missing keys`);
  
  // Process German
  const deFile = path.join(TRANSLATIONS_DIR, 'de', `${ns}.json`);
  const deContent = fs.existsSync(deFile) ? JSON.parse(fs.readFileSync(deFile, 'utf8')) : {};
  const deKeys = getAllKeys(deContent);
  
  let deAdded = 0;
  Object.entries(enKeys).forEach(([key, value]) => {
    if (!deKeys[key]) {
      setNestedValue(deContent, key, `[DE] ${value}`);
      deAdded++;
    }
  });
  
  fs.writeFileSync(deFile, JSON.stringify(deContent, null, 2) + '\n');
  console.log(`  ✅ German: Added ${deAdded} missing keys\n`);
});

console.log('✅ All languages synced!');
console.log('\n💡 Keys added with [FR] and [DE] prefixes');
console.log('   These should be properly translated by a native speaker');
console.log('\n🔍 Verify: node scripts/find-missing-keys-in-code.mjs');
