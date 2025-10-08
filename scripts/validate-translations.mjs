#!/usr/bin/env node

/**
 * Translation File Validator
 * 
 * Validates all translation files for:
 * - Invalid keys (punctuation, HTML tags, API paths)
 * - Self-referential values
 * - Missing translations
 * - Structure inconsistencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATION_SYSTEMS = [
  {
    name: 'Frontend',
    path: path.join(__dirname, '..', 'frontend', 'public', 'locales'),
    languages: ['en', 'fr', 'de'],
    namespaces: ['common', 'auth', 'dashboard', 'pricing']
  },
  {
    name: 'Admin',
    path: path.join(__dirname, '..', 'admin', 'src', 'i18n', 'locales'),
    languages: ['en', 'fr', 'de'],
    namespaces: ['common', 'auth', 'dashboard']
  },
  {
    name: 'Packages/Translations',
    path: path.join(__dirname, '..', 'packages', 'translations', 'locales'),
    languages: ['en', 'fr', 'de'],
    namespaces: ['common']
  }
];

// Validation rules
const INVALID_KEYS = [' ', ',', '-', '.', 'div', 'code', 'a', 'tailwindcss'];

function isAPIPath(key) {
  return key.startsWith('/api/') || key.startsWith('/');
}

function isNamespaceReference(key) {
  return key.includes(':');
}

function isSelfReferential(key, value, prefix = '') {
  if (typeof value !== 'string') return false;
  const fullKey = prefix ? `${prefix}.${key}` : key;
  return value === fullKey || value.endsWith(`.${key}`);
}

// Flatten nested object to get all keys
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, fullKey));
    } else {
      flattened[fullKey] = value;
    }
  }
  
  return flattened;
}

// Validate a single file
function validateFile(filePath) {
  const errors = [];
  const warnings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const flattened = flattenObject(data);
    
    // Check for invalid top-level keys
    for (const key of Object.keys(data)) {
      if (INVALID_KEYS.includes(key)) {
        errors.push(`Invalid key: "${key}"`);
      }
      
      if (isAPIPath(key)) {
        errors.push(`API path as key: "${key}"`);
      }
      
      if (isNamespaceReference(key)) {
        errors.push(`Namespace reference as key: "${key}"`);
      }
    }
    
    // Check for self-referential values
    for (const [key, value] of Object.entries(flattened)) {
      if (isSelfReferential(key.split('.').pop(), value, key.split('.').slice(0, -1).join('.'))) {
        errors.push(`Self-referential value: "${key}": "${value}"`);
      }
      
      // Check for placeholder text
      if (typeof value === 'string' && value.includes('TBD')) {
        warnings.push(`Placeholder text in "${key}": "${value}"`);
      }
    }
    
    // Check for empty values
    for (const [key, value] of Object.entries(flattened)) {
      if (value === '' || value === null || value === undefined) {
        warnings.push(`Empty value for key: "${key}"`);
      }
    }
    
    return { errors, warnings, keyCount: Object.keys(flattened).length };
    
  } catch (error) {
    return { 
      errors: [`Parse error: ${error.message}`], 
      warnings: [], 
      keyCount: 0 
    };
  }
}

// Compare keys across languages
function compareLanguages(system) {
  const issues = [];
  const languageKeys = {};
  
  for (const lang of system.languages) {
    for (const ns of system.namespaces) {
      const filePath = path.join(system.path, lang, `${ns}.json`);
      
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        const flattened = flattenObject(data);
        
        const key = `${lang}/${ns}`;
        languageKeys[key] = Object.keys(flattened).sort();
      } catch (error) {
        // Skip files with errors
      }
    }
  }
  
  // Compare each namespace across languages
  for (const ns of system.namespaces) {
    const enKey = `en/${ns}`;
    const frKey = `fr/${ns}`;
    const deKey = `de/${ns}`;
    
    if (!languageKeys[enKey] || !languageKeys[frKey] || !languageKeys[deKey]) continue;
    
    const enKeys = languageKeys[enKey];
    const frKeys = languageKeys[frKey];
    const deKeys = languageKeys[deKey];
    
    // Find missing keys
    const missingInFr = enKeys.filter(k => !frKeys.includes(k));
    const missingInDe = enKeys.filter(k => !deKeys.includes(k));
    const extraInFr = frKeys.filter(k => !enKeys.includes(k));
    const extraInDe = deKeys.filter(k => !enKeys.includes(k));
    
    if (missingInFr.length > 0) {
      issues.push(`${ns}: French missing ${missingInFr.length} keys from English`);
    }
    
    if (missingInDe.length > 0) {
      issues.push(`${ns}: German missing ${missingInDe.length} keys from English`);
    }
    
    if (extraInFr.length > 0) {
      issues.push(`${ns}: French has ${extraInFr.length} extra keys not in English`);
    }
    
    if (extraInDe.length > 0) {
      issues.push(`${ns}: German has ${extraInDe.length} extra keys not in English`);
    }
  }
  
  return issues;
}

// Main validation
async function main() {
  console.log('🔍 Translation File Validator');
  console.log('============================\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFiles = 0;
  
  for (const system of TRANSLATION_SYSTEMS) {
    console.log(`\n📁 ${system.name}`);
    console.log('─'.repeat(50));
    
    if (!fs.existsSync(system.path)) {
      console.log('  ⚠️  Directory not found\n');
      continue;
    }
    
    let systemErrors = 0;
    let systemWarnings = 0;
    
    // Validate each file
    for (const lang of system.languages) {
      for (const ns of system.namespaces) {
        const filePath = path.join(system.path, lang, `${ns}.json`);
        
        if (!fs.existsSync(filePath)) {
          console.log(`  ⚠️  ${lang}/${ns}.json - File missing`);
          continue;
        }
        
        totalFiles++;
        const result = validateFile(filePath);
        
        if (result.errors.length > 0 || result.warnings.length > 0) {
          console.log(`\n  📄 ${lang}/${ns}.json (${result.keyCount} keys)`);
          
          if (result.errors.length > 0) {
            console.log(`     ❌ ${result.errors.length} error(s):`);
            result.errors.slice(0, 5).forEach(err => {
              console.log(`        - ${err}`);
            });
            if (result.errors.length > 5) {
              console.log(`        ... and ${result.errors.length - 5} more`);
            }
            systemErrors += result.errors.length;
            totalErrors += result.errors.length;
          }
          
          if (result.warnings.length > 0) {
            console.log(`     ⚠️  ${result.warnings.length} warning(s):`);
            result.warnings.slice(0, 3).forEach(warn => {
              console.log(`        - ${warn}`);
            });
            if (result.warnings.length > 3) {
              console.log(`        ... and ${result.warnings.length - 3} more`);
            }
            systemWarnings += result.warnings.length;
            totalWarnings += result.warnings.length;
          }
        } else {
          console.log(`  ✅ ${lang}/${ns}.json (${result.keyCount} keys)`);
        }
      }
    }
    
    // Compare languages
    const comparisonIssues = compareLanguages(system);
    if (comparisonIssues.length > 0) {
      console.log(`\n  🔄 Language Consistency:`);
      comparisonIssues.forEach(issue => {
        console.log(`     ⚠️  ${issue}`);
      });
      totalWarnings += comparisonIssues.length;
    }
    
    console.log(`\n  Summary: ${systemErrors} errors, ${systemWarnings} warnings`);
  }
  
  // Final summary
  console.log('\n\n📊 Overall Summary');
  console.log('=================');
  console.log(`Files validated: ${totalFiles}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ Validation failed - Please fix errors before proceeding');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings - Consider addressing warnings');
    process.exit(0);
  } else {
    console.log('\n✅ All translation files are valid!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
