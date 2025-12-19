#!/usr/bin/env node

/**
 * Check No TODO i18n Script
 * 
 * Scans translation JSON files for "TODO:" placeholders (case-insensitive).
 * Fails the commit if any are found.
 * 
 * Run manually: node scripts/check-no-todo-i18n.mjs
 * Runs automatically on git commit via husky pre-commit hook
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_PATH = path.join(__dirname, '..', 'packages', 'translations', 'locales');

/**
 * Recursively find all TODO values in an object
 */
function findTodoValues(obj, filePath, keyPath = '', todos = []) {
  if (typeof obj === 'string') {
    // Case-insensitive check for "TODO:"
    if (/todo:/i.test(obj)) {
      todos.push({
        file: filePath,
        keyPath: keyPath,
        value: obj
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findTodoValues(item, filePath, `${keyPath}[${index}]`, todos);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      findTodoValues(value, filePath, currentPath, todos);
    }
  }
  
  return todos;
}

/**
 * Scan a single JSON file for TODO values
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const relativePath = path.relative(LOCALES_PATH, filePath);
    return findTodoValues(data, relativePath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`❌ ${path.relative(LOCALES_PATH, filePath)}: Invalid JSON - ${error.message}`);
      return [{ file: path.relative(LOCALES_PATH, filePath), keyPath: '<parse error>', value: error.message }];
    }
    console.error(`❌ Error reading ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n🔍 Checking for TODO placeholders in translation files...\n');

  // Check if locales directory exists
  if (!fs.existsSync(LOCALES_PATH)) {
    console.error(`❌ Locales directory not found: ${LOCALES_PATH}`);
    process.exit(1);
  }

  const allTodos = [];
  
  // Scan all language directories
  const languages = fs.readdirSync(LOCALES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const lang of languages) {
    const langPath = path.join(LOCALES_PATH, lang);
    const files = fs.readdirSync(langPath)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(langPath, f));

    for (const file of files) {
      const todos = scanFile(file);
      allTodos.push(...todos);
    }
  }

  // Report results
  if (allTodos.length > 0) {
    console.error(`\n❌ Found ${allTodos.length} TODO placeholder(s) in translation files:\n`);
    
    // Group by file
    const byFile = {};
    allTodos.forEach(todo => {
      if (!byFile[todo.file]) {
        byFile[todo.file] = [];
      }
      byFile[todo.file].push(todo);
    });

    // Print each file's TODOs
    for (const [file, todos] of Object.entries(byFile)) {
      console.error(`  📄 ${file}:`);
      todos.forEach(todo => {
        const valuePreview = todo.value.length > 60 
          ? todo.value.substring(0, 60) + '...' 
          : todo.value;
        console.error(`     • ${todo.keyPath}: "${valuePreview}"`);
      });
      console.error('');
    }

    console.error('💡 Remove all "TODO:" placeholders before committing.');
    console.error('   Use proper translations or remove the TODO prefix.\n');
    process.exit(1);
  } else {
    console.log('✅ No TODO placeholders found in translation files!\n');
    process.exit(0);
  }
}

main();

