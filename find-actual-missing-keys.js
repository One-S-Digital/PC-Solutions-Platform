const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Finding ALL actual missing translation keys...');

// Read the current translation file
const enTranslations = JSON.parse(fs.readFileSync('/workspace/frontend/public/locales/en/translation.json', 'utf8'));

// Function to flatten translation keys
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...flattenKeys(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      keys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  return keys;
}

const existingKeys = new Set(flattenKeys(enTranslations));
console.log(`📊 Found ${existingKeys.size} existing translation keys`);

// Find all t() calls in the frontend
console.log('🔍 Searching for t() calls in frontend...');
let tCalls = [];
try {
  const result = execSync('cd /workspace/frontend && find . -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | xargs grep -h "t(" | grep -o "t([\'\"][^\'\"]*[\'\"]" | sed "s/t([\'\"//g" | sed "s/[\'\"]//g" | sort | uniq', { encoding: 'utf8' });
  tCalls = result.trim().split('\n').filter(line => line.trim());
} catch (error) {
  console.log('Error finding t() calls:', error.message);
}

console.log(`📊 Found ${tCalls.length} t() calls`);

// Find all Trans components with i18nKey
console.log('🔍 Searching for Trans components...');
let transKeys = [];
try {
  const result = execSync('cd /workspace/frontend && find . -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | xargs grep -h "i18nKey=" | grep -o "i18nKey=[\'\"][^\'\"]*[\'\"]" | sed "s/i18nKey=[\'\"//g" | sed "s/[\'\"]//g" | sort | uniq', { encoding: 'utf8' });
  transKeys = result.trim().split('\n').filter(line => line.trim());
} catch (error) {
  console.log('Error finding Trans keys:', error.message);
}

console.log(`📊 Found ${transKeys.length} Trans i18nKey attributes`);

// Combine all keys
const allUsedKeys = [...new Set([...tCalls, ...transKeys])];
console.log(`📊 Total unique keys used in code: ${allUsedKeys.length}`);

// Find missing keys
const missingKeys = allUsedKeys.filter(key => !existingKeys.has(key));
console.log(`❌ Missing keys: ${missingKeys.length}`);

if (missingKeys.length > 0) {
  console.log('\n🔑 MISSING TRANSLATION KEYS:');
  missingKeys.forEach((key, i) => {
    console.log(`   ${i + 1}. ${key}`);
  });
  
  // Group missing keys by namespace
  const missingByNamespace = {};
  missingKeys.forEach(key => {
    const parts = key.split('.');
    const namespace = parts[0];
    if (!missingByNamespace[namespace]) {
      missingByNamespace[namespace] = [];
    }
    missingByNamespace[namespace].push(key);
  });
  
  console.log('\n📊 MISSING KEYS BY NAMESPACE:');
  Object.keys(missingByNamespace).forEach(namespace => {
    console.log(`\n   ${namespace}: ${missingByNamespace[namespace].length} keys`);
    missingByNamespace[namespace].forEach(key => {
      console.log(`     - ${key}`);
    });
  });
  
  // Generate translation suggestions
  console.log('\n💡 GENERATING TRANSLATION SUGGESTIONS...');
  
  const translationSuggestions = {};
  missingKeys.forEach(key => {
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Generate a human-readable translation
    let translation = lastPart
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim();
    
    // Special cases
    if (key.includes('title')) translation = translation.replace('Title', '');
    if (key.includes('label')) translation = translation.replace('Label', '');
    if (key.includes('placeholder')) translation = translation.replace('Placeholder', '');
    if (key.includes('button')) translation = translation.replace('Button', '');
    if (key.includes('message')) translation = translation.replace('Message', '');
    if (key.includes('text')) translation = translation.replace('Text', '');
    if (key.includes('description')) translation = translation.replace('Description', '');
    
    translationSuggestions[key] = translation;
  });
  
  // Save missing keys report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalExistingKeys: existingKeys.size,
      totalUsedKeys: allUsedKeys.length,
      totalMissingKeys: missingKeys.length
    },
    missingKeys: missingKeys,
    missingByNamespace: missingByNamespace,
    translationSuggestions: translationSuggestions
  };
  
  fs.writeFileSync('/workspace/missing-keys-report.json', JSON.stringify(report, null, 2));
  console.log('\n📁 Report saved to: missing-keys-report.json');
  
  // Create a script to add missing keys
  const addKeysScript = `const fs = require('fs');

// Read current translations
const enTranslations = JSON.parse(fs.readFileSync('/workspace/frontend/public/locales/en/translation.json', 'utf8'));

// Missing keys to add
const missingKeys = ${JSON.stringify(translationSuggestions, null, 2)};

// Function to set nested key
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

// Add missing keys
Object.keys(missingKeys).forEach(key => {
  setNestedKey(enTranslations, key, missingKeys[key]);
});

// Save updated translations
fs.writeFileSync('/workspace/frontend/public/locales/en/translation.json', JSON.stringify(enTranslations, null, 2));

console.log('✅ Added ${missingKeys.length} missing translation keys to English locale file');
`;

  fs.writeFileSync('/workspace/add-actual-missing-keys.js', addKeysScript);
  console.log('📁 Created script: add-actual-missing-keys.js');
  
} else {
  console.log('✅ No missing translation keys found!');
}

console.log('\n🎯 SUMMARY:');
console.log(`   Existing keys: ${existingKeys.size}`);
console.log(`   Used keys: ${allUsedKeys.length}`);
console.log(`   Missing keys: ${missingKeys.length}`);