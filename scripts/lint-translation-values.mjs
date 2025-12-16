#!/usr/bin/env node

/**
 * Translation Quality Linting Script
 * 
 * Scans translation JSON files for quality issues:
 * - Placeholder translations ([FR], [DE], [EN])
 * - TODO: placeholders (case-insensitive)
 * - Mixed-language values (e.g., "Voir profile", "Alle contract types")
 * - Missing interpolation placeholders (if EN has {{placeholder}}, FR/DE must have it too)
 * 
 * Run manually: node scripts/lint-translation-values.mjs
 * Runs automatically on git commit via husky pre-commit hook
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_PATH = path.join(__dirname, '..', 'packages', 'translations', 'locales');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de'];
const REFERENCE_LANGUAGE = 'en';

let hasErrors = false;
const errors = [];

/**
 * Extract all interpolation placeholders from a string
 */
function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{\{(\w+)\}\}/g);
  return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
}

/**
 * Check if a value contains placeholder markers
 */
function hasPlaceholderMarker(value) {
  if (typeof value !== 'string') return false;
  return /\[FR\]|\[DE\]|\[EN\]/i.test(value);
}

/**
 * Check if a value contains TODO
 */
function hasTodoMarker(value) {
  if (typeof value !== 'string') return false;
  return /todo:/i.test(value);
}

/**
 * Detect if a string contains mixed languages
 * This is a heuristic - looks for common patterns of mixed languages
 */
function isMixedLanguage(value) {
  if (typeof value !== 'string') return false;
  
  const str = value.toLowerCase();
  
  // Common French words that shouldn't appear with English
  const frenchWords = ['voir', 'voir le', 'voir la', 'voir les', 'tous', 'toutes', 'dans', 'sur', 'avec', 'pour', 'sans'];
  // Common German words that shouldn't appear with English
  const germanWords = ['alle', 'anzeigen', 'profil', 'und', 'oder', 'mit', 'ohne', 'für', 'auf', 'in'];
  // Common English words that shouldn't appear in translations
  const englishWords = ['profile', 'and', 'products', 'contract', 'types', 'region', 'all', 'view', 'show', 'display'];
  
  // Check for French + English mix
  const hasFrench = frenchWords.some(word => str.includes(word));
  const hasEnglish = englishWords.some(word => str.includes(word));
  if (hasFrench && hasEnglish) {
    // But allow if it's a proper French translation (e.g., "Voir le profil et les produits")
    // Check if it's mostly French structure
    const frenchStructure = /^(voir|tous|toutes|dans|sur|avec|pour|sans)\s+/.test(str);
    if (!frenchStructure && hasEnglish) {
      return true;
    }
  }
  
  // Check for German + English mix
  const hasGerman = germanWords.some(word => str.includes(word));
  if (hasGerman && hasEnglish) {
    // But allow if it's a proper German translation
    // Check if it's mostly German structure
    const germanStructure = /^(alle|anzeigen|profil|und|oder|mit|ohne|für|auf|in)\s+/.test(str);
    if (!germanStructure && hasEnglish) {
      return true;
    }
  }
  
  // More specific patterns
  // Pattern: "French word" + "English word" (e.g., "Voir profile", "Tous contract types")
  if (/^(voir|tous|toutes|dans|sur|avec|pour|sans)\s+(profile|and|products|contract|types|region|all|view|show|display)/i.test(str)) {
    return true;
  }
  
  // Pattern: "German word" + "English word" (e.g., "Alle contract types", "Anzeigen profile")
  if (/^(alle|anzeigen|profil|und|oder|mit|ohne|für|auf|in)\s+(profile|and|products|contract|types|region|all|view|show|display)/i.test(str)) {
    return true;
  }
  
  return false;
}

/**
 * Recursively scan an object for translation issues
 */
function scanObject(obj, filePath, keyPath = '', language = 'en') {
  if (typeof obj === 'string') {
    const value = obj;
    
    // Check for placeholder markers
    if (hasPlaceholderMarker(value)) {
      errors.push({
        type: 'placeholder_marker',
        file: filePath,
        keyPath: keyPath,
        value: value,
        language: language
      });
      hasErrors = true;
    }
    
    // Check for TODO markers
    if (hasTodoMarker(value)) {
      errors.push({
        type: 'todo_marker',
        file: filePath,
        keyPath: keyPath,
        value: value,
        language: language
      });
      hasErrors = true;
    }
    
    // Check for mixed languages (skip for English)
    if (language !== 'en' && isMixedLanguage(value)) {
      errors.push({
        type: 'mixed_language',
        file: filePath,
        keyPath: keyPath,
        value: value,
        language: language
      });
      hasErrors = true;
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanObject(item, filePath, `${keyPath}[${index}]`, language);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      scanObject(value, filePath, currentPath, language);
    }
  }
}

/**
 * Build a nested key map from translation objects
 */
function buildKeyMap(obj, prefix = '') {
  const map = new Map();
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        map.set(fullKey, value);
      } else if (typeof value === 'object' && value !== null) {
        const nested = buildKeyMap(value, fullKey);
        nested.forEach((val, k) => map.set(k, val));
      }
    }
  }
  
  return map;
}

/**
 * Check interpolation placeholder consistency
 */
function checkInterpolationConsistency() {
  const enPath = path.join(LOCALES_PATH, REFERENCE_LANGUAGE);
  if (!fs.existsSync(enPath)) {
    console.error(`❌ Reference language directory not found: ${enPath}`);
    return;
  }
  
  // Get all namespace files
  const namespaceFiles = fs.readdirSync(enPath)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  for (const namespace of namespaceFiles) {
    const enFile = path.join(enPath, `${namespace}.json`);
    const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    const enMap = buildKeyMap(enData);
    
    // Check each translation language
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === REFERENCE_LANGUAGE) continue;
      
      const langFile = path.join(LOCALES_PATH, lang, `${namespace}.json`);
      if (!fs.existsSync(langFile)) continue;
      
      const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
      const langMap = buildKeyMap(langData);
      
      // Check each key in English
      enMap.forEach((enValue, key) => {
        const enPlaceholders = extractPlaceholders(enValue);
        
        if (enPlaceholders.length > 0) {
          const langValue = langMap.get(key);
          
          if (langValue) {
            const langPlaceholders = extractPlaceholders(langValue);
            
            // Check if all English placeholders exist in the translation
            for (const placeholder of enPlaceholders) {
              if (!langPlaceholders.includes(placeholder)) {
                errors.push({
                  type: 'missing_interpolation',
                  file: `${lang}/${namespace}.json`,
                  keyPath: key,
                  value: langValue,
                  language: lang,
                  missingPlaceholder: placeholder,
                  expectedPlaceholders: enPlaceholders,
                  actualPlaceholders: langPlaceholders
                });
                hasErrors = true;
              }
            }
          }
        }
      });
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n🔍 Linting translation values for quality issues...\n');
  
  // Check if locales directory exists
  if (!fs.existsSync(LOCALES_PATH)) {
    console.error(`❌ Locales directory not found: ${LOCALES_PATH}`);
    process.exit(1);
  }
  
  // Scan all translation files
  for (const lang of SUPPORTED_LANGUAGES) {
    const langPath = path.join(LOCALES_PATH, lang);
    if (!fs.existsSync(langPath)) continue;
    
    const files = fs.readdirSync(langPath)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(langPath, f));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(content);
        const relativePath = path.relative(LOCALES_PATH, file);
        
        scanObject(data, relativePath, '', lang);
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error(`❌ ${path.relative(LOCALES_PATH, file)}: Invalid JSON - ${error.message}`);
          hasErrors = true;
        } else {
          console.error(`❌ Error reading ${file}: ${error.message}`);
          hasErrors = true;
        }
      }
    }
  }
  
  // Check interpolation placeholder consistency
  checkInterpolationConsistency();
  
  // Report results
  if (hasErrors) {
    // Group by type
    const byType = {
      placeholder_marker: [],
      todo_marker: [],
      mixed_language: [],
      missing_interpolation: []
    };
    
    errors.forEach(err => {
      byType[err.type].push(err);
    });
    
    // Only BLOCK on critical issues (missing interpolation placeholders)
    // Report but don't block on quality issues (placeholder markers, mixed languages)
    const blockingIssues = byType.missing_interpolation.length;
    const nonBlockingIssues = byType.placeholder_marker.length + byType.todo_marker.length + byType.mixed_language.length;
    
    if (blockingIssues > 0 || nonBlockingIssues > 0) {
      console.error(`\n⚠️  Found ${errors.length} translation quality issue(s):\n`);
    }
    
    // Report placeholder markers (non-blocking)
    if (byType.placeholder_marker.length > 0) {
      console.error(`\n⚠️  Placeholder Markers ([FR], [DE], [EN]) - ${byType.placeholder_marker.length} found (reported only, NOT blocking):\n`);
      // Only show first 5 to avoid spam
      byType.placeholder_marker.slice(0, 5).forEach(err => {
        const valuePreview = err.value.length > 60 
          ? err.value.substring(0, 60) + '...' 
          : err.value;
        console.error(`   📄 ${err.file}`);
        console.error(`      Key: ${err.keyPath}`);
        console.error(`      Value: "${valuePreview}"`);
        console.error('');
      });
      if (byType.placeholder_marker.length > 5) {
        console.error(`   ... and ${byType.placeholder_marker.length - 5} more placeholder marker issues\n`);
      }
    }
    
    // Report TODO markers (non-blocking)
    if (byType.todo_marker.length > 0) {
      console.error(`\n⚠️  TODO Markers - ${byType.todo_marker.length} found (reported only, NOT blocking):\n`);
      byType.todo_marker.slice(0, 5).forEach(err => {
        const valuePreview = err.value.length > 60 
          ? err.value.substring(0, 60) + '...' 
          : err.value;
        console.error(`   📄 ${err.file}`);
        console.error(`      Key: ${err.keyPath}`);
        console.error(`      Value: "${valuePreview}"`);
        console.error('');
      });
      if (byType.todo_marker.length > 5) {
        console.error(`   ... and ${byType.todo_marker.length - 5} more TODO marker issues\n`);
      }
    }
    
    // Report mixed languages (non-blocking)
    if (byType.mixed_language.length > 0) {
      console.error(`\n⚠️  Mixed Language Values - ${byType.mixed_language.length} found (reported only, NOT blocking):\n`);
      byType.mixed_language.slice(0, 5).forEach(err => {
        const valuePreview = err.value.length > 60 
          ? err.value.substring(0, 60) + '...' 
          : err.value;
        console.error(`   📄 ${err.file}`);
        console.error(`      Key: ${err.keyPath}`);
        console.error(`      Value: "${valuePreview}"`);
        console.error(`      Language: ${err.language}`);
        console.error('');
      });
      if (byType.mixed_language.length > 5) {
        console.error(`   ... and ${byType.mixed_language.length - 5} more mixed-language issues\n`);
      }
    }
    
    // Report missing interpolation (BLOCKING - critical)
    if (byType.missing_interpolation.length > 0) {
      console.error(`\n❌ Missing Interpolation Placeholders - ${byType.missing_interpolation.length} found (BLOCKING):\n`);
      byType.missing_interpolation.forEach(err => {
        const valuePreview = err.value.length > 60 
          ? err.value.substring(0, 60) + '...' 
          : err.value;
        console.error(`   📄 ${err.file}`);
        console.error(`      Key: ${err.keyPath}`);
        console.error(`      Value: "${valuePreview}"`);
        console.error(`      Missing: {{${err.missingPlaceholder}}}`);
        console.error(`      Expected: ${err.expectedPlaceholders.map(p => `{{${p}}}`).join(', ')}`);
        console.error(`      Actual: ${err.actualPlaceholders.map(p => `{{${p}}}`).join(', ') || 'none'}`);
        console.error('');
      });
      console.error('💡 Fix missing interpolation placeholders before committing.\n');
      process.exit(1);
    }
    
    // Only quality issues (non-blocking)
    if (nonBlockingIssues > 0) {
      console.error('💡 Quality issues (placeholder markers, mixed languages) are reported but do not block commits.\n');
      console.error('   Fix them incrementally when working in those files.\n');
      process.exit(0);
    }
  } else {
    console.log('✅ No translation quality issues found!\n');
    process.exit(0);
  }
}

main();

