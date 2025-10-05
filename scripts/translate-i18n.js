#!/usr/bin/env node

/**
 * AI-Powered Translation Script for i18n Files
 * 
 * This script uses OpenAI's API to automatically translate English translation files
 * to French and German, maintaining the JSON structure and context.
 * 
 * Usage:
 *   node scripts/translate-i18n.js
 *   node scripts/translate-i18n.js --api-key YOUR_OPENAI_KEY
 *   node scripts/translate-i18n.js --source en --targets fr,de
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  sourceLanguage: 'en',
  targetLanguages: ['fr', 'de'],
  sourceFile: 'frontend/public/locales/en/translation.json',
  outputDir: 'frontend/public/locales',
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini', // Cost-effective model for translation
  maxRetries: 3,
  delayBetweenRequests: 1000, // 1 second delay to respect rate limits
};

// Language-specific prompts for better context
const LANGUAGE_PROMPTS = {
  fr: {
    context: "Swiss French (français suisse)",
    instructions: "Translate to Swiss French, using appropriate Swiss terminology and formal tone. Use 'vous' form for formal interactions. Maintain the JSON structure exactly.",
    examples: {
      "Welcome": "Bienvenue",
      "Dashboard": "Tableau de bord",
      "Settings": "Paramètres",
      "Save": "Enregistrer",
      "Cancel": "Annuler"
    }
  },
  de: {
    context: "Swiss German (Schweizerdeutsch/Standard German)",
    instructions: "Translate to Standard German suitable for Switzerland, using formal tone (Sie form). Maintain the JSON structure exactly.",
    examples: {
      "Welcome": "Willkommen",
      "Dashboard": "Dashboard",
      "Settings": "Einstellungen", 
      "Save": "Speichern",
      "Cancel": "Abbrechen"
    }
  }
};

class TranslationService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestCount = 0;
  }

  async translateText(text, targetLanguage) {
    const prompt = this.buildPrompt(text, targetLanguage);
    
    const requestData = {
      model: CONFIG.model,
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in software localization. You translate English text to ${LANGUAGE_PROMPTS[targetLanguage].context}. ${LANGUAGE_PROMPTS[targetLanguage].instructions}`
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 4000
    };

    return this.makeOpenAIRequest(requestData);
  }

  buildPrompt(text, targetLanguage) {
    const examples = Object.entries(LANGUAGE_PROMPTS[targetLanguage].examples)
      .map(([en, translated]) => `"${en}" → "${translated}"`)
      .join('\n');

    return `Translate the following JSON content to ${targetLanguage.toUpperCase()}. 

Examples of good translations:
${examples}

Important rules:
1. Keep the exact same JSON structure
2. Only translate the values, never the keys
3. Preserve HTML tags and interpolation variables like {{variable}}
4. Use appropriate formal tone for a professional platform
5. Maintain consistency with the examples above

JSON to translate:
${text}`;
  }

  async makeOpenAIRequest(requestData) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.error) {
              reject(new Error(`OpenAI API Error: ${response.error.message}`));
              return;
            }
            
            if (!response.choices || !response.choices[0] || !response.choices[0].message) {
              reject(new Error('Invalid response from OpenAI API'));
              return;
            }
            
            resolve(response.choices[0].message.content);
          } catch (error) {
            reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class I18nTranslator {
  constructor() {
    this.translationService = new TranslationService(CONFIG.openaiApiKey);
  }

  async loadSourceFile() {
    const sourcePath = path.join(process.cwd(), CONFIG.sourceFile);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    return JSON.parse(content);
  }

  async translateObject(obj, targetLanguage) {
    const text = JSON.stringify(obj, null, 2);
    
    console.log(`🔄 Translating to ${targetLanguage.toUpperCase()}...`);
    console.log(`📝 Content length: ${text.length} characters`);
    
    try {
      const translatedText = await this.translationService.translateText(text, targetLanguage);
      
      // Clean up the response (remove any markdown formatting)
      const cleanText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(cleanText);
    } catch (error) {
      console.error(`❌ Translation failed for ${targetLanguage}:`, error.message);
      throw error;
    }
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
    
    console.log(`✅ Saved ${targetLanguage.toUpperCase()} translation to: ${outputPath}`);
  }

  async translateAll() {
    console.log('🚀 Starting AI-powered translation process...\n');

    // Check API key
    if (!CONFIG.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required. Get your key from https://platform.openai.com/api-keys');
    }

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
          await this.translationService.delay(CONFIG.delayBetweenRequests);
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

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-key':
        CONFIG.openaiApiKey = args[i + 1];
        i++;
        break;
      case '--source':
        CONFIG.sourceLanguage = args[i + 1];
        i++;
        break;
      case '--targets':
        CONFIG.targetLanguages = args[i + 1].split(',');
        i++;
        break;
      case '--help':
        console.log(`
AI-Powered i18n Translation Script

Usage:
  node scripts/translate-i18n.js [options]

Options:
  --api-key KEY        OpenAI API key (or set OPENAI_API_KEY env var)
  --source LANG        Source language (default: en)
  --targets LANG1,LANG2 Target languages (default: fr,de)
  --help               Show this help message

Environment Variables:
  OPENAI_API_KEY       Your OpenAI API key

Examples:
  node scripts/translate-i18n.js
  node scripts/translate-i18n.js --api-key sk-...
  node scripts/translate-i18n.js --targets fr,de,es
        `);
        process.exit(0);
        break;
    }
  }
}

// Main execution
async function main() {
  try {
    parseArgs();
    
    const translator = new I18nTranslator();
    await translator.translateAll();
    
  } catch (error) {
    console.error('💥 Translation script failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure you have a valid OpenAI API key');
    console.error('2. Check that the source file exists');
    console.error('3. Ensure you have internet connectivity');
    console.error('4. Verify your OpenAI account has sufficient credits');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { I18nTranslator, TranslationService };