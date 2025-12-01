#!/usr/bin/env node
/**
 * Automated Hardcoded Strings Fixer
 * 
 * This script automatically finds and fixes hardcoded strings by:
 * 1. Finding hardcoded user-facing strings
 * 2. Generating appropriate translation keys
 * 3. Replacing hardcoded strings with t() calls
 * 4. Adding translation keys to translation files
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

// Common UI words that should be translated
const UI_WORDS = [
  'Save', 'Cancel', 'Delete', 'Edit', 'Add', 'Create', 'Update', 'Submit',
  'Loading', 'Error', 'Success', 'Warning', 'Info', 'Welcome', 'Dashboard',
  'Profile', 'Settings', 'Logout', 'Login', 'Register', 'Sign up', 'Sign in',
  'Back', 'Next', 'Previous', 'Close', 'Open', 'View', 'Details', 'Search',
  'Filter', 'Sort', 'Export', 'Import', 'Download', 'Upload', 'Yes', 'No',
  'Confirm', 'OK', 'Apply', 'Reset', 'Clear', 'Send', 'Receive', 'Message',
  'Messages', 'Notification', 'Notifications', 'Home', 'About', 'Contact',
  'Help', 'Support', 'Terms', 'Privacy', 'Policy', 'Policies'
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /className/, /import\s+.*from/, /export\s+.*from/,
  /console\.(log|error|warn|debug)/, /\/\/.*/, /\/\*.*\*\//,
  /['"]https?:\/\//, /['"]data:/, /['"]#/, /['"]\./, /['"]\w+\.\w+/,
  /['"]\d+/, /['"]\$\{/, /process\.env/, /__dirname|__filename/,
  /useTranslation|useTranslation\(/, /t\(/, /i18n/, /['"]\w+:\w+/,
  /['"]\w+\.\w+\.\w+/, /['"]\w+\.\w+\.\w+\.\w+/,
];

const FALSE_POSITIVES = [
  'React', 'Component', 'Props', 'State', 'TypeScript', 'JavaScript',
  'HTML', 'CSS', 'JSX', 'TSX', 'API', 'HTTP', 'HTTPS', 'URL', 'URI',
  'JSON', 'XML', 'SVG', 'PNG', 'JPG', 'PDF', 'DOC', 'XLS',
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
  'className', 'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
  'aria-label', 'aria-labelledby', 'data-testid', 'data-cy',
  'true', 'false', 'null', 'undefined', 'NaN',
  'px', 'rem', 'em', 'vh', 'vw', '%', 'deg', 'ms', 's',
  'flex', 'grid', 'block', 'inline', 'none', 'auto',
];

function isExcluded(text, line) {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  if (FALSE_POSITIVES.some(fp => text.includes(fp))) return true;
  if (text.length < 3) return true;
  if (text === text.toUpperCase() && text.length > 2) return true;
  if (/^[a-z]+[A-Z]/.test(text) || /^[a-z_]+$/.test(text)) return true;
  return false;
}

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
      if (pageName === 'admin') namespace = 'admin';
      else if (pageName === 'auth' || pageName.includes('Login') || pageName.includes('Signup')) namespace = 'auth';
      else if (pageName.includes('Dashboard')) namespace = 'dashboard';
      else if (pageName.includes('Settings')) namespace = 'settings';
      else if (pageName.includes('Messages')) namespace = 'messages';
      else if (pageName.includes('Content') || pageName.includes('Policy')) namespace = 'content';
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
  if (context.includes('button') || context.includes('Button')) {
    return `${namespace}.buttons.${key}`;
  } else if (context.includes('label') || context.includes('Label')) {
    return `${namespace}.labels.${key}`;
  } else if (context.includes('placeholder') || context.includes('Placeholder')) {
    return `${namespace}.placeholders.${key}`;
  } else if (context.includes('error') || context.includes('Error')) {
    return `${namespace}.errors.${key}`;
  } else if (context.includes('title') || context.includes('Title')) {
    return `${namespace}.titles.${key}`;
  } else if (context.includes('message') || context.includes('Message')) {
    return `${namespace}.messages.${key}`;
  }
  
  return `${namespace}.${key}`;
}

function findHardcodedStrings(filePath, content) {
  const results = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNumber) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    // Pattern 1: JSX text content >"Text"<
    const jsxTextMatch = line.match(/>\s*['"]([A-Z][a-zA-Z\s]{3,})['"]\s*</);
    if (jsxTextMatch && !isExcluded(jsxTextMatch[1], line)) {
      if (!line.includes('t(') && !line.includes('useTranslation')) {
        results.push({
          text: jsxTextMatch[1].trim(),
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'jsx-text',
          confidence: 'high'
        });
      }
    }
    
    // Pattern 2: Attribute values
    const attrMatch = line.match(/(title|placeholder|aria-label|alt|label|text|message|error|success|warning|info|description|heading|subtitle|caption|tooltip|hint|help|content)\s*=\s*['"]([A-Z][a-zA-Z\s]{3,})['"]/i);
    if (attrMatch && !isExcluded(attrMatch[2], line)) {
      if (!line.includes('t(') && !line.includes('useTranslation')) {
        results.push({
          text: attrMatch[2].trim(),
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'attribute',
          attribute: attrMatch[1],
          confidence: 'high'
        });
      }
    }
    
    // Pattern 3: Variable assignments
    const varMatch = line.match(/(const|let|var)\s+\w+\s*=\s*['"]([A-Z][a-zA-Z\s]{3,})['"]/);
    if (varMatch && !isExcluded(varMatch[2], line)) {
      const hasSpaces = varMatch[2].includes(' ');
      const startsWithCapital = /^[A-Z]/.test(varMatch[2]);
      if (hasSpaces && startsWithCapital && !line.includes('t(')) {
        results.push({
          text: varMatch[2].trim(),
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'variable',
          confidence: 'medium'
        });
      }
    }
    
    // Pattern 4: Alert/Confirm messages
    const alertMatch = line.match(/(alert|confirm)\s*\(\s*['"]([A-Z][a-zA-Z\s]{3,})['"]/i);
    if (alertMatch && !isExcluded(alertMatch[2], line)) {
      if (!line.includes('t(')) {
        results.push({
          text: alertMatch[2].trim(),
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'alert',
          confidence: 'high'
        });
      }
    }
  });
  
  return results;
}

function scanDirectory(dirPath, extensions = ['.tsx', '.ts']) {
  const results = [];
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.git', '.next', 'coverage', 'tests', 'test'].includes(entry.name)) {
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
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileResults = findHardcodedStrings(file, content);
      results.push(...fileResults);
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  
  return results;
}

function loadTranslationFile(namespace) {
  const filePath = path.join(TRANSLATIONS_DIR, `${namespace}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return {};
}

function saveTranslationFile(namespace, data) {
  const filePath = path.join(TRANSLATIONS_DIR, `${namespace}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

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

function fixHardcodedString(filePath, lineNumber, originalText, translationKey, namespace) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const line = lines[lineNumber - 1];
  
  let newLine = line;
  let needsUseTranslation = false;
  
  // Check if useTranslation is already imported
  const hasUseTranslationImport = content.includes("import { useTranslation } from 'react-i18next'") ||
                                  content.includes('import { useTranslation } from "react-i18next"');
  
  // Check if component already has useTranslation hook
  const hasUseTranslationHook = content.includes('const { t } = useTranslation') || 
                                content.includes('const { t } = useTranslation(');
  
  // Replace the hardcoded string
  if (line.includes(`>"${originalText}"<`) || line.includes(`>'${originalText}'<`)) {
    // JSX text content
    newLine = line.replace(
      new RegExp(`>\\s*['"]${originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*<`),
      `>{t('${translationKey}')}<`
    );
    needsUseTranslation = true;
  } else if (line.match(/['"]/)) {
    // Attribute or other string - be more careful
    const escapedText = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (line.includes(`"${originalText}"`) || line.includes(`'${originalText}'`)) {
      newLine = line.replace(
        new RegExp(`['"]${escapedText}['"]`),
        `{t('${translationKey}')}`
      );
      needsUseTranslation = true;
    }
  }
  
  // Only update if we actually made a change
  if (newLine !== line) {
    lines[lineNumber - 1] = newLine;
    
    // Add useTranslation import if needed
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
    
    // Add useTranslation hook in component if needed
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
          lines.splice(hookInsertIndex, 0, `${indent}const { t } = useTranslation();`);
        }
      }
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return { fixed: true, needsTranslation: true };
  }
  
  return { fixed: false, needsTranslation: false };
}

async function autoFix() {
  console.log('🔍 Scanning for hardcoded strings...\n');
  
  const results = scanDirectory(FRONTEND_DIR);
  
  // Filter to only high-confidence findings
  const highConfidence = results.filter(r => r.confidence === 'high');
  
  console.log(`📊 Found ${highConfidence.length} high-confidence hardcoded strings\n`);
  
  if (highConfidence.length === 0) {
    return {
      success: true,
      fixed: 0,
      skipped: 0,
      errors: 0,
      message: 'No hardcoded strings found that need fixing.'
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
      
      if (existingValue && existingValue !== result.text) {
        skipped.push({
          file: result.file,
          line: result.line,
          text: result.text,
          reason: 'Translation key already exists with different value'
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
          translationKey
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
      errors
    },
    message: `Successfully fixed ${fixed.length} hardcoded strings. ${skipped.length} skipped, ${errors.length} errors.`
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

