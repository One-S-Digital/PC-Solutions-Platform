#!/usr/bin/env ts-node
/**
 * Check for missing i18n keys across all languages
 * Compares keys used in code vs keys defined in translation files
 * 
 * Usage: ts-node scripts/check-i18n-keys.ts
 */

import fs from 'fs';
import path from 'path';

// Resolve paths from project root (works in CJS/TS-node)
const ROOT_DIR = path.resolve(process.cwd());
const LOCALES_DIR = path.join(ROOT_DIR, 'packages/translations/locales');
const USED_KEYS_FILE = path.join(ROOT_DIR, 'i18n-used-keys.json');

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

interface MissingKeysReport {
  timestamp: string;
  languages: string[];
  summary: {
    totalUsedKeys: number;
    totalDefinedKeys: Record<string, number>;
    missingKeys: Record<string, number>;
  };
  details: {
    language: string;
    missingKeys: Array<{
      key: string;
      namespace: string;
      usedIn: string[];
    }>;
  }[];
}

/**
 * Flatten nested translation objects
 */
function flattenKeys(obj: TranslationObject, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenKeys(value, newKey);
      nested.forEach(k => keys.add(k));
    } else {
      keys.add(newKey);
    }
  }
  
  return keys;
}

/**
 * Load all translation keys for a language
 */
function loadTranslationKeys(language: string): Map<string, Set<string>> {
  const langDir = path.join(LOCALES_DIR, language);
  const namespaceKeys = new Map<string, Set<string>>();

  if (!fs.existsSync(langDir)) {
    console.error(`❌ Language directory not found: ${langDir}`);
    return namespaceKeys;
  }

  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const namespace = file.replace('.json', '');
    const filePath = path.join(langDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const translations: TranslationObject = JSON.parse(content);
    
    namespaceKeys.set(namespace, flattenKeys(translations));
  }

  return namespaceKeys;
}

/**
 * Check for missing keys
 */
async function checkKeys(): Promise<void> {
  console.log('🔍 Checking for missing i18n keys...\n');

  // Load used keys
  if (!fs.existsSync(USED_KEYS_FILE)) {
    console.error(`❌ Error: Used keys file not found: ${USED_KEYS_FILE}`);
    console.log('💡 Run: npm run extract:i18n-keys first\n');
    process.exit(1);
  }

  const usedKeysData = JSON.parse(fs.readFileSync(USED_KEYS_FILE, 'utf8'));
  const usedKeys = usedKeysData.keys as Array<{ key: string; file: string }>;

  // Get list of languages
  const languages = fs.readdirSync(LOCALES_DIR)
    .filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());

  console.log(`📚 Languages: ${languages.join(', ')}\n`);

  const report: MissingKeysReport = {
    timestamp: new Date().toISOString(),
    languages,
    summary: {
      totalUsedKeys: new Set(usedKeys.map(k => k.key)).size,
      totalDefinedKeys: {},
      missingKeys: {},
    },
    details: [],
  };

  let hasErrors = false;

  // Check each language
  for (const lang of languages) {
    console.log(`🔎 Checking ${lang.toUpperCase()}...`);
    
    const translationKeys = loadTranslationKeys(lang);
    const missingKeys: Array<{ key: string; namespace: string; usedIn: string[] }> = [];

    // Count total defined keys
    let totalDefined = 0;
    translationKeys.forEach(keys => {
      totalDefined += keys.size;
    });
    report.summary.totalDefinedKeys[lang] = totalDefined;

    // Check each used key
    for (const { key, file } of usedKeys) {
      // Parse namespace and key
      let namespace = 'common';
      let keyPath = key;

      if (key.includes(':')) {
        [namespace, keyPath] = key.split(':', 2);
      }

      // Check if key exists
      const nsKeys = translationKeys.get(namespace);
      if (!nsKeys || !nsKeys.has(keyPath)) {
        // Check if this key is already in missing list
        const existing = missingKeys.find(
          m => m.key === keyPath && m.namespace === namespace
        );

        if (existing) {
          existing.usedIn.push(file);
        } else {
          missingKeys.push({
            key: keyPath,
            namespace,
            usedIn: [file],
          });
        }
      }
    }

    report.summary.missingKeys[lang] = missingKeys.length;
    report.details.push({
      language: lang,
      missingKeys,
    });

    if (missingKeys.length > 0) {
      console.log(`   ❌ ${missingKeys.length} missing keys`);
      hasErrors = true;
      
      // Show top 5 missing keys
      console.log('   Top missing keys:');
      missingKeys.slice(0, 5).forEach(({ key, namespace }) => {
        console.log(`      - ${namespace}:${key}`);
      });
      if (missingKeys.length > 5) {
        console.log(`      ... and ${missingKeys.length - 5} more`);
      }
    } else {
      console.log(`   ✅ All keys found`);
    }
    console.log();
  }

  // Save report
  const reportPath = path.join(ROOT_DIR, 'i18n-missing-keys.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📝 Report saved to: ${reportPath}\n`);

  // Print summary
  console.log('📊 Summary:');
  console.log(`   Total keys used in code: ${report.summary.totalUsedKeys}`);
  console.log('   Keys defined per language:');
  Object.entries(report.summary.totalDefinedKeys).forEach(([lang, count]) => {
    console.log(`      ${lang}: ${count}`);
  });
  console.log('   Missing keys per language:');
  Object.entries(report.summary.missingKeys).forEach(([lang, count]) => {
    const icon = count > 0 ? '❌' : '✅';
    console.log(`      ${icon} ${lang}: ${count}`);
  });

  if (hasErrors) {
    console.log('\n❌ Missing translation keys found!');
    console.log('💡 Add missing keys to respective namespace files\n');
    process.exit(1);
  } else {
    console.log('\n✅ All translation keys are present!\n');
  }
}

// Run check
checkKeys().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
