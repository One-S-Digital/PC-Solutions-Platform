#!/usr/bin/env node

/**
 * Comprehensive Translation Audit Script
 * 
 * This script performs a complete audit of all translation keys across:
 * - Frontend platform (React)
 * - Admin platform (React)
 * - Identifies missing keys, hardcoded text, and structural issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globby } from 'globby';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_SRC_DIR = path.join(__dirname, '../frontend');
const ADMIN_SRC_DIR = path.join(__dirname, '../admin');
const FRONTEND_LOCALES_DIR = path.join(__dirname, '../frontend/public/locales');
const ADMIN_LOCALES_DIR = path.join(__dirname, '../admin/src/i18n/locales');

const LANGUAGES = ['en', 'fr', 'de'];
const EXCLUDED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /node_modules/,
  /dist/,
  /build/,
  /coverage/,
];

// Load all translation files
function loadTranslationFiles(platform) {
  const localesDir = platform === 'frontend' ? FRONTEND_LOCALES_DIR : ADMIN_LOCALES_DIR;
  const translations = {};
  
  for (const lang of LANGUAGES) {
    translations[lang] = {};
    const langDir = path.join(localesDir, lang);
    
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const namespace = path.basename(file, '.json');
        const filePath = path.join(langDir, file);
        
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          translations[lang][namespace] = content;
        } catch (error) {
          console.error(`Error loading ${filePath}:`, error.message);
          translations[lang][namespace] = {};
        }
      }
    }
  }
  
  return translations;
}

// Extract all translation keys from an object
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Find all t() calls in code
function findTranslationCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const calls = [];
  
  // Pattern to find t() calls with various formats
  const patterns = [
    // t('key') or t("key")
    /t\s*\(\s*['"]([^'"]+)['"]/g,
    // t('key', options) or t("key", options)
    /t\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*\}/g,
    // i18n.t('key')
    /i18n\.t\s*\(\s*['"]([^'"]+)['"]/g,
    // useTranslation().t('key')
    /useTranslation\(\)\.t\s*\(\s*['"]([^'"]+)['"]/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const key = match[1];
      
      // Skip if it's a variable or template literal
      if (key.includes('${') || key.includes('{{')) continue;
      
      calls.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        key: key,
        context: getContext(content, match.index)
      });
    }
  }
  
  return calls;
}

// Find hardcoded text that should be translated
function findHardcodedText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Patterns for hardcoded text
  const patterns = [
    // JSX text content: >text<
    { regex: />\s*([^<>\n{}]+[a-zA-Z][^<>\n{}]*)\s*</g, type: 'JSX_TEXT' },
    // String literals in JSX attributes
    { regex: /(placeholder|title|alt|aria-label|ariaDescription|ariaTitle|label|helperText|caption|headline|buttonText|children|tooltip|emptyText)\s*=\s*['"]([^'"]+)['"]/g, type: 'JSX_ATTR' },
    // Button text, labels, etc.
    { regex: /(children|text|label)\s*[:=]\s*['"]([^'"]+)['"]/g, type: 'PROP' },
    // Error messages
    { regex: /throw new Error\s*\(\s*['"]([^'"]+)['"]/g, type: 'ERROR' },
    // Alert/confirm messages
    { regex: /(alert|confirm)\s*\(\s*['"]([^'"]+)['"]/g, type: 'ALERT' },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const text = match[1] || match[2];
      
      // Skip if it's likely not user-facing
      if (shouldSkipText(text)) continue;
      
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
    /^[{}[\]()]+$/, // Only brackets
    /^\s*$/, // Empty or whitespace
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

// Scan all files in a directory
async function scanFiles(dir, callback) {
  const files = await globby([
    `${dir}/**/*.{ts,tsx,js,jsx}`,
    `!${dir}/**/node_modules/**`,
    `!${dir}/**/dist/**`,
    `!${dir}/**/build/**`,
    `!${dir}/**/coverage/**`,
    `!${dir}/**/*.test.*`,
    `!${dir}/**/*.spec.*`,
    `!${dir}/**/*.stories.*`,
  ]);
  
  for (const file of files) {
    if (EXCLUDED_PATTERNS.some(pattern => pattern.test(file))) continue;
    callback(file);
  }
}

// Main audit function
async function auditTranslations() {
  console.log('🔍 Starting Comprehensive Translation Audit');
  console.log('==========================================\n');
  
  // Load translation files
  console.log('📚 Loading translation files...');
  const frontendTranslations = loadTranslationFiles('frontend');
  const adminTranslations = loadTranslationFiles('admin');
  
  // Extract all available keys
  const frontendKeys = new Set();
  const adminKeys = new Set();
  
  for (const lang of LANGUAGES) {
    for (const namespace in frontendTranslations[lang]) {
      const keys = extractKeys(frontendTranslations[lang][namespace]);
      keys.forEach(key => frontendKeys.add(key));
    }
    
    for (const namespace in adminTranslations[lang]) {
      const keys = extractKeys(adminTranslations[lang][namespace]);
      keys.forEach(key => adminKeys.add(key));
    }
  }
  
  console.log(`✅ Frontend: ${frontendKeys.size} translation keys`);
  console.log(`✅ Admin: ${adminKeys.size} translation keys\n`);
  
  // Find all translation calls
  console.log('🔍 Scanning for translation calls...');
  const frontendCalls = [];
  const adminCalls = [];
  
  await scanFiles(FRONTEND_SRC_DIR, (file) => {
    const calls = findTranslationCalls(file);
    frontendCalls.push(...calls);
  });
  
  await scanFiles(ADMIN_SRC_DIR, (file) => {
    const calls = findTranslationCalls(file);
    adminCalls.push(...calls);
  });
  
  console.log(`📊 Frontend: ${frontendCalls.length} translation calls`);
  console.log(`📊 Admin: ${adminCalls.length} translation calls\n`);
  
  // Find missing keys
  const frontendMissing = frontendCalls.filter(call => !frontendKeys.has(call.key));
  const adminMissing = adminCalls.filter(call => !adminKeys.has(call.key));
  
  // Find hardcoded text
  console.log('🔍 Scanning for hardcoded text...');
  const frontendHardcoded = [];
  const adminHardcoded = [];
  
  await scanFiles(FRONTEND_SRC_DIR, (file) => {
    const issues = findHardcodedText(file);
    frontendHardcoded.push(...issues);
  });
  
  await scanFiles(ADMIN_SRC_DIR, (file) => {
    const issues = findHardcodedText(file);
    adminHardcoded.push(...issues);
  });
  
  console.log(`📊 Frontend: ${frontendHardcoded.length} hardcoded text instances`);
  console.log(`📊 Admin: ${adminHardcoded.length} hardcoded text instances\n`);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      frontend: {
        totalKeys: frontendKeys.size,
        translationCalls: frontendCalls.length,
        missingKeys: frontendMissing.length,
        hardcodedText: frontendHardcoded.length,
        coverage: Math.round(((frontendCalls.length - frontendMissing.length) / frontendCalls.length) * 100)
      },
      admin: {
        totalKeys: adminKeys.size,
        translationCalls: adminCalls.length,
        missingKeys: adminMissing.length,
        hardcodedText: adminHardcoded.length,
        coverage: Math.round(((adminCalls.length - adminMissing.length) / adminCalls.length) * 100)
      }
    },
    frontend: {
      missingKeys: frontendMissing,
      hardcodedText: frontendHardcoded,
      allKeys: Array.from(frontendKeys).sort()
    },
    admin: {
      missingKeys: adminMissing,
      hardcodedText: adminHardcoded,
      allKeys: Array.from(adminKeys).sort()
    }
  };
  
  // Save report
  const reportPath = path.join(__dirname, '../translation-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('📋 AUDIT RESULTS:');
  console.log('=================\n');
  
  console.log('Frontend Platform:');
  console.log(`  📚 Translation Keys: ${frontendKeys.size}`);
  console.log(`  🔧 Translation Calls: ${frontendCalls.length}`);
  console.log(`  ❌ Missing Keys: ${frontendMissing.length}`);
  console.log(`  ⚠️  Hardcoded Text: ${frontendHardcoded.length}`);
  console.log(`  📊 Coverage: ${report.summary.frontend.coverage}%\n`);
  
  console.log('Admin Platform:');
  console.log(`  📚 Translation Keys: ${adminKeys.size}`);
  console.log(`  🔧 Translation Calls: ${adminCalls.length}`);
  console.log(`  ❌ Missing Keys: ${adminMissing.length}`);
  console.log(`  ⚠️  Hardcoded Text: ${adminHardcoded.length}`);
  console.log(`  📊 Coverage: ${report.summary.admin.coverage}%\n`);
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  return report;
}

// Run the audit
auditTranslations().catch(console.error);