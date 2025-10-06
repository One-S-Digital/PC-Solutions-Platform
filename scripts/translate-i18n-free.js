#!/usr/bin/env node

/**
 * Free Translation Script for i18n Files
 * 
 * This script uses Google Translate (via translate-google-api) to automatically 
 * translate English translation files to French and German.
 * 
 * Usage:
 *   npm run translate
 *   node scripts/translate-i18n-free.js
 */

const fs = require('fs');
const path = require('path');

// Try to use translate-google-api, fallback to manual if not available
let translate;
let usingOfflineFallback = false;
const OFFLINE_TRANSLATIONS_DIR = path.join('translation-files-consolidated');

try {
  translate = require('translate-google-api');
} catch (error) {
  console.warn('⚠️  translate-google-api not available. Falling back to offline translations if provided.');
  usingOfflineFallback = true;
  translate = async (value, { to }) => ({ value, to });
}

// Configuration
const CONFIG = {
  sourceLanguage: 'en',
  targetLanguages: ['fr', 'de'],
  sourceFile: 'frontend/public/locales/en/translation.json',
  outputDir: 'frontend/public/locales',
  delayBetweenRequests: 5000, // 5 second delay to respect rate limits
};

// Language mapping for Google Translate
const LANGUAGE_CODES = {
  fr: 'fr',
  de: 'de'
};

class FreeI18nTranslator {
  constructor() {
    this.translatedCount = 0;
    this.totalKeys = 0;
    this.offlineDictionaries = {};
  }

  async loadSourceFile() {
    const sourcePath = path.join(process.cwd(), CONFIG.sourceFile);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    return JSON.parse(content);
  }

  async translateValue(value, targetLanguage, pathParts = []) {
    if (typeof value === 'string') {
      // Skip if it's just a variable interpolation or HTML
      if (value.includes('{{') || value.includes('<') || value.length < 3) {
        return value;
      }

      try {
        console.log(`  Translating: "${value}"`);
        if (usingOfflineFallback) {
          const keyPath = pathParts.join('.');
          const offlineValue = this.offlineDictionaries[targetLanguage]?.get(keyPath);

          if (offlineValue) {
            this.translatedCount++;
            return offlineValue;
          }

          console.warn(`  ⚠️  Offline translation missing for key: ${keyPath}. Keeping original value.`);
          return value;
        }

        const translated = await translate(value, { to: LANGUAGE_CODES[targetLanguage] });
        this.translatedCount++;

        // Handle array responses from Google Translate
        if (Array.isArray(translated)) {
          return translated[0] || value;
        }
        
        return translated;
      } catch (error) {
        console.warn(`  ⚠️  Failed to translate "${value}": ${error.message}`);
        return value; // Return original if translation fails
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively translate object values
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = await this.translateValue(val, targetLanguage, [...pathParts, key]);
      }
      return result;
    }
    
    return value; // Return as-is for non-string values
  }

  async translateObject(obj, targetLanguage) {
    console.log(`\n🌍 Translating to ${targetLanguage.toUpperCase()}...`);

    // Count total string values to translate
    this.totalKeys = this.countStringValues(obj);
    this.translatedCount = 0;

    const translated = await this.translateValue(obj, targetLanguage);

    console.log(`✅ Translated ${this.translatedCount}/${this.totalKeys} values`);
    return translated;
  }

  prepareOfflineDictionary(sourceObj, targetLanguage) {
    if (!usingOfflineFallback) {
      return;
    }

    const targetFilePath = path.join(process.cwd(), OFFLINE_TRANSLATIONS_DIR, targetLanguage, 'translation.json');
    if (!fs.existsSync(targetFilePath)) {
      console.warn(`  ⚠️  Offline translation file not found for ${targetLanguage.toUpperCase()}: ${targetFilePath}`);
      this.offlineDictionaries[targetLanguage] = new Map();
      return;
    }

    const fallbackObj = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
    const map = new Map();

    const walk = (sourceNode, fallbackNode, pathParts = []) => {
      if (typeof sourceNode === 'string') {
        if (typeof fallbackNode === 'string') {
          map.set(pathParts.join('.'), fallbackNode);
        }
        return;
      }

      if (typeof sourceNode === 'object' && sourceNode !== null) {
        for (const [key, sourceVal] of Object.entries(sourceNode)) {
          const fallbackVal = fallbackNode && typeof fallbackNode === 'object' ? fallbackNode[key] : undefined;
          walk(sourceVal, fallbackVal, [...pathParts, key]);
        }
      }
    };

    walk(sourceObj, fallbackObj);
    this.offlineDictionaries[targetLanguage] = map;
  }

  countStringValues(obj) {
    let count = 0;
    
    if (typeof obj === 'string') {
      return 1;
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
    console.log('🚀 Starting free translation process...\n');

    // Load source file
    console.log(`📖 Loading source file: ${CONFIG.sourceFile}`);
    const sourceObj = await this.loadSourceFile();
    console.log(`📊 Found ${Object.keys(sourceObj).length} top-level keys\n`);

    if (usingOfflineFallback) {
      console.log('ℹ️  Using offline fallback translations where available.');
    }

    // Translate to each target language
    for (const targetLanguage of CONFIG.targetLanguages) {
      try {
        console.log(`\n🌍 Processing ${targetLanguage.toUpperCase()}...`);

        this.prepareOfflineDictionary(sourceObj, targetLanguage);

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
    const translator = new FreeI18nTranslator();
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

module.exports = { FreeI18nTranslator };