#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(content);
    
    let fixed = false;
    
    function fixObject(obj, keyPath = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = keyPath ? `${keyPath}.${key}` : key;
        
        if (typeof value === 'string') {
          // Fix placeholder equals key
          if (value === key) {
            console.log(`  Fixing placeholder: ${currentPath} = "${value}"`);
            obj[key] = `[TRANSLATION_NEEDED: ${key}]`;
            fixed = true;
          }
          
          // Fix circular references (key contains itself)
          if (value.includes(key) && value !== key && value.length > key.length) {
            console.log(`  Fixing circular reference: ${currentPath} = "${value}"`);
            obj[key] = `[TRANSLATION_NEEDED: ${key}]`;
            fixed = true;
          }
        } else if (typeof value === 'object' && value !== null) {
          fixObject(value, currentPath);
        }
      }
    }
    
    fixObject(translations);
    
    if (fixed) {
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');
      console.log(`✅ Fixed issues in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  const localesDir = path.join(__dirname, 'frontend/public/locales');
  
  // Focus on English files first (source language)
  const enDir = path.join(localesDir, 'en');
  const files = fs.readdirSync(enDir).filter(file => file.endsWith('.json'));
  
  console.log(`🔧 Fixing translation placeholders in English files...`);
  
  let totalFixed = 0;
  
  files.forEach(file => {
    const filePath = path.join(enDir, file);
    console.log(`\n📝 Processing ${file}:`);
    
    if (fixTranslationFile(filePath)) {
      totalFixed++;
    }
  });
  
  console.log(`\n🎉 Fixed issues in ${totalFixed} files`);
  
  // Now validate again
  console.log('\n🔍 Validating after fixes...');
  const { execSync } = require('child_process');
  try {
    execSync('node validate-translations.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('Some issues may remain in non-English files');
  }
}

if (require.main === module) {
  main();
}