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

// Function to flatten object to get all possible keys
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(flattenKeys(obj[key], newKey));
      } else {
        keys.push(newKey);
      }
    }
  }
  return keys;
}

// Get all available keys
const availableKeys = flattenKeys(enTranslations);
console.log('Total available keys:', availableKeys.length);

// Find all t() calls in the codebase
try {
  const result = execSync('grep -r "t(\'" /workspace/frontend --include="*.tsx" --include="*.ts" | head -20', { encoding: 'utf8' });
  const lines = result.split('\n').filter(line => line.trim());
  
  console.log('\n=== Translation Keys Used in Code ===');
  const usedKeys = new Set();
  
  lines.forEach(line => {
    const matches = line.match(/t\(['"`]([^'"`]+)['"`]\)/g);
    if (matches) {
      matches.forEach(match => {
        const keyMatch = match.match(/t\(['"`]([^'"`]+)['"`]\)/);
        if (keyMatch) {
          const key = keyMatch[1];
          usedKeys.add(key);
          const exists = keyExists(enTranslations, key);
          console.log(`${exists ? '✅' : '❌'} ${key}`);
        }
      });
    }
  });
  
  console.log(`\nTotal keys used in code: ${usedKeys.size}`);
  
  // Find missing keys
  const missingKeys = [];
  usedKeys.forEach(key => {
    if (!keyExists(enTranslations, key)) {
      missingKeys.push(key);
    }
  });
  
  console.log(`\n=== Missing Keys (${missingKeys.length}) ===`);
  missingKeys.forEach(key => console.log(`❌ ${key}`));
  
} catch (error) {
  console.error('Error running grep:', error.message);
}