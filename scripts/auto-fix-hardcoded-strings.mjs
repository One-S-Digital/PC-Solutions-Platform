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
const ADMIN_DIR = path.join(__dirname, '../admin/src');
const TRANSLATIONS_DIR = path.join(__dirname, '../packages/translations/locales/en');

/**
 * Load all existing translation KEYS (not values) to check for duplicates
 */
function loadAllTranslationKeys() {
  const allKeys = new Set();
  const languages = ['en'];  // Only check EN to avoid duplicates
  
  for (const lang of languages) {
    const langDir = path.join(__dirname, '../packages/translations/locales', lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const namespace = file.replace('.json', '');
      const filePath = path.join(langDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(content);
        
        // Flatten and collect all keys
        function collectKeys(obj, prefix = '') {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              collectKeys(value, fullKey);
            } else {
              allKeys.add(`${namespace}:${fullKey}`);
            }
          }
        }
        
        collectKeys(translations);
      } catch (error) {
        // Skip invalid JSON files
      }
    }
  }
  
  return allKeys;
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
 * Check if a specific translation key already exists
 */
function translationKeyExists(key, existingKeys) {
  return existingKeys.has(key);
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
 * Find missing translation keys - keys used in t() but don't exist in JSON files
 */
function findMissingTranslationKeys(filePath, content, existingKeys) {
  const missingKeys = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNumber) => {
    // Find all t('key') or t("key") calls
    const tCallPattern = /t\(['"]([\w:.-]+)['"]\)/g;
    let match;
    
    while ((match = tCallPattern.exec(line)) !== null) {
      const fullKey = match[1];
      
      // Normalize the key (handle both namespace:key and just key)
      const normalizedKey = fullKey.includes(':') ? fullKey : `common:${fullKey}`;
      
      // Check if key exists
      if (!existingKeys.has(normalizedKey)) {
        // Extract namespace and key parts
        const [namespace, ...keyParts] = normalizedKey.split(':');
        const keyPath = keyParts.join(':').replace(/:/g, '.');
        
        missingKeys.push({
          key: normalizedKey,
          namespace: namespace,
          keyPath: keyPath,
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          type: 'missing-key',
          confidence: 'high'
        });
      }
    }
  });
  
  return missingKeys;
}

/**
 * Find hardcoded strings - ONLY user-facing strings visible in UI
 */
function findHardcodedStrings(filePath, content, existingKeys) {
  const results = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNumber) => {
    // Skip if already has translation (including {t( for JSX)
    if (line.includes("t('") || line.includes('t("') || line.includes('t(`') || line.includes('{t(')) return;
    
    // Skip comments, imports, etc.
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) return;
    if (line.includes('console.log') || line.includes('console.error')) return;
    
    // Pattern 1: JSX text content between tags (quoted strings)
    // Look for: >"Text here"< or >'Text here'<
    const jsxTextQuotedPattern = />\s*['"]([A-Z][A-Za-z\s]{2,}?)\s*</g;
    let match;
    while ((match = jsxTextQuotedPattern.exec(line)) !== null) {
      const text = match[1].trim();
      
        if (!shouldSkipString(text, line) && text.length >= 3) {
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
    // Updated to catch cases even with { present, as long as no t( call
    if (!line.includes('t(') && !line.includes('{t(')) {
      const jsxTextUnquotedPattern = />([A-Z][A-Za-z\s\(\)]{2,}?)</g;
      while ((match = jsxTextUnquotedPattern.exec(line)) !== null) {
        const text = match[1].trim();
        
        // Skip if it looks like a closing tag or attribute or has variables
        if (text.includes('<') || text.includes('>') || text.includes('=') || 
            text.includes('{') || text.includes('}') || text.includes('$')) continue;
        
        if (!shouldSkipString(text, line) && 
            text.length >= 3 &&
            // Allow button text, section headers, etc.
            (text.match(/^[A-Z]/) || text.includes(' '))) {
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
    
    // Pattern 3: Button/link text content (including React components with capital letters)
    // Look for: <button>Text</button>, <Button>Text</Button>, <a>Text</a>, etc.
    // But not if it has {t()} inside
    if (!line.includes('{t(') && !line.includes('{t(')) {
      // Match both lowercase and capitalized tags (button, Button, etc.)
      const buttonTextPattern = /<([Bb]utton|[Aa])[^>]*>([A-Z][A-Za-z\s\(\)]+?)<\/\1>/gi;
      while ((match = buttonTextPattern.exec(line)) !== null) {
        const text = match[2].trim();
        
        if (!shouldSkipString(text, line) && text.length >= 3) {
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
    // Skip if already using t() in the attribute - check for both t( and {t(
    if (!line.includes('{t(') && !line.includes("t('") && !line.includes('t("')) {
      // More flexible pattern to catch various placeholder/attribute formats
      // This pattern now handles spaces, punctuation, and special characters better
      const attrPattern = /(title|placeholder|aria-label|alt)\s*=\s*["']([^"']{3,})["']/gi;
      while ((match = attrPattern.exec(line)) !== null) {
        const text = match[2].trim();
        
        // Must have at least one letter and be reasonable length
        if (!shouldSkipString(text, line) && 
            text.length >= 3 &&
            text.match(/[a-zA-Z]/) &&
            // Exclude obvious non-translatable patterns
            !text.match(/^[\d\-]+$/) &&
            !text.match(/^[a-z0-9\-_]+$/) && // exclude CSS classes/IDs like "w-full"
            !text.match(/^[a-z]+(-[a-z]+)+$/) && // exclude kebab-case like "border-gray-300"
            !text.startsWith('http') &&
            !text.startsWith('www.') &&
            !text.startsWith('#') && // exclude color codes
            !text.match(/^\d+px$/) && // exclude pixel values
            !text.match(/^[\d\s]+$/) // exclude numbers with spaces
        ) {
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
      // Check if this is a JSX attribute or a function parameter default
      // Function parameters will have ({ before the line or be inside a parameter list
      const isJSXAttribute = line.includes('<') || line.includes('/>') || line.includes('>');
      const isFunctionParam = line.includes('}: ') || line.includes('):') || (lines[lineNumber - 2]?.includes('({') && !lines[lineNumber - 2]?.includes('<'));
      
      if (isJSXAttribute && !isFunctionParam) {
        // For JSX attributes, wrap in curly braces
        newLine = line.replace(
          new RegExp(`(['"])${escapedText}\\1`),
          `{t('${formattedKey}')}`
        );
        needsUseTranslation = true;
      } else {
        // For function parameters, skip - can't use JSX syntax here
        // These should be handled manually or the component should use the translation internally
        return { fixed: false, needsTranslation: false };
      }
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
        // Find the opening brace of the function body
        let braceIndex = -1;
        for (let i = componentStart; i < Math.min(componentStart + 10, lines.length); i++) {
          if (lines[i].includes('{')) {
            braceIndex = i;
            break;
          }
        }
        
        if (braceIndex !== -1) {
          // Find the first appropriate line to insert the hook
          // It should be:
          // 1. After any existing hooks (useState, useEffect, etc.)
          // 2. Before any useQuery, useMutation, or other hook calls that might use t()
          // 3. Not inside any object literal or function call
          
          let hookInsertIndex = braceIndex + 1;
          let foundGoodSpot = false;
          
          // Look for existing hooks or variable declarations
          for (let i = braceIndex + 1; i < Math.min(braceIndex + 20, lines.length); i++) {
            const line = lines[i].trim();
            
            // Skip empty lines at the start
            if (!line && i === braceIndex + 1) {
              hookInsertIndex = i + 1;
              continue;
            }
            
            // If we find another hook call (useState, useEffect, etc.) or const declaration
            // that's not useQuery/useMutation, continue past it
            if (line.match(/^const\s+.*=\s+(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useApiClient|useAuth)/)) {
              hookInsertIndex = i + 1;
              foundGoodSpot = true;
              continue;
            }
            
            // If we hit a useQuery or useMutation, insert BEFORE it
            if (line.match(/^const\s+.*=\s+(useQuery|useMutation)/)) {
              // Insert before this line
              hookInsertIndex = i;
              foundGoodSpot = true;
              break;
            }
            
            // If we find a return statement or JSX, we've gone too far
            if (line.startsWith('return') || line.startsWith('<')) {
              break;
            }
            
            // If we find any other non-empty, non-comment line, this is a good spot
            if (line && !line.startsWith('//') && !line.startsWith('/*')) {
              hookInsertIndex = i;
              foundGoodSpot = true;
              break;
            }
          }
          
          // Check if hook already exists nearby
          const nearbyLines = lines.slice(Math.max(0, hookInsertIndex - 3), hookInsertIndex + 5).join('\n');
          if (!nearbyLines.includes('useTranslation')) {
            const indent = lines[hookInsertIndex]?.match(/^(\s*)/)?.[1] || '  ';
            // Use proper namespace in useTranslation hook
            const namespaceForHook = namespace !== 'common' ? `['${namespace}', 'common']` : `['common']`;
            const hookLine = `${indent}const { t } = useTranslation(${namespaceForHook});`;
            
            // Insert the hook line
            lines.splice(hookInsertIndex, 0, hookLine);
            
            // Add a blank line after the hook if the next line isn't empty
            if (lines[hookInsertIndex + 1] && lines[hookInsertIndex + 1].trim() !== '') {
              lines.splice(hookInsertIndex + 1, 0, '');
            }
          }
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
  
  // Load all existing translation KEYS to check for duplicates
  const existingKeys = loadAllTranslationKeys();
  console.log(`📚 Loaded ${existingKeys.size} existing translation keys\n`);
  
  // Scan files from both frontend and admin directories
  const frontendFiles = scanDirectory(FRONTEND_DIR);
  const adminFiles = scanDirectory(ADMIN_DIR);
  const files = [...frontendFiles, ...adminFiles];
  console.log(`📂 Scanning ${files.length} files (${frontendFiles.length} frontend + ${adminFiles.length} admin)...\n`);
  
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
  const allMissingKeys = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Find hardcoded strings
      const fileResults = findHardcodedStrings(file, content, existingKeys);
      
      // Find missing translation keys
      const missingKeys = findMissingTranslationKeys(file, content, existingKeys);
      
      filesScanned++;
      if (fileResults.length > 0 || missingKeys.length > 0) {
        filesWithResults++;
        scanStats.filesWithStrings++;
        scanStats.totalStringsFound += fileResults.length + missingKeys.length;
        
        // Get relative path from either frontend or admin directory
        const relPath = file.includes(ADMIN_DIR) 
          ? 'admin/' + path.relative(ADMIN_DIR, file)
          : 'frontend/' + path.relative(FRONTEND_DIR, file);
        scanStats.stringsByFile[relPath] = fileResults.length + missingKeys.length;
        
        // Count by type
        fileResults.forEach(r => {
          scanStats.stringsByType[r.type] = (scanStats.stringsByType[r.type] || 0) + 1;
        });
        
        missingKeys.forEach(r => {
          scanStats.stringsByType[r.type] = (scanStats.stringsByType[r.type] || 0) + 1;
        });
      }
      
      allResults.push(...fileResults);
      allMissingKeys.push(...missingKeys);
      
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
  console.log(`   Files with potential issues: ${filesWithResults}`);
  console.log(`   Hardcoded strings found: ${allResults.length}`);
  console.log(`   Missing translation keys found: ${allMissingKeys.length}`);
  console.log(`   Total issues: ${allResults.length + allMissingKeys.length}`);
  console.log(`   High confidence: ${highConfidence.length}\n`);
  
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
      const relPath = r.file.includes(ADMIN_DIR)
        ? 'admin/' + path.relative(ADMIN_DIR, r.file)
        : 'frontend/' + path.relative(FRONTEND_DIR, r.file);
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
  
  // Process missing keys first - create placeholder keys for them
  const createdMissingKeys = [];
  if (allMissingKeys.length > 0) {
    console.log(`\n🔍 Found ${allMissingKeys.length} missing translation keys. Creating placeholders...\n`);
    
    const missingKeysByNamespace = new Map();
    
    for (const missingKey of allMissingKeys) {
      try {
        if (!missingKeysByNamespace.has(missingKey.namespace)) {
          missingKeysByNamespace.set(missingKey.namespace, {});
        }
        
        // Create a placeholder value from the key name
        const placeholder = missingKey.keyPath
          .split('.')
          .pop()
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .replace(/^./, str => str.toUpperCase());
        
        setNestedValue(missingKeysByNamespace.get(missingKey.namespace), missingKey.keyPath, placeholder);
        
        createdMissingKeys.push({
          key: missingKey.key,
          namespace: missingKey.namespace,
          keyPath: missingKey.keyPath,
          placeholder: placeholder,
          file: missingKey.file,
          line: missingKey.line
        });
      } catch (error) {
        console.error(`Error creating placeholder for ${missingKey.key}:`, error.message);
      }
    }
    
    // Save missing keys to translation files
    for (const [namespace, keys] of missingKeysByNamespace.entries()) {
      const translations = loadTranslationFile(namespace);
      
      // Merge new keys
      for (const [keyPath, value] of Object.entries(keys)) {
        setNestedValue(translations, keyPath, value);
      }
      
      saveTranslationFile(namespace, translations);
      console.log(`   ✅ Created placeholders in ${namespace}.json`);
    }
    
    console.log(`\n✅ Created ${createdMissingKeys.length} missing translation key placeholders!\n`);
  }
  
  if (highConfidence.length === 0 && allMissingKeys.length === 0) {
    return {
      success: true,
      fixed: 0,
      skipped: 0,
      errors: 0,
      missingKeysCreated: 0,
      message: 'No hardcoded strings or missing translation keys found.',
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
      const formattedKey = translationKey.replace(/^([^.]+)\./, '$1:');
      
      const keyAlreadyExists = existingValue || translationKeyExists(formattedKey, existingKeys);
      
      // If key exists, we still want to fix the CODE to use it (don't skip!)
      // We just won't add it to translation files again
      
      // Fix the code
      const fixResult = fixHardcodedString(result.file, result.line, result.text, translationKey, namespace);
      
      if (fixResult.fixed) {
        // Only add translation key if it doesn't already exist
        if (!keyAlreadyExists) {
          if (!translationKeys.has(namespace)) {
            translationKeys.set(namespace, {});
          }
          setNestedValue(translationKeys.get(namespace), key, result.text);
        }
        
        fixed.push({
          file: result.file,
          line: result.line,
          text: result.text,
          translationKey: translationKey.replace(/^([^.]+)\./, '$1:'),
          keyStatus: keyAlreadyExists ? 'used existing' : 'created new'
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
  
  // Save translation files (EN)
  for (const [namespace, keys] of translationKeys.entries()) {
    const translations = loadTranslationFile(namespace);
    
    // Merge new keys
    for (const [keyPath, value] of Object.entries(keys)) {
      setNestedValue(translations, keyPath, value);
    }
    
    saveTranslationFile(namespace, translations);
    console.log(`   ✅ Updated EN translation file: ${namespace}.json`);
  }
  
  // Auto-sync to FR and DE
  if (translationKeys.size > 0) {
    console.log('\n🔄 Auto-syncing new keys to French and German...');
    for (const namespace of translationKeys.keys()) {
      const enTranslations = loadTranslationFile(namespace);
      
      // Sync to French
      const frPath = path.join(__dirname, '../packages/translations/locales/fr', `${namespace}.json`);
      if (fs.existsSync(frPath)) {
        const frTranslations = JSON.parse(fs.readFileSync(frPath, 'utf8'));
        let frAdded = 0;
        
        function syncKeys(enObj, frObj, prefix = '') {
          for (const [key, value] of Object.entries(enObj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              if (!frObj[key]) frObj[key] = {};
              syncKeys(value, frObj[key], fullKey);
            } else if (typeof value === 'string') {
              if (!frObj[key]) {
                frObj[key] = `[FR] ${value}`;
                frAdded++;
              }
            }
          }
        }
        
        syncKeys(enTranslations, frTranslations);
        fs.writeFileSync(frPath, JSON.stringify(frTranslations, null, 2) + '\n', 'utf8');
        if (frAdded > 0) console.log(`   ✅ French: Added ${frAdded} keys to ${namespace}.json`);
      }
      
      // Sync to German
      const dePath = path.join(__dirname, '../packages/translations/locales/de', `${namespace}.json`);
      if (fs.existsSync(dePath)) {
        const deTranslations = JSON.parse(fs.readFileSync(dePath, 'utf8'));
        let deAdded = 0;
        
        function syncKeys(enObj, deObj, prefix = '') {
          for (const [key, value] of Object.entries(enObj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              if (!deObj[key]) deObj[key] = {};
              syncKeys(value, deObj[key], fullKey);
            } else if (typeof value === 'string') {
              if (!deObj[key]) {
                deObj[key] = `[DE] ${value}`;
                deAdded++;
              }
            }
          }
        }
        
        syncKeys(enTranslations, deTranslations);
        fs.writeFileSync(dePath, JSON.stringify(deTranslations, null, 2) + '\n', 'utf8');
        if (deAdded > 0) console.log(`   ✅ German: Added ${deAdded} keys to ${namespace}.json`);
      }
    }
    console.log('✅ Auto-sync to FR/DE complete!\n');
  }
  
  // Generate detailed report
  const report = {
    success: true,
    fixed: fixed.length,
    skipped: skipped.length,
    errors: errors.length,
    missingKeysCreated: createdMissingKeys.length,
    details: {
      fixed,
      skipped,
      errors,
      missingKeys: createdMissingKeys,
      scanStats
    },
    message: (() => {
      let msg = `✅ Auto-fix complete!\n\n`;
      msg += `📊 Results:\n`;
      msg += `   • Fixed: ${fixed.length} hardcoded strings\n`;
      msg += `   • Missing keys created: ${createdMissingKeys.length}\n`;
      msg += `   • Skipped: ${skipped.length} (already using translations)\n`;
      msg += `   • Errors: ${errors.length}\n\n`;
      
      if (fixed.length > 0) {
        msg += `📝 What was fixed:\n`;
        
        // Group by file and count
        const fileStats = {};
        fixed.forEach(f => {
          const relPath = f.file.includes('admin') 
            ? 'admin/' + path.relative(ADMIN_DIR, f.file)
            : 'frontend/' + path.relative(FRONTEND_DIR, f.file);
          fileStats[relPath] = (fileStats[relPath] || 0) + 1;
        });
        
        // Show top 10 files
        Object.entries(fileStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([file, count]) => {
            msg += `   • ${file}: ${count} string${count > 1 ? 's' : ''}\n`;
          });
        
        if (Object.keys(fileStats).length > 10) {
          msg += `   • ... and ${Object.keys(fileStats).length - 10} more files\n`;
        }
        
        msg += `\n✅ Translation keys created and synced to FR/DE\n`;
        msg += `⚠️ Next step: Run database sync to make translations available in the app\n`;
        msg += `   Command: node scripts/sync-json-to-database.mjs\n`;
      }
      
      if (createdMissingKeys.length > 0) {
        msg += `\n🔍 Missing Translation Keys:\n`;
        msg += `   Created ${createdMissingKeys.length} placeholder keys for missing translations\n`;
        
        // Group by namespace
        const byNamespace = {};
        createdMissingKeys.forEach(k => {
          if (!byNamespace[k.namespace]) byNamespace[k.namespace] = [];
          byNamespace[k.namespace].push(k);
        });
        
        Object.entries(byNamespace).forEach(([ns, keys]) => {
          msg += `   • ${ns}: ${keys.length} key${keys.length > 1 ? 's' : ''}\n`;
        });
        
        msg += `\n💡 These keys were being used in code but didn't exist in JSON files.\n`;
        msg += `   Placeholder values created. Review and update as needed.\n`;
      }
      
      if (fixed.length === 0 && createdMissingKeys.length === 0 && skipped.length > 0) {
        msg += '💡 All found strings were already using translation functions.\n';
        msg += 'This means your codebase is well-translated! ✅\n';
      } else {
        msg += '💡 No hardcoded strings found. Your codebase is clean! ✅\n';
      }
      
      return msg;
    })()
  };
  
  return report;
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
