#!/usr/bin/env node
/**
 * Find Hardcoded Strings Script
 * 
 * This script scans React/TypeScript files for hardcoded English strings
 * that should be translated using the i18n system.
 * 
 * Usage: node scripts/find-hardcoded-strings.mjs [options]
 * 
 * Options:
 *   --path <path>     Scan specific directory (default: frontend)
 *   --output <file>   Save results to JSON file
 *   --verbose         Show detailed output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Patterns that indicate hardcoded user-facing text
const HARDCODED_PATTERNS = [
  // String literals in JSX that look like UI text
  />\s*['"]([A-Z][a-zA-Z\s]{2,})['"]\s*</g,
  // String literals in JSX attributes (title, placeholder, aria-label, etc.)
  /(title|placeholder|aria-label|alt|label|text|message|error|success|warning|info|description|heading|subtitle|caption|tooltip|hint|help|content)\s*=\s*['"]([A-Z][a-zA-Z\s]{2,})['"]/gi,
  // String literals in return statements
  /return\s+['"]([A-Z][a-zA-Z\s]{2,})['"]/g,
  // String literals in variable assignments that look like UI text
  /(const|let|var)\s+\w+\s*=\s*['"]([A-Z][a-zA-Z\s]{2,})['"]/g,
  // String literals in array/object definitions
  /['"]([A-Z][a-zA-Z\s]{2,})['"]\s*[,:]/g,
  // Error messages, alerts, confirmations
  /(alert|confirm|console\.(log|error|warn))\s*\(\s*['"]([A-Z][a-zA-Z\s]{2,})['"]/gi,
  // Template literals with hardcoded text
  /`([A-Z][a-zA-Z\s]{2,})`/g,
];

// Patterns to exclude (these are likely not user-facing)
const EXCLUDE_PATTERNS = [
  /className/,           // CSS classes
  /import\s+.*from/,     // Import statements
  /export\s+.*from/,     // Export statements
  /console\.(log|error|warn|debug)/,  // Console logs (unless they're user-facing)
  /\/\/.*/,              // Comments
  /\/\*.*\*\//,         // Block comments
  /['"]https?:\/\//,     // URLs
  /['"]data:/,          // Data URIs
  /['"]#/,              // CSS selectors/IDs
  /['"]\./,             // CSS class selectors
  /['"]\w+\.\w+/,       // File extensions or object properties
  /['"]\d+/,            // Numbers
  /['"]\$\{/,           // Template literals with variables
  /process\.env/,        // Environment variables
  /__dirname|__filename/, // Node.js globals
  /useTranslation|useTranslation\(/, // Translation hooks (already using i18n)
  /t\(/,                 // Translation function calls
  /i18n/,                // i18n references
  /['"]\w+:\w+/,        // Translation keys (namespace:key)
  /['"]\w+\.\w+\.\w+/,  // Translation keys (nested)
];

// Common false positives to exclude
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
  'bg-', 'text-', 'border-', 'rounded-', 'shadow-',
];

function isExcluded(text, line) {
  // Check against exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(line)) {
      return true;
    }
  }
  
  // Check against false positives
  if (FALSE_POSITIVES.some(fp => text.includes(fp))) {
    return true;
  }
  
  // Exclude if it's a translation key pattern
  if (/^[a-z]+\.[a-z]+/.test(text) || text.includes(':')) {
    return true;
  }
  
  // Exclude very short strings (likely not user-facing)
  if (text.length < 3) {
    return true;
  }
  
  // Exclude strings that are all uppercase (likely constants)
  if (text === text.toUpperCase() && text.length > 2) {
    return true;
  }
  
  // Exclude strings that look like code identifiers
  if (/^[a-z]+[A-Z]/.test(text) || /^[a-z_]+$/.test(text)) {
    return true;
  }
  
  return false;
}

function findHardcodedStrings(filePath, content) {
  const results = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineNumber) => {
    // Skip lines that are clearly not user-facing
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Check each pattern
    for (const pattern of HARDCODED_PATTERNS) {
      const matches = [...line.matchAll(pattern)];
      
      for (const match of matches) {
        const text = match[1] || match[2] || match[0];
        
        if (!text || isExcluded(text, line)) {
          continue;
        }
        
        // Additional checks for user-facing text
        const hasSpaces = text.includes(' ');
        const startsWithCapital = /^[A-Z]/.test(text);
        const hasMultipleWords = text.split(/\s+/).length > 1;
        const looksLikeUI = hasSpaces && startsWithCapital && text.length > 5;
        
        // Check if it's a common UI word
        const isUIWord = UI_WORDS.some(word => 
          text === word || text.startsWith(word + ' ') || text.endsWith(' ' + word)
        );
        
        if (looksLikeUI || isUIWord || (hasMultipleWords && startsWithCapital)) {
          // Make sure it's not already using translation
          if (!line.includes('t(') && !line.includes('useTranslation')) {
            results.push({
              text: text.trim(),
              line: lineNumber + 1,
              context: line.trim(),
              file: filePath,
              confidence: isUIWord ? 'high' : (hasMultipleWords ? 'medium' : 'low')
            });
          }
        }
      }
    }
    
    // Special check for common patterns
    // Strings in JSX text content
    const jsxTextMatch = line.match(/>\s*['"]([A-Z][a-zA-Z\s]{3,})['"]\s*</);
    if (jsxTextMatch && !isExcluded(jsxTextMatch[1], line)) {
      if (!line.includes('t(') && !line.includes('useTranslation')) {
        results.push({
          text: jsxTextMatch[1].trim(),
          line: lineNumber + 1,
          context: line.trim(),
          file: filePath,
          confidence: 'high'
        });
      }
    }
  });
  
  return results;
}

function scanDirectory(dirPath, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const results = [];
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip node_modules, dist, build, etc.
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.git', '.next', 'coverage'].includes(entry.name)) {
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
  
  console.log(`📂 Scanning ${files.length} files in ${dirPath}...\n`);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileResults = findHardcodedStrings(file, content);
      results.push(...fileResults);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
    }
  }
  
  return results;
}

// Main execution
const args = process.argv.slice(2);
const pathIndex = args.indexOf('--path');
const outputIndex = args.indexOf('--output');
const verbose = args.includes('--verbose');

const scanPath = pathIndex !== -1 && args[pathIndex + 1]
  ? path.resolve(args[pathIndex + 1])
  : path.join(__dirname, '../frontend');

const outputFile = outputIndex !== -1 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : null;

console.log('🔍 Finding Hardcoded Strings\n');
console.log(`📁 Scanning: ${scanPath}\n`);

const results = scanDirectory(scanPath);

// Group results by file
const byFile = {};
results.forEach(result => {
  if (!byFile[result.file]) {
    byFile[result.file] = [];
  }
  byFile[result.file].push(result);
});

// Group by confidence
const byConfidence = {
  high: [],
  medium: [],
  low: []
};

results.forEach(result => {
  byConfidence[result.confidence].push(result);
});

// Print summary
console.log('\n📊 Summary:');
console.log(`   Total findings: ${results.length}`);
console.log(`   High confidence: ${byConfidence.high.length}`);
console.log(`   Medium confidence: ${byConfidence.medium.length}`);
console.log(`   Low confidence: ${byConfidence.low.length}`);
console.log(`   Files with issues: ${Object.keys(byFile).length}\n`);

// Print high confidence findings
if (byConfidence.high.length > 0) {
  console.log('🔴 High Confidence Findings (likely need translation):\n');
  byConfidence.high.slice(0, 20).forEach(result => {
    console.log(`   ${result.file}:${result.line}`);
    console.log(`   "${result.text}"`);
    if (verbose) {
      console.log(`   Context: ${result.context}`);
    }
    console.log('');
  });
  
  if (byConfidence.high.length > 20) {
    console.log(`   ... and ${byConfidence.high.length - 20} more\n`);
  }
}

// Save to file if requested
if (outputFile) {
  const report = {
    timestamp: new Date().toISOString(),
    scanPath,
    summary: {
      total: results.length,
      high: byConfidence.high.length,
      medium: byConfidence.medium.length,
      low: byConfidence.low.length,
      files: Object.keys(byFile).length
    },
    results: results,
    byFile: byFile,
    byConfidence: byConfidence
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Report saved to ${outputFile}`);
} else {
  console.log('\n💡 Tip: Use --output <file> to save detailed results to JSON');
}

console.log('\n✅ Scan complete!');

