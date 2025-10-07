const fs = require('fs');
const path = require('path');

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

// Find all t() calls by reading files directly
console.log('🔍 Searching for t() calls in frontend files...');

function findTranslationKeys(dir) {
  const keys = new Set();
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find t('key') patterns
      const tMatches = content.match(/t\(['"`]([^'"`]+)['"`]\)/g);
      if (tMatches) {
        tMatches.forEach(match => {
          const key = match.match(/t\(['"`]([^'"`]+)['"`]\)/)[1];
          keys.add(key);
        });
      }
      
      // Find i18nKey="key" patterns
      const i18nMatches = content.match(/i18nKey=['"`]([^'"`]+)['"`]/g);
      if (i18nMatches) {
        i18nMatches.forEach(match => {
          const key = match.match(/i18nKey=['"`]([^'"`]+)['"`]/)[1];
          keys.add(key);
        });
      }
      
      // Find useTranslation().t('key') patterns
      const useTMatches = content.match(/useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]\)/g);
      if (useTMatches) {
        useTMatches.forEach(match => {
          const key = match.match(/useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]\)/)[1];
          keys.add(key);
        });
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js'))) {
          scanFile(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDirectory(dir);
  return Array.from(keys);
}

const allUsedKeys = findTranslationKeys('/workspace/frontend');
console.log(`📊 Found ${allUsedKeys.length} translation keys used in code`);

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
    
    // Special cases for common patterns
    if (key.includes('title')) translation = translation.replace('Title', '');
    if (key.includes('label')) translation = translation.replace('Label', '');
    if (key.includes('placeholder')) translation = translation.replace('Placeholder', '');
    if (key.includes('button')) translation = translation.replace('Button', '');
    if (key.includes('message')) translation = translation.replace('Message', '');
    if (key.includes('text')) translation = translation.replace('Text', '');
    if (key.includes('description')) translation = translation.replace('Description', '');
    if (key.includes('alert')) translation = translation.replace('Alert', '');
    if (key.includes('submit')) translation = translation.replace('Submit', '');
    if (key.includes('cancel')) translation = translation.replace('Cancel', '');
    if (key.includes('save')) translation = translation.replace('Save', '');
    if (key.includes('delete')) translation = translation.replace('Delete', '');
    if (key.includes('edit')) translation = translation.replace('Edit', '');
    if (key.includes('add')) translation = translation.replace('Add', '');
    if (key.includes('remove')) translation = translation.replace('Remove', '');
    if (key.includes('create')) translation = translation.replace('Create', '');
    if (key.includes('update')) translation = translation.replace('Update', '');
    
    // Handle specific patterns
    if (key.includes('welcomeMessage')) translation = `Welcome, {{name}}!`;
    if (key.includes('ticketSubmittedAlert')) translation = 'Ticket submitted successfully!';
    if (key.includes('furtherAssistanceTitle')) translation = 'Need Further Assistance?';
    if (key.includes('furtherAssistanceText')) translation = 'If you need additional help, please contact our support team at';
    if (key.includes('submitTicketTitle')) translation = 'Submit a Support Ticket';
    if (key.includes('subjectLabel')) translation = 'Subject';
    if (key.includes('subjectPlaceholder')) translation = 'Enter ticket subject...';
    if (key.includes('messageLabel')) translation = 'Message';
    if (key.includes('messagePlaceholder')) translation = 'Describe your issue...';
    if (key.includes('submitTicket')) translation = 'Submit Ticket';
    if (key.includes('sales.title')) translation = 'Sales Overview';
    if (key.includes('totalOrders')) translation = 'Total Orders';
    if (key.includes('revenueMonth')) translation = 'Revenue This Month';
    if (key.includes('topSelling')) translation = 'Top Selling Product';
    
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
  
  fs.writeFileSync('/workspace/actual-missing-keys-report.json', JSON.stringify(report, null, 2));
  console.log('\n📁 Report saved to: actual-missing-keys-report.json');
  
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