#!/usr/bin/env node
/**
 * Check for Untranslated Strings
 * 
 * This script ONLY checks for hardcoded strings that should be translated.
 * It does NOT modify any code - it only reports what needs translation.
 * 
 * It will:
 * - Find hardcoded strings in JSX/TSX files
 * - Check if they're already in translation files
 * - Report missing translations
 * - Skip strings that shouldn't be translated (URLs, IDs, etc.)
 * 
 * Usage: node scripts/check-untranslated-strings.mjs [--report-only]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const LOCALES_DIR = path.join(__dirname, '../packages/translations/locales');
const REPORT_ONLY = process.argv.includes('--report-only');

/**
 * Recursively find files
 */
function findFiles(dir, pattern = /\.(tsx|jsx)$/, ignorePatterns = [/node_modules/, /dist/, /build/, /\.d\.ts$/]) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (ignorePatterns.some(p => p.test(fullPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Load all translation keys from all languages
 */
function loadAllTranslationKeys() {
  const allKeys = new Set();
  const languages = fs.readdirSync(LOCALES_DIR)
    .filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());

  for (const lang of languages) {
    const langDir = path.join(LOCALES_DIR, lang);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);
      
      // Flatten nested keys
      function flatten(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flatten(value, fullKey);
          } else if (typeof value === 'string') {
            // Store both the key and the value (normalized)
            allKeys.add(fullKey);
            allKeys.add(value.toLowerCase().trim());
          }
        }
      }
      
      flatten(translations);
    }
  }

  return allKeys;
}

/**
 * Check if a string should be skipped (not translated)
 */
function shouldSkipString(str) {
  // Skip empty or very short strings
  if (!str || str.trim().length < 2) return true;
  
  // Skip strings that are already translation keys
  if (str.match(/^[a-zA-Z0-9._:]+$/)) return true;
  
  // Skip URLs
  if (str.match(/^https?:\/\//i) || str.match(/^www\./i)) return true;
  
  // Skip email addresses
  if (str.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return true;
  
  // Skip file paths
  if (str.match(/^[\/\\]|\.(js|ts|tsx|jsx|json|css|scss|png|jpg|svg)$/i)) return true;
  
  // Skip CSS classes
  if (str.match(/^(bg-|text-|border-|p-|m-|w-|h-|flex|grid|hidden|block|inline)/)) return true;
  
  // Skip IDs and technical identifiers
  if (str.match(/^[a-z]+[A-Z][a-z]*$/) && str.length < 15) return true; // camelCase
  if (str.match(/^[A-Z_]+$/)) return true; // CONSTANTS
  if (str.match(/^[a-z_]+$/)) return true; // snake_case
  
  // Skip single words that are likely variable names
  if (str.match(/^[a-z][a-zA-Z0-9]*$/) && str.length < 20) return true;
  
  // Skip numbers
  if (str.match(/^\d+$/)) return true;
  
  // Skip strings that are clearly code
  if (str.includes('${') || str.includes('`') || str.includes('=>')) return true;
  
  return false;
}

/**
 * Extract hardcoded strings from JSX/TSX content
 * Only finds strings that are clearly visible in the UI
 */
function extractHardcodedStrings(content, filePath) {
  const strings = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Skip lines that already have t() calls - these are already translated
    if (line.includes("t('") || line.includes('t("') || line.includes('t(`')) {
      return;
    }
    
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('*/')) {
      return;
    }
    
    // Skip import/export statements
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
      return;
    }
    
    // Find JSX text content: >Text here< or {variable}Text here<
    // This pattern finds text between JSX tags that starts with uppercase
    const jsxTextPattern = />\s*([A-Z][A-Za-z\s]{2,}?)\s*</g;
    let match;
    while ((match = jsxTextPattern.exec(line)) !== null) {
      const text = match[1].trim();
      
      // Only process if it looks like user-facing text
      if (!shouldSkipString(text) && text.length >= 3) {
        strings.push({
          text,
          line: lineIndex + 1,
          file: path.relative(FRONTEND_DIR, filePath),
          context: line.trim(),
        });
      }
    }
    
    // Find string literals in JSX attributes that might be visible
    // Look for: title="Text", placeholder="Text", aria-label="Text", etc.
    const attributePattern = /(title|placeholder|aria-label|alt|label|value|text|content)\s*=\s*['"]([A-Z][^'"`]{3,})['"]/gi;
    while ((match = attributePattern.exec(line)) !== null) {
      const text = match[2];
      
      if (!shouldSkipString(text)) {
        strings.push({
          text,
          line: lineIndex + 1,
          file: path.relative(FRONTEND_DIR, filePath),
          context: line.trim(),
        });
      }
    }
    
    // Find button/link text that's hardcoded
    // Look for: <button>Text</button> or <a>Text</a>
    const buttonTextPattern = /<(button|a|span|p|h[1-6]|label|div)[^>]*>\s*([A-Z][A-Za-z\s]{2,}?)\s*<\//gi;
    while ((match = buttonTextPattern.exec(line)) !== null) {
      const text = match[2].trim();
      
      if (!shouldSkipString(text) && text.length >= 3) {
        strings.push({
          text,
          line: lineIndex + 1,
          file: path.relative(FRONTEND_DIR, filePath),
          context: line.trim(),
        });
      }
    }
  });
  
  return strings;
}

/**
 * Check if a string exists in translations
 */
function isStringTranslated(text, translationKeys) {
  const normalized = text.toLowerCase().trim();
  
  // Check if exact match exists
  if (translationKeys.has(normalized)) {
    return true;
  }
  
  // Check if similar strings exist (fuzzy match)
  for (const key of translationKeys) {
    if (typeof key === 'string' && key.toLowerCase().includes(normalized) || 
        normalized.includes(key.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Main function
 */
async function checkUntranslatedStrings() {
  console.log('🔍 Checking for untranslated hardcoded strings...\n');
  console.log('⚠️  This script only REPORTS issues - it does NOT modify code.\n');
  
  // Load all translation keys
  console.log('📚 Loading translation keys...');
  const translationKeys = loadAllTranslationKeys();
  console.log(`   Found ${translationKeys.size} translation keys/values\n`);
  
  // Find all JSX/TSX files
  console.log('📂 Scanning files...');
  const files = findFiles(FRONTEND_DIR);
  console.log(`   Found ${files.length} files to check\n`);
  
  const untranslatedStrings = [];
  let filesWithIssues = 0;
  
  // Process each file
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hardcodedStrings = extractHardcodedStrings(content, filePath);
    
    if (hardcodedStrings.length > 0) {
      const untranslated = hardcodedStrings.filter(str => 
        !isStringTranslated(str.text, translationKeys)
      );
      
      if (untranslated.length > 0) {
        filesWithIssues++;
        untranslatedStrings.push({
          file: path.relative(FRONTEND_DIR, filePath),
          strings: untranslated,
        });
      }
    }
  }
  
  // Generate report
  console.log('═'.repeat(60));
  console.log('📊 UNTRANSLATED STRINGS REPORT');
  console.log('═'.repeat(60));
  console.log(`Files scanned:        ${files.length}`);
  console.log(`Files with issues:    ${filesWithIssues}`);
  console.log(`Total untranslated:   ${untranslatedStrings.reduce((sum, f) => sum + f.strings.length, 0)}`);
  console.log();
  
  if (untranslatedStrings.length > 0) {
    console.log('❌ UNTRANSLATED STRINGS FOUND:\n');
    
    untranslatedStrings.forEach(({ file, strings }) => {
      console.log(`📄 ${file}`);
      console.log('─'.repeat(60));
      
      strings.forEach(({ text, line, context }) => {
        console.log(`   Line ${line}: "${text}"`);
        console.log(`   Context: ${context.substring(0, 80)}${context.length > 80 ? '...' : ''}`);
        console.log();
      });
    });
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../untranslated-strings-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: files.length,
        filesWithIssues,
        totalUntranslated: untranslatedStrings.reduce((sum, f) => sum + f.strings.length, 0),
      },
      details: untranslatedStrings,
    }, null, 2), 'utf8');
    
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    console.log('💡 To fix these issues:');
    console.log('   1. Add the strings to appropriate translation files');
    console.log('   2. Replace hardcoded strings with t() calls');
    console.log('   3. Use proper namespace prefixes (e.g., t("common:key"))\n');
    
    process.exit(1);
  } else {
    console.log('✅ No untranslated strings found!\n');
    process.exit(0);
  }
}

// Run check
checkUntranslatedStrings().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

