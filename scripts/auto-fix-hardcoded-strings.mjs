#!/usr/bin/env node
/**
 * Automated Hardcoded Strings Fixer (Improved & Conservative)
 * 
 * This script ONLY converts hardcoded user-facing strings to translation keys.
 * It is conservative and will:
 * - Only fix strings that are clearly visible in the UI
 * - Skip strings that are already translated
 * - Skip strings that shouldn't be translated (technical terms, IDs, etc.)
 * - Only modify code related to translations, nothing else
 * 
 * Usage: node scripts/auto-fix-hardcoded-strings.mjs [options]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const TRANSLATIONS_DIR = path.join(__dirname, '../packages/translations/locales/en');

/**
 * Load all existing translation values to avoid duplicates
 */
function loadAllTranslationValues() {
  const allValues = new Set();
  const languages = ['en', 'fr', 'de'];
  
  for (const lang of languages) {
    const langDir = path.join(__dirname, '../packages/translations/locales', lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(langDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(content);
        
        // Flatten and collect all string values
        function collectValues(obj) {
          if (typeof obj === 'string') {
            allValues.add(obj.toLowerCase().trim());
          } else if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(collectValues);
          }
        }
        
        collectValues(translations);
      } catch (error) {
        // Skip invalid JSON files
      }
    }
  }
  
  return allValues;
}

/**
 * Check if a string should be skipped (not translated)
 */
function shouldSkipString(text, line) {
  const normalizedText = text.toLowerCase().trim();
  
  // Skip empty or very short strings
  if (!text || text.trim().length < 3) return true;
  
  // Skip if already using translation
  if (line.includes('t(') || line.includes('useTranslation')) return true;
  
  // Skip comments
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return true;
  
  // Skip import/export statements
  if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) return true;
  
  // Skip URLs
  if (text.match(/^https?:\/\//i) || text.match(/^www\./i)) return true;
  
  // Skip email addresses
  if (text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return true;
  
  // Skip file paths
  if (text.match(/^[\/\\]|\.(js|ts|tsx|jsx|json|css|scss|png|jpg|svg|gif|webp)$/i)) return true;
  
  // Skip CSS classes and technical terms
  if (text.match(/^(bg-|text-|border-|p-|m-|w-|h-|flex|grid|hidden|block|inline|absolute|relative|fixed)/)) return true;
  
  // Skip technical identifiers
  if (text.match(/^[a-z]+[A-Z][a-z]*$/) && text.length < 15) return true; // camelCase
  if (text.match(/^[A-Z_]+$/)) return true; // CONSTANTS
  if (text.match(/^[a-z_]+$/)) return true; // snake_case
  
  // Skip single technical words
  if (text.match(/^(React|Component|Props|State|TypeScript|JavaScript|HTML|CSS|JSX|TSX|API|HTTP|HTTPS|URL|URI|JSON|XML|SVG|PNG|JPG|PDF|DOC|XLS|useState|useEffect|useCallback|useMemo|useRef|className|onClick|onChange|onSubmit|true|false|null|undefined|NaN|px|rem|em|vh|vw|%|deg|ms|s|flex|grid|block|inline|none|auto)$/i)) return true;
  
  // Skip strings that look like code
  if (text.includes('${') || text.includes('`') || text.includes('=>') || text.includes('function')) return true;
  
  // Skip strings that are all uppercase (likely constants)
  if (text === text.toUpperCase() && text.length > 2 && !text.includes(' ')) return true;
  
  // Skip strings that are just numbers
  if (text.match(/^\d+$/)) return true;
  
  // Skip strings in className, id, data-* attributes
  if (line.match(/(className|id|data-\w+)\s*=\s*['"]/)) return true;
  
  // Skip console.log, console.error, etc.
  if (line.match(/console\.(log|error|warn|debug)/)) return true;
  
  return false;
}

/**
 * Check if string is already in translation files
 */
function isAlreadyTranslated(text, existingTranslations) {
  const normalized = text.toLowerCase().trim();
  return existingTranslations.has(normalized);
}

/**
 * Generate translation key from text
 */
function generateTranslationKey(text, filePath, context) {
  // Clean text for key generation
  let key = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '')
    .substring(0, 50);
  
  // Determine namespace based on file path
  let namespace = 'common';
  if (filePath.includes('/pages/')) {
    const pageMatch = filePath.match(/pages\/([^/]+)/);
    if (pageMatch) {
      const pageName = pageMatch[1];
      if (pageName === 'admin' || pageName.includes('Admin')) namespace = 'admin';
      else if (pageName === 'auth' || pageName.includes('Login') || pageName.includes('Signup')) namespace = 'auth';
      else if (pageName.includes('Dashboard')) namespace = 'dashboard';
      else if (pageName.includes('Settings')) namespace = 'settings';
      else if (pageName.includes('Messages')) namespace = 'messages';
      else if (pageName.includes('Content') || pageName.includes('Policy') || pageName.includes('ELearning')) namespace = 'content';
      else if (pageName.includes('Signup')) namespace = 'signup';
      else if (pageName.includes('Recruitment')) namespace = 'recruitment';
    }
  } else if (filePath.includes('/components/')) {
    const compMatch = filePath.match(/components\/([^/]+)/);
    if (compMatch) {
      const compName = compMatch[1];
      if (compName === 'admin') namespace = 'admin';
      else if (compName === 'ui') namespace = 'common';
      else namespace = 'common';
    }
  }
  
  // Generate key based on context
  if (context.includes('button') || context.includes('Button') || context.includes('<button') || context.includes('</button>')) {
    return `${namespace}.buttons.${key}`;
  } else if (context.includes('label') || context.includes('Label') || context.includes('htmlFor') || context.includes('for=')) {
    return `${namespace}.labels.${key}`;
  } else if (context.includes('placeholder') || context.includes('Placeholder')) {
    return `${namespace}.placeholders.${key}`;
  } else if (context.includes('error') || context.includes('Error')) {
    return `${namespace}.errors.${key}`;
  } else if (context.includes('title') || context.includes('Title') || context.includes('<h1') || context.includes('<h2') || context.includes('<h3')) {
    return `${namespace}.titles.${key}`;
  } else if (context.includes('message') || context.includes('Message')) {
    return `${namespace}.messages.${key}`;
  }
  
  return `${namespace}.${key}`;
}

/**
 * Find hardcoded strings - ONLY user-facing strings visible in UI
 */
function findHardcodedStrings(filePath, content, existingTranslations) {
  const results = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNumber) => {
    // Skip if already has translation
    if (line.includes("t('") || line.includes('t("') || line.includes('t(`')) return;
    
    // Skip if should be excluded
    if (shouldSkipString('', line)) return;
    
    // Pattern 1: JSX text content between tags (quoted strings)
    // Look for: >"Text here"< or >'Text here'<
    const jsxTextQuotedPattern = />\s*['"]([A-Z][A-Za-z\s]{2,}?)\s*</g;
    let match;
    while ((match = jsxTextQuotedPattern.exec(line)) !== null) {
      const text = match[1].trim();
      
      if (!shouldSkipString(text, line) && 
          !isAlreadyTranslated(text, existingTranslations) &&
          text.length >= 3) {
        results.push({
          text,
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'jsx-text-quoted',
          confidence: 'high'
        });
      }
    }
    
    // Pattern 2: JSX text content between tags (unquoted - direct text)
    // Look for: >Text here< (not in JSX expression, not already translated)
    // This catches: <p>Some text</p> or <div>Hello World</div>
    // But skips: <p>{t('key')}</p> or <div>{variable}</div>
    if (!line.includes('{') && !line.includes('t(')) {
      const jsxTextUnquotedPattern = />\s*([A-Z][A-Za-z\s]{2,}?)\s*</g;
      while ((match = jsxTextUnquotedPattern.exec(line)) !== null) {
        const text = match[1].trim();
        
        // Skip if it looks like a closing tag or attribute
        if (text.includes('<') || text.includes('>') || text.includes('=')) continue;
        
        if (!shouldSkipString(text, line) && 
            !isAlreadyTranslated(text, existingTranslations) &&
            text.length >= 3) {
          results.push({
            text,
            line: lineNumber + 1,
            context: line.trim(),
            file: filePath,
            type: 'jsx-text-unquoted',
            confidence: 'high'
          });
        }
      }
    }
    
    // Pattern 3: Button/link text content
    // Look for: <button>Text</button> or <a>Text</a> (but not if it has {t()} inside)
    if (!line.includes('{t(') && !line.includes('{t(')) {
      const buttonTextPattern = /<(button|a)[^>]*>\s*([A-Z][A-Za-z\s]{2,}?)\s*<\/(button|a)>/gi;
      while ((match = buttonTextPattern.exec(line)) !== null) {
        const text = match[2].trim();
        
        if (!shouldSkipString(text, line) && 
            !isAlreadyTranslated(text, existingTranslations) &&
            text.length >= 3) {
          results.push({
            text,
            line: lineNumber + 1,
            context: line.trim(),
            file: filePath,
            type: 'button-text',
            confidence: 'high'
          });
        }
      }
    }
    
    // Pattern 4: User-facing attributes (title, placeholder, aria-label, alt)
    // ONLY these specific attributes that are visible to users
    // Skip if already using t() in the attribute
    if (!line.includes('{t(')) {
      const attrPattern = /(title|placeholder|aria-label|alt)\s*=\s*['"]([A-Z][A-Za-z\s]{2,})['"]/gi;
      while ((match = attrPattern.exec(line)) !== null) {
        const text = match[2].trim();
        
        if (!shouldSkipString(text, line) && 
            !isAlreadyTranslated(text, existingTranslations) &&
            text.length >= 3) {
          results.push({
            text,
            line: lineNumber + 1,
            context: line.trim(),
            file: filePath,
            type: 'attribute',
            attribute: match[1],
            confidence: 'high'
          });
        }
      }
    }
  });
  
  return results;
}

/**
 * Scan directory for files
 */
function scanDirectory(dirPath, extensions = ['.tsx', '.jsx']) {
  const results = [];
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.git', '.next', 'coverage', 'tests', 'test', '__tests__', '__mocks__'].includes(entry.name)) {
          continue;
        }
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir(dirPath);
  return files;
}

/**
 * Load translation file
 */
function loadTranslationFile(namespace) {
  const filePath = path.join(TRANSLATIONS_DIR, `${namespace}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return {};
}

/**
 * Save translation file
 */
function saveTranslationFile(namespace, data) {
  const filePath = path.join(TRANSLATIONS_DIR, `${namespace}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Set nested value in object
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
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

/**
 * Fix hardcoded string - ONLY modify translation-related code
 */
function fixHardcodedString(filePath, lineNumber, originalText, translationKey, namespace) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const line = lines[lineNumber - 1];
  
  // Convert translation key to proper namespace:key format
  const formattedKey = translationKey.includes('.') 
    ? translationKey.replace(/^([^.]+)\./, '$1:') 
    : `common:${translationKey}`;
  
  let newLine = line;
  let needsUseTranslation = false;
  
  // Check if useTranslation is already imported
  const hasUseTranslationImport = content.includes("import { useTranslation } from 'react-i18next'") ||
                                  content.includes('import { useTranslation } from "react-i18next"');
  
  // Check if component already has useTranslation hook
  const hasUseTranslationHook = content.includes('const { t } = useTranslation') || 
                                content.includes('const { t } = useTranslation(');
  
  // ONLY replace the specific hardcoded string - be very precise
  const escapedText = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Pattern 1: JSX text content >"Text"< (quoted)
  if (line.includes(`>"${originalText}"<`) || line.includes(`>'${originalText}'<`)) {
    newLine = line.replace(
      new RegExp(`>\\s*['"]${escapedText}['"]\\s*<`),
      `>{t('${formattedKey}')}<`
    );
    needsUseTranslation = true;
  }
  // Pattern 2: JSX text content >Text< (unquoted)
  else if (line.match(new RegExp(`>\\s*${escapedText}\\s*<`)) && !line.includes('{')) {
    newLine = line.replace(
      new RegExp(`>\\s*${escapedText}\\s*<`),
      `>{t('${formattedKey}')}<`
    );
    needsUseTranslation = true;
  }
  // Pattern 3: Button/link text <button>Text</button>
  else if (line.match(new RegExp(`<[^>]+>\\s*${escapedText}\\s*<\\/`)) && !line.includes('{t(')) {
    newLine = line.replace(
      new RegExp(`(${escapedText})`),
      `{t('${formattedKey}')}`
    );
    needsUseTranslation = true;
  }
  // Pattern 4: Attribute values (title, placeholder, aria-label, alt)
  else if (line.match(/(title|placeholder|aria-label|alt)\s*=\s*['"]/) && !line.includes('{t(')) {
    if (line.includes(`"${originalText}"`) || line.includes(`'${originalText}'`)) {
      newLine = line.replace(
        new RegExp(`(['"])${escapedText}\\1`),
        `$1{t('${formattedKey}')}$1`
      );
      needsUseTranslation = true;
    }
  }
  
  // Only update if we actually made a change
  if (newLine !== line) {
    lines[lineNumber - 1] = newLine;
    
    // Add useTranslation import if needed (ONLY if not already present)
    if (!hasUseTranslationImport && needsUseTranslation) {
      // Find the last import statement
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        } else if (lastImportIndex !== -1 && lines[i].trim() === '') {
          break;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import { useTranslation } from 'react-i18next';");
      } else {
        // No imports found, add at the top
        lines.unshift("import { useTranslation } from 'react-i18next';");
      }
    }
    
    // Add useTranslation hook in component if needed (ONLY if not already present)
    if (!hasUseTranslationHook && needsUseTranslation) {
      // Find component function/const
      let componentStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^(export\s+)?(const|function)\s+\w+.*=.*\(/)) {
          componentStart = i;
          break;
        }
      }
      
      if (componentStart !== -1) {
        // Find the opening brace
        let hookInsertIndex = componentStart + 1;
        for (let i = componentStart + 1; i < Math.min(componentStart + 10, lines.length); i++) {
          if (lines[i].includes('{')) {
            hookInsertIndex = i + 1;
            break;
          }
        }
        
        // Check if hook already exists nearby
        const nearbyLines = lines.slice(hookInsertIndex, hookInsertIndex + 5).join('\n');
        if (!nearbyLines.includes('useTranslation')) {
          const indent = lines[hookInsertIndex]?.match(/^(\s*)/)?.[1] || '  ';
          // Use proper namespace in useTranslation hook
          const namespaceForHook = namespace !== 'common' ? `['${namespace}', 'common']` : `['common']`;
          lines.splice(hookInsertIndex, 0, `${indent}const { t } = useTranslation(${namespaceForHook});`);
        }
      }
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return { fixed: true, needsTranslation: true };
  }
  
  return { fixed: false, needsTranslation: false };
}

/**
 * Main auto-fix function
 */
async function autoFix() {
  console.log('🔍 Scanning for hardcoded user-facing strings...\n');
  
  // Load all existing translations to avoid duplicates
  const existingTranslations = loadAllTranslationValues();
  console.log(`📚 Loaded ${existingTranslations.size} existing translation values\n`);
  
  // Scan files
  const files = scanDirectory(FRONTEND_DIR);
  console.log(`📂 Scanning ${files.length} files...\n`);
  
  // Verbose: Show file scanning progress
  let filesScanned = 0;
  let filesWithResults = 0;
  const scanStats = {
    totalFiles: files.length,
    filesWithStrings: 0,
    totalStringsFound: 0,
    stringsByType: {},
    stringsByFile: {}
  };
  
  const allResults = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileResults = findHardcodedStrings(file, content, existingTranslations);
      
      filesScanned++;
      if (fileResults.length > 0) {
        filesWithResults++;
        scanStats.filesWithStrings++;
        scanStats.totalStringsFound += fileResults.length;
        
        const relPath = path.relative(FRONTEND_DIR, file);
        scanStats.stringsByFile[relPath] = fileResults.length;
        
        // Count by type
        fileResults.forEach(r => {
          scanStats.stringsByType[r.type] = (scanStats.stringsByType[r.type] || 0) + 1;
        });
      }
      
      allResults.push(...fileResults);
      
      // Show progress every 50 files
      if (filesScanned % 50 === 0) {
        console.log(`   Scanned ${filesScanned}/${files.length} files... (found ${allResults.length} potential strings so far)`);
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  
  // Filter to only high-confidence findings
  const highConfidence = allResults.filter(r => r.confidence === 'high');
  
  console.log(`\n📊 Scan Summary:`);
  console.log(`   Files scanned: ${filesScanned}`);
  console.log(`   Files with potential strings: ${filesWithResults}`);
  console.log(`   Total potential strings found: ${allResults.length}`);
  console.log(`   High confidence strings: ${highConfidence.length}\n`);
  
  // Show breakdown by type
  if (Object.keys(scanStats.stringsByType).length > 0) {
    console.log('📋 Strings by type:');
    Object.entries(scanStats.stringsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    console.log('');
  }
  
  // Show top files with most strings
  if (Object.keys(scanStats.stringsByFile).length > 0) {
    console.log('📁 Top files with potential strings:');
    Object.entries(scanStats.stringsByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`   ${file}: ${count} string(s)`);
      });
    console.log('');
  }
  
  // Debug: Show what was found and why it was filtered
  if (allResults.length > 0) {
    console.log('📝 Sample findings (first 15):');
    allResults.slice(0, 15).forEach(r => {
      const relPath = path.relative(FRONTEND_DIR, r.file);
      const confidence = r.confidence === 'high' ? '✓' : '○';
      console.log(`   ${confidence} "${r.text}" in ${relPath}:${r.line} (${r.type})`);
    });
    console.log('');
    
    if (highConfidence.length === 0 && allResults.length > 0) {
      console.log('⚠️  All strings were filtered out. This likely means:');
      console.log('   - They are already translated (using t() calls)');
      console.log('   - They exist in translation files');
      console.log('   - They are technical strings that shouldn\'t be translated');
      console.log('');
    }
  } else {
    console.log('✅ No potential hardcoded strings found in any files.');
    console.log('   This means the codebase is well-translated!\n');
  }
  
  if (highConfidence.length === 0) {
    return {
      success: true,
      fixed: 0,
      skipped: 0,
      errors: 0,
      message: 'No hardcoded user-facing strings found that need fixing.',
      details: {
        scanStats,
        skipped: []
      }
    };
  }
  
  const fixed = [];
  const skipped = [];
  const errors = [];
  const translationKeys = new Map(); // namespace -> { key -> value }
  
  for (const result of highConfidence) {
    try {
      const translationKey = generateTranslationKey(result.text, result.file, result.context);
      const [namespace, ...keyParts] = translationKey.split('.');
      const key = keyParts.join('.');
      
      // Load translation file
      const translations = loadTranslationFile(namespace);
      
      // Check if key already exists
      const existingValue = key.split('.').reduce((obj, k) => obj?.[k], translations);
      
      if (existingValue) {
        skipped.push({
          file: result.file,
          line: result.line,
          text: result.text,
          reason: `Translation key already exists: ${translationKey.replace(/^([^.]+)\./, '$1:')}`
        });
        continue;
      }
      
      // Also check if the exact text value already exists in translations
      if (isAlreadyTranslated(result.text, existingTranslations)) {
        skipped.push({
          file: result.file,
          line: result.line,
          text: result.text,
          reason: 'Text already exists in translation files'
        });
        continue;
      }
      
      // Fix the code
      const fixResult = fixHardcodedString(result.file, result.line, result.text, translationKey, namespace);
      
      if (fixResult.fixed) {
        // Add translation key
        if (!translationKeys.has(namespace)) {
          translationKeys.set(namespace, {});
        }
        setNestedValue(translationKeys.get(namespace), key, result.text);
        
        fixed.push({
          file: result.file,
          line: result.line,
          text: result.text,
          translationKey: translationKey.replace(/^([^.]+)\./, '$1:')
        });
      } else {
        skipped.push({
          file: result.file,
          line: result.line,
          text: result.text,
          reason: 'Could not automatically fix (may need manual intervention)'
        });
      }
    } catch (error) {
      errors.push({
        file: result.file,
        line: result.line,
        text: result.text,
        error: error.message
      });
    }
  }
  
  // Save translation files
  for (const [namespace, keys] of translationKeys.entries()) {
    const translations = loadTranslationFile(namespace);
    
    // Merge new keys
    for (const [keyPath, value] of Object.entries(keys)) {
      setNestedValue(translations, keyPath, value);
    }
    
    saveTranslationFile(namespace, translations);
  }
  
  return {
    success: true,
    fixed: fixed.length,
    skipped: skipped.length,
    errors: errors.length,
    details: {
      fixed,
      skipped,
      errors,
      scanStats
    },
    message: (() => {
      let msg = `Successfully fixed ${fixed.length} hardcoded strings.`;
      if (skipped.length > 0) {
        msg += ` ${skipped.length} skipped (already translated or filtered).`;
      }
      if (errors.length > 0) {
        msg += ` ${errors.length} errors.`;
      }
      if (fixed.length === 0 && skipped.length > 0) {
        msg += '\n\n💡 All found strings were already translated or filtered out. This is good - it means your codebase is well-translated!';
      }
      return msg;
    })()
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('auto-fix-hardcoded-strings.mjs')) {
  autoFix().then(result => {
    // Output JSON for API parsing
    console.log(JSON.stringify(result, null, 2));
    
    // Also output human-readable summary
    console.error('\n✅ Auto-fix complete!');
    console.error(`   Fixed: ${result.fixed}`);
    console.error(`   Skipped: ${result.skipped}`);
    console.error(`   Errors: ${result.errors}`);
    console.error(`\n${result.message}\n`);
    
    // Show detailed skip reasons if all were skipped
    if (result.fixed === 0 && result.skipped > 0 && result.details?.skipped) {
      console.error('📋 Skip reasons (first 10):');
      const skipReasons = {};
      result.details.skipped.slice(0, 10).forEach(s => {
        skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
      });
      Object.entries(skipReasons).forEach(([reason, count]) => {
        console.error(`   - ${reason}: ${count}`);
      });
      console.error('');
    }
    
    if (result.errors > 0 && result.details?.errors) {
      console.error('⚠️  Errors encountered:');
      result.details.errors.forEach(err => {
        console.error(`   ${err.file}:${err.line} - ${err.error}`);
      });
    }
    
    process.exit(result.errors > 0 ? 1 : 0);
  }).catch(error => {
    const errorResult = {
      success: false,
      fixed: 0,
      skipped: 0,
      errors: 1,
      message: `Auto-fix failed: ${error.message}`,
    };
    console.log(JSON.stringify(errorResult, null, 2));
    console.error('❌ Auto-fix failed:', error);
    process.exit(1);
  });
}

export { autoFix };
