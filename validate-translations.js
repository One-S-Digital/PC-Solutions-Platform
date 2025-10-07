#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(content);
    
    const issues = [];
    
    function checkObject(obj, keyPath = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = keyPath ? `${keyPath}.${key}` : key;
        
        if (typeof value === 'string') {
          // Check if value equals the key (placeholder issue)
          if (value === key) {
            issues.push({
              type: 'placeholder_equals_key',
              path: currentPath,
              value: value,
              file: filePath
            });
          }
          
          // Check for circular references (key contains itself)
          if (value.includes(key) && value !== key) {
            issues.push({
              type: 'circular_reference',
              path: currentPath,
              value: value,
              file: filePath
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          checkObject(value, currentPath);
        }
      }
    }
    
    checkObject(translations);
    return issues;
  } catch (error) {
    return [{
      type: 'parse_error',
      path: 'root',
      value: error.message,
      file: filePath
    }];
  }
}

function main() {
  const localesDir = path.join(__dirname, 'frontend/public/locales');
  const allIssues = [];
  
  // Get all language directories
  const languages = fs.readdirSync(localesDir).filter(item => 
    fs.statSync(path.join(localesDir, item)).isDirectory()
  );
  
  console.log(`🔍 Validating translation files in: ${languages.join(', ')}`);
  
  languages.forEach(lang => {
    const langDir = path.join(localesDir, lang);
    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      const filePath = path.join(langDir, file);
      const issues = validateTranslationFile(filePath);
      allIssues.push(...issues);
      
      if (issues.length > 0) {
        console.log(`\n❌ Issues found in ${filePath}:`);
        issues.forEach(issue => {
          console.log(`  - ${issue.type}: ${issue.path} = "${issue.value}"`);
        });
      }
    });
  });
  
  if (allIssues.length === 0) {
    console.log('\n✅ All translation files are valid!');
    return 0;
  } else {
    console.log(`\n❌ Found ${allIssues.length} issues across all translation files`);
    
    // Group issues by type
    const issuesByType = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Issue Summary:');
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    return 1;
  }
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { validateTranslationFile };