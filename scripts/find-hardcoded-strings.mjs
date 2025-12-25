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
import { execSync } from 'child_process';

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
  
  // Exclude exported const arrays (data-only constants, not UI strings)
  // Pattern: export const NAME = [ 'Value1', 'Value2' ] as const;
  if (/export\s+const\s+\w+\s*=\s*\[/.test(line) || 
      /\]\s+as\s+const/.test(line) ||
      /export\s+const\s+\w+\s*=\s*\[/.test(line.split('\n').slice(Math.max(0, line.split('\n').indexOf(line) - 5)).join('\n'))) {
    return true;
  }
  
  // Exclude lines with i18n-ignore comment
  if (line.includes('i18n-ignore') || line.includes('// i18n-ignore')) {
    return true;
  }
  
  // Exclude enum values (UPPER_SNAKE_CASE or PascalCase enum members)
  if (/^\s*(enum|export\s+enum|const\s+enum)/.test(line) || 
      /^\s*[A-Z_][A-Z0-9_]*\s*[:=]\s*['"]/.test(line) ||
      /^\s*[A-Z][A-Za-z]*\s*[:=]\s*['"]/.test(line)) {
    return true;
  }
  
  // Exclude status/constant values (common patterns)
  const statusPatterns = [
    /['"]\s*(ACTIVE|INACTIVE|PENDING|DRAFT|PUBLISHED|CLOSED|FILLED|ACCEPTED|REJECTED|CANCELLED|PAST_DUE)\s*['"]/,
    /['"]\s*(SUPER_ADMIN|ADMIN|FOUNDATION|PRODUCT_SUPPLIER|SERVICE_PROVIDER|EDUCATOR|PARENT)\s*['"]/,
    /['"]\s*(FULL_TIME|PART_TIME|CDI|CDD|INTERNSHIP)\s*['"]/,
    /['"]\s*(BASIC|ESSENTIAL|PROFESSIONAL|ENTERPRISE)\s*['"]/,
    /['"]\s*(AVATAR|LOGO|COVER_IMAGE|PRODUCT_IMAGE|DOCUMENT|CV|CATALOG)\s*['"]/,
  ];
  if (statusPatterns.some(pattern => pattern.test(line))) {
    return true;
  }
  
  // Exclude translation seed data (common in translation files or seed scripts)
  if (/seed|mock|sample|example.*translation/i.test(line) && 
      (line.includes('t(') || line.includes('useTranslation'))) {
    return true;
  }
  
  return false;
}

function findHardcodedStrings(filePath, content) {
  const results = [];
  const lines = content.split('\n');
  
  // Track if we're inside an exported const array (data-only constant)
  let insideExportedConstArray = false;
  let exportedConstArrayStart = -1;
  
  lines.forEach((line, lineNumber) => {
    // Skip lines that are clearly not user-facing
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Check for i18n-ignore-next-line comment on previous line
    if (lineNumber > 0) {
      const prevLine = lines[lineNumber - 1];
      if (prevLine && (prevLine.includes('// i18n-ignore-next-line') || 
                       prevLine.includes('// i18n-ignore'))) {
        return;
      }
    }
    
    // Track exported const arrays (data-only constants)
    if (/export\s+const\s+\w+\s*=\s*\[/.test(line)) {
      insideExportedConstArray = true;
      exportedConstArrayStart = lineNumber;
    }
    
    // Check if we're closing the array
    if (insideExportedConstArray && (/\];?\s*$/.test(line) || /\]\s+as\s+const/.test(line))) {
      insideExportedConstArray = false;
      exportedConstArrayStart = -1;
      return; // Skip the closing line
    }
    
    // Skip all lines inside exported const arrays (these are data values, not UI strings)
    if (insideExportedConstArray) {
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
    // Skip if this path should be excluded
    if (shouldExcludePath(currentPath)) {
      return;
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip excluded directories and paths
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.git', '.next', 'coverage'].includes(entry.name)) {
          continue;
        }
        // Skip excluded patterns
        if (!shouldExcludePath(fullPath)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir(dirPath);
  
  const relativePath = path.relative(path.join(__dirname, '..'), dirPath);
  if (files.length > 0) {
    console.log(`📂 Scanning ${files.length} files in ${relativePath}...`);
  }
  
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

// Directories to scan (UI code only)
const SCAN_DIRECTORIES = [
  path.join(__dirname, '../frontend'),
  path.join(__dirname, '../admin'),
  path.join(__dirname, '../packages/ui'),
  path.join(__dirname, '../packages/translations/src'),
];

// Directories to exclude from packages
const EXCLUDE_DIRECTORY_PATTERNS = [
  /[\\/]api[\\/]/,
  /[\\/]prisma[\\/]/,
  /[\\/]migrations[\\/]/,
  /[\\/]node_modules[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]build[\\/]/,
  /[\\/]\.git[\\/]/,
  /[\\/]\.next[\\/]/,
  /[\\/]coverage[\\/]/,
];

function shouldExcludePath(filePath) {
  return EXCLUDE_DIRECTORY_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Load allowlist from JSON file
 */
function loadAllowlist() {
  const allowlistPath = path.join(__dirname, 'i18n-allowlist.json');
  if (!fs.existsSync(allowlistPath)) {
    return { allowlist: [] };
  }
  
  try {
    const content = fs.readFileSync(allowlistPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Warning: Could not load allowlist: ${error.message}`);
    return { allowlist: [] };
  }
}

/**
 * Check if a result is allowlisted
 */
function isAllowlisted(result, allowlist) {
  return allowlist.some(entry => {
    // Match by file path (relative) and text
    const resultFile = path.relative(path.join(__dirname, '..'), result.file).replace(/\\/g, '/');
    const entryFile = entry.file.replace(/\\/g, '/');
    
    const fileMatches = resultFile === entryFile || resultFile.endsWith(entryFile);
    const textMatches = entry.text === result.text || result.text.includes(entry.text);
    const lineMatches = !entry.line || entry.line === result.line;
    const confidenceMatches = entry.confidence === result.confidence;
    
    return fileMatches && textMatches && lineMatches && confidenceMatches;
  });
}

/**
 * Get changed line ranges from git diff
 * Returns a Map: filePath -> Set of changed line numbers
 */
function getChangedLines() {
  const changedLinesMap = new Map();
  
  try {
    // Try to get the default branch (main or PCS-Development)
    let baseBranch = 'main';
    try {
      execSync('git rev-parse --verify PCS-Development', { stdio: 'ignore' });
      baseBranch = 'PCS-Development';
    } catch {
      try {
        execSync('git rev-parse --verify main', { stdio: 'ignore' });
        baseBranch = 'main';
      } catch {
        // If neither exists, check if we're in a git repo at all
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        // If we are, use HEAD~1 as fallback (previous commit)
        baseBranch = 'HEAD~1';
      }
    }
    
    // Get unified diff with line numbers (-U0 = no context lines)
    let diffOutput = '';
    try {
      diffOutput = execSync(`git diff -U0 ${baseBranch}...HEAD`, { 
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch {
      // No diff or error
    }
    
    // Also check staged files (for pre-commit hook)
    let stagedDiff = '';
    try {
      stagedDiff = execSync('git diff -U0 --cached', { 
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch {
      // No staged files or error
    }
    
    // Parse unified diff format to extract changed lines
    const parseDiff = (diffText) => {
      const lines = diffText.split('\n');
      let currentFile = null;
      let currentLineNum = 0;
      
      for (const line of lines) {
        // File header: +++ b/path/to/file
        if (line.startsWith('+++ b/')) {
          currentFile = line.substring(6).trim().replace(/\\/g, '/');
          if (!changedLinesMap.has(currentFile)) {
            changedLinesMap.set(currentFile, new Set());
          }
          currentLineNum = 0;
        }
        // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        else if (line.startsWith('@@')) {
          const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
          if (match && currentFile) {
            currentLineNum = parseInt(match[1], 10);
          }
        }
        // Added/modified line: starts with +
        else if (line.startsWith('+') && !line.startsWith('+++')) {
          if (currentFile && currentLineNum > 0) {
            changedLinesMap.get(currentFile).add(currentLineNum);
            currentLineNum++;
          }
        }
        // Context or removed line: doesn't start with +, but still increment if it's not a diff marker
        else if (!line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('@@') && currentLineNum > 0) {
          currentLineNum++;
        }
      }
    };
    
    parseDiff(diffOutput);
    parseDiff(stagedDiff);
    
    return changedLinesMap;
  } catch (error) {
    // Not in a git repo or git command failed
    // Return empty map - will treat all as legacy to be safe
    return new Map();
  }
}

/**
 * Check if a specific line in a file is newly changed (in git diff)
 */
function isLineNewlyChanged(filePath, lineNumber, changedLinesMap) {
  if (changedLinesMap.size === 0) {
    // If we can't determine changed lines, treat as legacy to avoid false positives
    return false;
  }
  
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Try exact match first
  if (changedLinesMap.has(normalizedPath)) {
    return changedLinesMap.get(normalizedPath).has(lineNumber);
  }
  
  // Try relative path match
  for (const [changedFile, changedLines] of changedLinesMap.entries()) {
    if (normalizedPath.endsWith(changedFile) || changedFile.endsWith(normalizedPath)) {
      return changedLines.has(lineNumber);
    }
  }
  
  return false;
}

function scanMultipleDirectories(directories) {
  const allResults = [];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    // Skip if this directory should be excluded
    if (shouldExcludePath(dir)) {
      continue;
    }
    
    const dirResults = scanDirectory(dir);
    allResults.push(...dirResults);
  }
  
  return allResults;
}

// Main execution
const args = process.argv.slice(2);
const pathIndex = args.indexOf('--path');
const outputIndex = args.indexOf('--output');
const verbose = args.includes('--verbose');

const customPath = pathIndex !== -1 && args[pathIndex + 1]
  ? path.resolve(args[pathIndex + 1])
  : null;

const outputFile = outputIndex !== -1 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : null;

console.log('🔍 Finding Hardcoded Strings\n');

let results;
if (customPath) {
  console.log(`📁 Scanning custom path: ${customPath}\n`);
  results = scanDirectory(customPath);
} else {
  console.log(`📁 Scanning UI directories:\n`);
  SCAN_DIRECTORIES.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`   • ${path.relative(path.join(__dirname, '..'), dir)}`);
    }
  });
  console.log('');
  results = scanMultipleDirectories(SCAN_DIRECTORIES);
}

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

// Load allowlist
const allowlistData = loadAllowlist();
const allowlist = allowlistData.allowlist || [];

// Get changed lines from git diff (file -> Set of line numbers)
const changedLinesMap = getChangedLines();

// Build map of files with legacy issues for early warning
const legacyIssuesByFile = {};

// Filter results: separate allowlisted, new, and legacy
const allowlisted = [];
const newIssues = [];
const legacyIssues = [];

results.forEach(result => {
  const normalizedFilePath = path.relative(path.join(__dirname, '..'), result.file).replace(/\\/g, '/');
  const isNew = isLineNewlyChanged(normalizedFilePath, result.line, changedLinesMap);
  const isAllowed = isAllowlisted(result, allowlist);
  
  if (isAllowed) {
    allowlisted.push(result);
  } else if (isNew) {
    newIssues.push(result);
  } else {
    legacyIssues.push(result);
    // Track legacy issues by file for early warning
    if (!legacyIssuesByFile[normalizedFilePath]) {
      legacyIssuesByFile[normalizedFilePath] = [];
    }
    legacyIssuesByFile[normalizedFilePath].push(result);
  }
});

// Early warning: Check if any changed files have legacy issues
const changedFiles = Array.from(changedLinesMap.keys());
const filesWithLegacyWarnings = changedFiles.filter(file => {
  // Try to match file paths
  return Object.keys(legacyIssuesByFile).some(legacyFile => 
    file === legacyFile || file.endsWith(legacyFile) || legacyFile.endsWith(file)
  );
});

if (filesWithLegacyWarnings.length > 0 && newIssues.length === 0) {
  console.log('\n💡 Early Warning:');
  filesWithLegacyWarnings.forEach(file => {
    const matchingLegacyFile = Object.keys(legacyIssuesByFile).find(lf => 
      file === lf || file.endsWith(lf) || lf.endsWith(file)
    );
    if (matchingLegacyFile) {
      const legacyCount = legacyIssuesByFile[matchingLegacyFile].length;
      console.log(`   ℹ️  ${file} contains ${legacyCount} legacy untranslated UI string(s).`);
      console.log(`      Consider fixing them while editing this file.`);
    }
  });
  console.log('');
}

// Group new issues by confidence
const newByConfidence = {
  high: newIssues.filter(r => r.confidence === 'high'),
  medium: newIssues.filter(r => r.confidence === 'medium'),
  low: newIssues.filter(r => r.confidence === 'low')
};

// Group legacy issues by confidence
const legacyByConfidence = {
  high: legacyIssues.filter(r => r.confidence === 'high'),
  medium: legacyIssues.filter(r => r.confidence === 'medium'),
  low: legacyIssues.filter(r => r.confidence === 'low')
};

// Print summary
console.log('\n📊 Summary:');
console.log(`   Total findings: ${results.length}`);
if (newIssues.length > 0) {
  console.log(`   ❌ NEW issues (BLOCKING): ${newIssues.length} (${newByConfidence.high.length} high, ${newByConfidence.medium.length} medium)`);
} else {
  console.log(`   ✅ NEW issues (BLOCKING): 0`);
}
if (legacyIssues.length > 0) {
  console.log(`   ⚠️  LEGACY issues (reported only): ${legacyIssues.length} (${legacyByConfidence.high.length} high, ${legacyByConfidence.medium.length} medium)`);
} else {
  console.log(`   ✅ LEGACY issues (reported only): 0`);
}
console.log(`   ℹ️  Allowlisted: ${allowlisted.length}`);
console.log(`   Files with issues: ${Object.keys(byFile).length}\n`);

// Report allowlisted items (non-fatal, for visibility)
if (allowlisted.length > 0) {
  console.log('ℹ️  Allowlisted Items (not blocking):\n');
  allowlisted.slice(0, 10).forEach(result => {
    console.log(`   ${result.file}:${result.line} - "${result.text.substring(0, 50)}${result.text.length > 50 ? '...' : ''}"`);
  });
  if (allowlisted.length > 10) {
    console.log(`   ... and ${allowlisted.length - 10} more allowlisted items\n`);
  } else {
    console.log('');
  }
}

// Report legacy medium-confidence issues (non-fatal, for visibility)
// Legacy high-confidence issues are reported separately with strict mode option
if (legacyByConfidence.medium.length > 0) {
  console.log('⚠️  LEGACY Medium-Confidence Issues (reported only, NOT blocking):\n');
  legacyByConfidence.medium.slice(0, 5).forEach(result => {
    console.log(`   ${result.file}:${result.line} - "${result.text.substring(0, 50)}${result.text.length > 50 ? '...' : ''}"`);
  });
  if (legacyByConfidence.medium.length > 5) {
    console.log(`   ... and ${legacyByConfidence.medium.length - 5} more legacy medium-confidence issues\n`);
  } else {
    console.log('');
  }
}

// FAIL on new high-confidence issues (always)
if (newByConfidence.high.length > 0) {
  console.log('❌ NEW high-confidence hardcoded strings found (BLOCKING). These must be translated before committing.\n');
  console.log('🔴 NEW High Confidence Findings (BLOCKING):\n');
  newByConfidence.high.slice(0, 20).forEach(result => {
    console.log(`   ${result.file}:${result.line}`);
    console.log(`   "${result.text}"`);
    if (verbose) {
      console.log(`   Context: ${result.context}`);
    }
    console.log('');
  });
  
  if (newByConfidence.high.length > 20) {
    console.log(`   ... and ${newByConfidence.high.length - 20} more\n`);
  }
  
  process.exit(1);
}

// FAIL on new medium-confidence issues
if (newByConfidence.medium.length > 0) {
  console.log('❌ NEW medium-confidence hardcoded strings found (BLOCKING). These must be translated before committing.\n');
  console.log('🟡 NEW Medium Confidence Findings (BLOCKING):\n');
  newByConfidence.medium.slice(0, 20).forEach(result => {
    console.log(`   ${result.file}:${result.line}`);
    console.log(`   "${result.text}"`);
    if (verbose) {
      console.log(`   Context: ${result.context}`);
    }
    console.log('');
  });
  
  if (newByConfidence.medium.length > 20) {
    console.log(`   ... and ${newByConfidence.medium.length - 20} more\n`);
  }
  
  process.exit(1);
}

// Report legacy high-confidence issues (non-blocking, unless strict mode enabled)
if (legacyByConfidence.high.length > 0) {
  const strictMode = process.env.I18N_FAIL_LEGACY_HIGH === 'true';
  
  if (strictMode) {
    console.log('❌ Legacy high-confidence hardcoded strings found. These must be fixed.\n');
    console.log('🔴 Legacy High Confidence Findings:\n');
    legacyByConfidence.high.slice(0, 10).forEach(result => {
      console.log(`   ${result.file}:${result.line}`);
      console.log(`   "${result.text}"`);
      console.log('');
    });
    
    if (legacyByConfidence.high.length > 10) {
      console.log(`   ... and ${legacyByConfidence.high.length - 10} more\n`);
    }
    
    console.log('💡 Set I18N_FAIL_LEGACY_HIGH=false to allow legacy issues (non-blocking mode).\n');
    process.exit(1);
  } else {
    // Non-blocking mode: just report, don't fail
    console.log('⚠️  LEGACY high-confidence hardcoded strings found (reported only, NOT blocking):\n');
    legacyByConfidence.high.slice(0, 5).forEach(result => {
      console.log(`   ${result.file}:${result.line} - "${result.text.substring(0, 50)}${result.text.length > 50 ? '...' : ''}"`);
    });
    
    if (legacyByConfidence.high.length > 5) {
      console.log(`   ... and ${legacyByConfidence.high.length - 5} more legacy high-confidence issues\n`);
    } else {
      console.log('');
    }
    
    console.log('💡 These should be fixed incrementally. Set I18N_FAIL_LEGACY_HIGH=true for strict mode.\n');
  }
}

// Success message
if (newIssues.length === 0) {
  console.log('✅ No NEW issues found - commit will proceed!');
  if (legacyByConfidence.high.length > 0 || legacyByConfidence.medium.length > 0 || allowlisted.length > 0) {
    console.log('   ℹ️  (Legacy/allowlisted items exist but are NOT blocking)');
  }
}

// Always generate report file
const reportPath = path.join(__dirname, 'i18n-hardcoded-report.json');
const report = {
  timestamp: new Date().toISOString(),
  scanPath: customPath || 'all-ui-directories',
  totals: {
    total: results.length,
    newHigh: newByConfidence.high.length,
    newMedium: newByConfidence.medium.length,
    legacyHigh: legacyByConfidence.high.length,
    legacyMedium: legacyByConfidence.medium.length,
    allowlisted: allowlisted.length
  },
  newHigh: newByConfidence.high.map(r => ({
    file: path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/'),
    line: r.line,
    text: r.text,
    confidence: r.confidence,
    reason: 'NEW hardcoded string detected in changed lines'
  })),
  newMedium: newByConfidence.medium.map(r => ({
    file: path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/'),
    line: r.line,
    text: r.text,
    confidence: r.confidence,
    reason: 'NEW hardcoded string detected in changed lines'
  })),
  legacyHigh: legacyByConfidence.high.map(r => ({
    file: path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/'),
    line: r.line,
    text: r.text,
    confidence: r.confidence,
    reason: 'Legacy hardcoded string (not in changed lines)'
  })),
  legacyMedium: legacyByConfidence.medium.map(r => ({
    file: path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/'),
    line: r.line,
    text: r.text,
    confidence: r.confidence,
    reason: 'Legacy hardcoded string (not in changed lines)'
  })),
  allowlisted: allowlisted.map(r => {
    const allowlistEntry = allowlist.find(a => 
      path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/') === a.file &&
      r.text === a.text &&
      r.line === a.line
    );
    return {
      file: path.relative(path.join(__dirname, '..'), r.file).replace(/\\/g, '/'),
      line: r.line,
      text: r.text,
      confidence: r.confidence,
      reason: allowlistEntry?.reason || 'Allowlisted legacy issue'
    };
  })
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

// Save to custom file if requested
if (outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Additional report saved to ${outputFile}`);
}

console.log(`\n📄 Report saved to ${path.relative(path.join(__dirname, '..'), reportPath)}`);

// Generate legacy backlog markdown (non-blocking)
try {
  execSync('node scripts/generate-legacy-backlog.mjs', { 
    stdio: 'ignore',
    cwd: path.join(__dirname, '..')
  });
} catch {
  // Silently fail - backlog generation is optional
}

// Developer instructions
console.log('\n📋 Developer Instructions:');
if (newIssues.length > 0) {
  console.log('   ❌ If you touched any of the NEW blocking lines above, replace them with t(\'namespace:key\')');
  console.log('      and add translation keys to packages/translations/locales/{en,fr,de}/*.json');
  console.log('      Example: <button>{t(\'common:buttons.save\')}</button>');
}
if (legacyByConfidence.high.length > 0 || legacyByConfidence.medium.length > 0) {
  console.log('   ⚠️  LEGACY issues are tracked in docs/i18n-legacy-backlog.md; they do not block releases.');
  console.log('      Fix them incrementally when working in those files.');
}

console.log('\n✅ Scan complete!');

