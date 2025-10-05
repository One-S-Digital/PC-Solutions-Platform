const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the English translation file
const enTranslations = JSON.parse(fs.readFileSync('/workspace/frontend/public/locales/en/translation.json', 'utf8'));

// Function to check if a key exists in nested object
function keyExists(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  return true;
}

// Function to set a nested key in an object
function setNestedKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Find all t() calls in the codebase
try {
  const result = execSync('grep -r "t(\'" /workspace/frontend --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v test', { encoding: 'utf8' });
  const lines = result.split('\n').filter(line => line.trim());
  
  console.log('=== Extracting Missing Translation Keys ===');
  const usedKeys = new Set();
  const missingKeys = [];
  
  lines.forEach(line => {
    const matches = line.match(/t\(['"`]([^'"`]+)['"`]\)/g);
    if (matches) {
      matches.forEach(match => {
        const keyMatch = match.match(/t\(['"`]([^'"`]+)['"`]\)/);
        if (keyMatch) {
          const key = keyMatch[1];
          usedKeys.add(key);
          if (!keyExists(enTranslations, key)) {
            missingKeys.push(key);
          }
        }
      });
    }
  });
  
  console.log(`Total keys used in code: ${usedKeys.size}`);
  console.log(`Missing keys: ${missingKeys.length}`);
  
  // Group missing keys by namespace
  const groupedKeys = {};
  missingKeys.forEach(key => {
    const parts = key.split('.');
    const namespace = parts[0];
    if (!groupedKeys[namespace]) {
      groupedKeys[namespace] = [];
    }
    groupedKeys[namespace].push(key);
  });
  
  console.log('\n=== Missing Keys by Namespace ===');
  Object.keys(groupedKeys).sort().forEach(namespace => {
    console.log(`\n${namespace}:`);
    groupedKeys[namespace].forEach(key => {
      console.log(`  - ${key}`);
    });
  });
  
  // Generate suggested translations for missing keys
  console.log('\n=== Suggested Translations ===');
  console.log('Add these to your translation files:');
  
  const suggestedTranslations = {};
  missingKeys.forEach(key => {
    // Generate a suggested translation based on the key
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Convert camelCase to Title Case
    const titleCase = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    setNestedKey(suggestedTranslations, key, titleCase);
  });
  
  console.log(JSON.stringify(suggestedTranslations, null, 2));
  
} catch (error) {
  console.error('Error running grep:', error.message);
}