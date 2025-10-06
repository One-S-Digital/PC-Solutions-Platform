#!/usr/bin/env node

/**
 * Comprehensive Translation Verification Script
 * 
 * This script performs a complete analysis of translation coverage:
 * 1. Finds all t() calls in the code
 * 2. Verifies that all t() calls have corresponding translation keys
 * 3. Finds any hardcoded text that should be translated
 * 4. Reports missing translations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_SRC_DIR = path.join(__dirname, 'frontend');
const TRANSLATION_DIR = path.join(__dirname, 'frontend/public/locales');
const EXCLUDED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /node_modules/,
  /dist/,
  /build/,
];

// Load all translation files and create a flat key map
function loadAllTranslations() {
  const allKeys = new Set();
  const languages = ['en', 'fr', 'de'];
  
  for (const lang of languages) {
    const langDir = path.join(TRANSLATION_DIR, lang);
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(langDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        extractKeysFromObject(content, '', allKeys);
      }
    }
  }
  
  return Array.from(allKeys);
}

function extractKeysFromObject(obj, prefix, keys) {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractKeysFromObject(obj[key], fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

// Find all t() calls in the code
function findTranslationCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const calls = [];
  
  // Pattern to find t() calls
  const tCallPattern = /t\s*\(\s*["']([^"']+)["']/g;
  let match;
  
  while ((match = tCallPattern.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    calls.push({
      file: path.relative(process.cwd(), filePath),
      line: lineNumber,
      key: match[1],
      context: getContext(content, match.index)
    });
  }
  
  return calls;
}

// Find hardcoded text that should be translated
function findHardcodedText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // More comprehensive patterns for hardcoded text
  const patterns = [
    // JSX text content: >text<
    { regex: />\s*([^<>\n{}]+[a-zA-Z][^<>\n{}]*)\s*</g, type: 'JSX_TEXT' },
    // String literals in JSX attributes that look like user-facing text
    { regex: /(placeholder|title|alt|aria-label)\s*=\s*["']([^"']+)["']/g, type: 'JSX_ATTR' },
    // Button text, labels, etc.
    { regex: /(children|text|label)\s*[:=]\s*["']([^"']+)["']/g, type: 'PROP' },
    // Error messages
    { regex: /throw new Error\s*\(\s*["']([^"']+)["']/g, type: 'ERROR' },
    // Alert/confirm messages
    { regex: /(alert|confirm)\s*\(\s*["']([^"']+)["']/g, type: 'ALERT' },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const text = match[1] || match[2];
      
      // Skip if it's likely not user-facing
      if (shouldSkipText(text)) {
        continue;
      }
      
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        text: text.trim(),
        type: pattern.type,
        context: getContext(content, match.index)
      });
    }
  }
  
  return issues;
}

// Check if text should be skipped
function shouldSkipText(text) {
  const skipPatterns = [
    /^[a-zA-Z0-9._-]+$/, // Single words, IDs
    /^\d+$/, // Numbers only
    /^[{}[\]()]+$/, // Brackets only
    /^(true|false|null|undefined)$/, // Boolean/null values
    /^[a-z]+-[a-z]+$/, // CSS classes
    /^[A-Z][a-z]+[A-Z][a-z]+$/, // PascalCase
    /^[a-z]+_[a-z]+$/, // snake_case
    /^[a-z]+-[a-z]+-[a-z]+$/, // kebab-case
    /^(px|em|rem|vh|vw|%)$/, // CSS units
    /^(GET|POST|PUT|DELETE|PATCH)$/, // HTTP methods
    /^(src|href|id|class|style)$/, // HTML attributes
    /^[a-z]+@[a-z]+\.[a-z]+$/, // Email patterns
    /^https?:\/\//, // URLs
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}/, // Dates
    /^[0-9]+:[0-9]+/, // Times
    /^[a-z]+$/, // Single lowercase words
    /^[A-Z]$/, // Single uppercase letters
  ];
  
  return skipPatterns.some(pattern => pattern.test(text.trim()));
}

// Get context around a match
function getContext(content, index) {
  const lines = content.split('\n');
  const lineNumber = content.substring(0, index).split('\n').length;
  const start = Math.max(0, lineNumber - 2);
  const end = Math.min(lines.length, lineNumber + 3);
  
  return lines.slice(start, end).join('\n');
}

// Scan all files
function scanFiles(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanFiles(filePath, callback);
    } else if (stat.isFile()) {
      if (EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath))) {
        continue;
      }
      
      if (/\.(tsx?|jsx?)$/.test(file)) {
        callback(filePath);
      }
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Comprehensive Translation Verification');
  console.log('=========================================\n');
  
  // Load translations
  console.log('📚 Loading translation files...');
  const translationKeys = loadAllTranslations();
  console.log(`✅ Found ${translationKeys.length} translation keys\n`);
  
  // Find all t() calls
  console.log('🔍 Scanning for t() calls...');
  const allTranslationCalls = [];
  scanFiles(FRONTEND_SRC_DIR, (filePath) => {
    const calls = findTranslationCalls(filePath);
    allTranslationCalls.push(...calls);
  });
  
  console.log(`📊 Found ${allTranslationCalls.length} t() calls\n`);
  
  // Check for missing translation keys
  const missingKeys = [];
  const usedKeys = new Set();
  
  allTranslationCalls.forEach(call => {
    usedKeys.add(call.key);
    if (!translationKeys.includes(call.key)) {
      missingKeys.push(call);
    }
  });
  
  // Find hardcoded text
  console.log('🔍 Scanning for hardcoded text...');
  const allHardcodedText = [];
  scanFiles(FRONTEND_SRC_DIR, (filePath) => {
    const issues = findHardcodedText(filePath);
    allHardcodedText.push(...issues);
  });
  
  console.log(`📊 Found ${allHardcodedText.length} potential hardcoded text instances\n`);
  
  // Report results
  console.log('📋 VERIFICATION RESULTS:');
  console.log('========================\n');
  
  console.log(`📚 Translation Keys: ${translationKeys.length}`);
  console.log(`🔧 t() Calls Found: ${allTranslationCalls.length}`);
  console.log(`❌ Missing Keys: ${missingKeys.length}`);
  console.log(`⚠️  Hardcoded Text: ${allHardcodedText.length}`);
  console.log(`✅ Used Keys: ${usedKeys.size}`);
  console.log(`📦 Unused Keys: ${translationKeys.length - usedKeys.size}\n`);
  
  // Report missing keys
  if (missingKeys.length > 0) {
    console.log('❌ MISSING TRANSLATION KEYS:');
    console.log('============================');
    missingKeys.forEach(call => {
      console.log(`📄 ${call.file}:${call.line}`);
      console.log(`   Key: "${call.key}"`);
      console.log('');
    });
  }
  
  // Report hardcoded text
  if (allHardcodedText.length > 0) {
    console.log('⚠️  POTENTIAL HARDCODED TEXT:');
    console.log('============================');
    
    // Group by file
    const byFile = {};
    allHardcodedText.forEach(issue => {
      if (!byFile[issue.file]) {
        byFile[issue.file] = [];
      }
      byFile[issue.file].push(issue);
    });
    
    for (const file in byFile) {
      console.log(`📄 ${file}:`);
      byFile[file].forEach(issue => {
        console.log(`   Line ${issue.line}: "${issue.text}" (${issue.type})`);
      });
      console.log('');
    }
  }
  
  // Final assessment
  console.log('🎯 FINAL ASSESSMENT:');
  console.log('===================');
  
  if (missingKeys.length === 0 && allHardcodedText.length === 0) {
    console.log('🎉 EXCELLENT! All text is properly translated.');
    console.log('✅ No missing translation keys found.');
    console.log('✅ No hardcoded user-facing text found.');
  } else {
    console.log('⚠️  ATTENTION NEEDED:');
    if (missingKeys.length > 0) {
      console.log(`❌ ${missingKeys.length} translation keys are missing from translation files.`);
    }
    if (allHardcodedText.length > 0) {
      console.log(`⚠️  ${allHardcodedText.length} instances of hardcoded text found.`);
    }
  }
  
  console.log(`\n📊 Coverage: ${usedKeys.size}/${translationKeys.length} keys are being used (${Math.round(usedKeys.size/translationKeys.length*100)}%)`);
}

// Run the script
main().catch(console.error);
