#!/usr/bin/env node

/**
 * Simple Translation Script for i18n Files
 * 
 * This script uses a more reliable approach to translate English translation files
 * to French and German, handling Google Translate API responses properly.
 * 
 * Usage:
 *   node scripts/translate-simple.js
 */

const fs = require('fs');
const path = require('path');

// Try to use translate-google-api, fallback to manual if not available
let translate;

try {
  translate = require('translate-google-api');
} catch (error) {
  console.log('📦 Installing translate-google-api...');
  const { execSync } = require('child_process');
  
  try {
    execSync('npm install translate-google-api', { stdio: 'inherit' });
    translate = require('translate-google-api');
  } catch (installError) {
    console.error('❌ Failed to install translate-google-api. Please run: npm install translate-google-api');
    process.exit(1);
  }
}

// Configuration
const CONFIG = {
  sourceLanguage: 'en',
  targetLanguages: ['fr', 'de'],
  sourceFile: 'frontend/public/locales/en/translation.json',
  outputDir: 'frontend/public/locales',
  delayBetweenRequests: 3000, // 3 second delay
  batchSize: 10, // Process in smaller batches
};

// Language mapping for Google Translate
const LANGUAGE_CODES = {
  fr: 'fr',
  de: 'de'
};

class SimpleI18nTranslator {
  constructor() {
    this.translatedCount = 0;
    this.totalKeys = 0;
  }

  async loadSourceFile() {
    const sourcePath = path.join(process.cwd(), CONFIG.sourceFile);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    return JSON.parse(content);
  }

  async translateString(str, targetLanguage) {
    if (!str || typeof str !== 'string') {
      return str;
    }

    // Skip if it's just a variable interpolation, HTML, or very short
    if (str.includes('{{') || str.includes('<') || str.length < 3) {
      return str;
    }

    try {
      const translated = await translate(str, { to: LANGUAGE_CODES[targetLanguage] });
      
      // Handle different response formats
      if (Array.isArray(translated)) {
        return translated[0] || str;
      }
      
      if (typeof translated === 'string') {
        return translated;
      }
      
      return str; // Fallback to original
    } catch (error) {
      console.warn(`  ⚠️  Failed to translate "${str}": ${error.message}`);
      return str;
    }
  }

  async translateObject(obj, targetLanguage) {
    console.log(`\n🌍 Translating to ${targetLanguage.toUpperCase()}...`);
    
    // Count total string values
    this.totalKeys = this.countStringValues(obj);
    this.translatedCount = 0;
    
    const result = await this.translateObjectRecursive(obj, targetLanguage);
    
    console.log(`✅ Translated ${this.translatedCount}/${this.totalKeys} values`);
    return result;
  }

  async translateObjectRecursive(obj, targetLanguage) {
    if (typeof obj === 'string') {
      const translated = await this.translateString(obj, targetLanguage);
      if (translated !== obj) {
        this.translatedCount++;
      }
      return translated;
    }
    
    if (Array.isArray(obj)) {
      const result = [];
      for (const item of obj) {
        result.push(await this.translateObjectRecursive(item, targetLanguage));
      }
      return result;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.translateObjectRecursive(value, targetLanguage);
      }
      return result;
    }
    
    return obj;
  }

  countStringValues(obj) {
    let count = 0;
    
    if (typeof obj === 'string') {
      return 1;
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        count += this.countStringValues(item);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        count += this.countStringValues(value);
      }
    }
    
    return count;
  }

  async saveTranslation(translatedObj, targetLanguage) {
    const outputPath = path.join(process.cwd(), CONFIG.outputDir, targetLanguage, 'translation.json');
    
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write with proper formatting
    const formattedJson = JSON.stringify(translatedObj, null, 2);
    fs.writeFileSync(outputPath, formattedJson, 'utf8');
    
    console.log(`💾 Saved ${targetLanguage.toUpperCase()} translation to: ${outputPath}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async translateAll() {
    console.log('🚀 Starting simple translation process...\n');

    // Load source file
    console.log(`📖 Loading source file: ${CONFIG.sourceFile}`);
    const sourceObj = await this.loadSourceFile();
    console.log(`📊 Found ${Object.keys(sourceObj).length} top-level keys\n`);

    // Translate to each target language
    for (const targetLanguage of CONFIG.targetLanguages) {
      try {
        console.log(`\n🌍 Processing ${targetLanguage.toUpperCase()}...`);
        
        const translatedObj = await this.translateObject(sourceObj, targetLanguage);
        await this.saveTranslation(translatedObj, targetLanguage);
        
        // Add delay between requests to respect rate limits
        if (targetLanguage !== CONFIG.targetLanguages[CONFIG.targetLanguages.length - 1]) {
          console.log(`⏳ Waiting ${CONFIG.delayBetweenRequests}ms before next translation...`);
          await this.delay(CONFIG.delayBetweenRequests);
        }
        
      } catch (error) {
        console.error(`💥 Failed to translate to ${targetLanguage}:`, error.message);
        
        // Continue with other languages even if one fails
        if (targetLanguage !== CONFIG.targetLanguages[CONFIG.targetLanguages.length - 1]) {
          console.log('⏭️  Continuing with next language...\n');
        }
      }
    }

    console.log('\n🎉 Translation process completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the translated files for accuracy');
    console.log('2. Test the application in different languages');
    console.log('3. Make manual adjustments if needed');
    console.log('4. Commit the changes to version control');
  }
}

// Main execution
async function main() {
  try {
    const translator = new SimpleI18nTranslator();
    await translator.translateAll();
    
  } catch (error) {
    console.error('💥 Translation script failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure you have internet connectivity');
    console.error('2. Check that the source file exists');
    console.error('3. Try running: npm install translate-google-api');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SimpleI18nTranslator };