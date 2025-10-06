#!/usr/bin/env node

/**
 * Translation Coverage Verification Script
 * 
 * This script analyzes the frontend codebase to find all hardcoded text
 * and verifies that it's properly translated using i18n keys.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_SRC_DIR = path.join(__dirname, 'frontend/src');
const TRANSLATION_DIR = path.join(__dirname, 'frontend/public/locales');
const EXCLUDED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.stories\.(ts|tsx|js|jsx)$/,
  /node_modules/,
  /dist/,
  /build/,
];

// Load translation files
function loadTranslations() {
  const translations = {};
  const languages = ['en', 'fr', 'de'];
  
  for (const lang of languages) {
    const langDir = path.join(TRANSLATION_DIR, lang);
    if (fs.existsSync(langDir)) {
      translations[lang] = {};
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(langDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const namespace = file.replace('.json', '');
        translations[lang][namespace] = content;
      }
    }
  }
  
  return translations;
}

// Extract all translation keys from translation files
function extractTranslationKeys(translations) {
  const keys = new Set();
  
  for (const lang in translations) {
    for (const namespace in translations[lang]) {
      extractKeysFromObject(translations[lang][namespace], '', keys);
    }
  }
  
  return Array.from(keys);
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

// Find all hardcoded text in React components
function findHardcodedText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Patterns to find hardcoded text
  const patterns = [
    // JSX text content: >text<
    { regex: />\s*([^<>\n{}]+)\s*</g, type: 'JSX_TEXT' },
    // String literals in JSX attributes
    { regex: /=\s*["']([^"']+)["']/g, type: 'JSX_ATTR' },
    // Console.log statements (usually not translated)
    { regex: /console\.(log|warn|error)\s*\(\s*["']([^"']+)["']/g, type: 'CONSOLE', skip: true },
    // Alert/confirm messages
    { regex: /(alert|confirm)\s*\(\s*["']([^"']+)["']/g, type: 'ALERT' },
    // Error messages
    { regex: /throw new Error\s*\(\s*["']([^"']+)["']/g, type: 'ERROR' },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const text = match[1] || match[2];
      
      // Skip if it's marked to skip or if it's likely not user-facing
      if (pattern.skip || shouldSkipText(text)) {
        continue;
      }
      
      // Check if this text is already translated
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

// Check if text should be skipped (not user-facing)
function shouldSkipText(text) {
  const skipPatterns = [
    /^[a-zA-Z0-9._-]+$/, // Single words, IDs, class names
    /^\d+$/, // Numbers only
    /^[{}[\]()]+$/, // Brackets only
    /^(true|false|null|undefined)$/, // Boolean/null values
    /^[a-z]+-[a-z]+$/, // CSS classes like "btn-primary"
    /^[A-Z][a-z]+[A-Z][a-z]+$/, // PascalCase (likely component names)
    /^[a-z]+_[a-z]+$/, // snake_case
    /^[a-z]+-[a-z]+-[a-z]+$/, // kebab-case
    /^(px|em|rem|vh|vw|%)$/, // CSS units
    /^(GET|POST|PUT|DELETE|PATCH)$/, // HTTP methods
    /^(src|href|alt|title|id|class|style)$/, // HTML attributes
    /^[a-z]+@[a-z]+\.[a-z]+$/, // Email patterns
    /^https?:\/\//, // URLs
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}/, // Dates
    /^[0-9]+:[0-9]+/, // Times
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

// Check if text is already translated (has t() call nearby)
function isTranslated(content, text, index) {
  const beforeContext = content.substring(Math.max(0, index - 200), index);
  const afterContext = content.substring(index, Math.min(content.length, index + 200));
  
  // Look for t() calls with the same text
  const tCallPattern = /t\s*\(\s*["']([^"']+)["']/g;
  let match;
  
  while ((match = tCallPattern.exec(beforeContext + afterContext)) !== null) {
    if (match[1] === text) {
      return true;
    }
  }
  
  return false;
}

// Scan all files in directory
function scanDirectory(dir, issues = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, issues);
    } else if (stat.isFile()) {
      // Check if file should be excluded
      if (EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath))) {
        continue;
      }
      
      // Only process React/TypeScript files
      if (/\.(tsx?|jsx?)$/.test(file)) {
        const fileIssues = findHardcodedText(filePath);
        issues.push(...fileIssues);
      }
    }
  }
  
  return issues;
}

// Main execution
async function main() {
  console.log('🔍 Translation Coverage Verification Script');
  console.log('==========================================\n');
  
  // Load translations
  console.log('📚 Loading translation files...');
  const translations = loadTranslations();
  const translationKeys = extractTranslationKeys(translations);
  
  console.log(`✅ Found ${translationKeys.length} translation keys`);
  console.log(`📁 Languages: ${Object.keys(translations).join(', ')}\n`);
  
  // Scan frontend code
  console.log('🔍 Scanning frontend code for hardcoded text...');
  const issues = scanDirectory(FRONTEND_SRC_DIR);
  
  console.log(`📊 Found ${issues.length} potential hardcoded text instances\n`);
  
  // Filter out likely false positives
  const userFacingIssues = issues.filter(issue => {
    const text = issue.text.trim();
    
    // Skip very short text
    if (text.length < 3) return false;
    
    // Skip if it's already translated
    if (isTranslated(fs.readFileSync(path.join(FRONTEND_SRC_DIR, issue.file), 'utf8'), text, 0)) {
      return false;
    }
    
    // Skip if it looks like a translation key
    if (translationKeys.some(key => key.includes(text) || text.includes(key))) {
      return false;
    }
    
    return true;
  });
  
  console.log(`⚠️  Found ${userFacingIssues.length} potential untranslated text instances:\n`);
  
  // Group by file
  const issuesByFile = {};
  userFacingIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  // Report results
  for (const file in issuesByFile) {
    console.log(`📄 ${file}:`);
    issuesByFile[file].forEach(issue => {
      console.log(`   Line ${issue.line}: "${issue.text}" (${issue.type})`);
    });
    console.log('');
  }
  
  // Summary
  console.log('📋 Summary:');
  console.log(`   Total translation keys: ${translationKeys.length}`);
  console.log(`   Total potential issues: ${issues.length}`);
  console.log(`   User-facing issues: ${userFacingIssues.length}`);
  console.log(`   Files with issues: ${Object.keys(issuesByFile).length}`);
  
  if (userFacingIssues.length === 0) {
    console.log('\n🎉 All text appears to be properly translated!');
  } else {
    console.log('\n⚠️  Some text may need translation. Review the issues above.');
  }
}

// Run the script
main().catch(console.error);
