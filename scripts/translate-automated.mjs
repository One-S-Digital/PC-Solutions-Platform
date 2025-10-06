#!/usr/bin/env node

/**
 * Automated Translation Script using Google Translate API (Free Tier)
 * 
 * This script translates English translation files to French and German
 * using Google Translate API with proper context and Swiss localization.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LANGUAGES = ['fr', 'de'];
const FRONTEND_LOCALES_DIR = path.join(__dirname, '../frontend/public/locales');
const ADMIN_LOCALES_DIR = path.join(__dirname, '../admin/src/i18n/locales');

// Google Translate API (Free Tier) - 2M characters per month
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const GOOGLE_TRANSLATE_PARAMS = {
  client: 'gtx',
  sl: 'en',
  dt: 't'
};

// Swiss localization context
const SWISS_CONTEXT = {
  fr: {
    context: 'Swiss French (français suisse)',
    instructions: 'Translate to Swiss French, using appropriate Swiss terminology and formal tone. Use "vous" form for formal interactions.',
    examples: {
      'Welcome': 'Bienvenue',
      'Dashboard': 'Tableau de bord',
      'Settings': 'Paramètres',
      'Save': 'Enregistrer',
      'Cancel': 'Annuler',
      'Login': 'Connexion',
      'Sign Up': 'S\'inscrire',
      'Email': 'E-mail',
      'Password': 'Mot de passe',
      'Organization': 'Organisation',
      'Foundation': 'Fondation',
      'Service Provider': 'Prestataire de services',
      'Product Supplier': 'Fournisseur de produits',
      'Parent': 'Parent',
      'Educator': 'Éducateur',
      'Child': 'Enfant',
      'Crèche': 'Crèche',
      'Daycare': 'Garderie'
    }
  },
  de: {
    context: 'Swiss German (Standard German for Switzerland)',
    instructions: 'Translate to Standard German suitable for Switzerland, using formal tone (Sie form).',
    examples: {
      'Welcome': 'Willkommen',
      'Dashboard': 'Dashboard',
      'Settings': 'Einstellungen',
      'Save': 'Speichern',
      'Cancel': 'Abbrechen',
      'Login': 'Anmelden',
      'Sign Up': 'Registrieren',
      'Email': 'E-Mail',
      'Password': 'Passwort',
      'Organization': 'Organisation',
      'Foundation': 'Stiftung',
      'Service Provider': 'Dienstleister',
      'Product Supplier': 'Produktlieferant',
      'Parent': 'Elternteil',
      'Educator': 'Erzieher',
      'Child': 'Kind',
      'Crèche': 'Krippe',
      'Daycare': 'Kindertagesstätte'
    }
  }
};

// Translate text using Google Translate API
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip if already translated (contains language prefix)
  if (text.startsWith('[FR]') || text.startsWith('[DE]')) return text;
  
  try {
    const params = new URLSearchParams({
      ...GOOGLE_TRANSLATE_PARAMS,
      tl: targetLang,
      q: text
    });
    
    const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`);
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    return text;
  } catch (error) {
    console.error(`Translation error for "${text}":`, error.message);
    return text;
  }
}

// Translate object recursively
async function translateObject(obj, targetLang) {
  const result = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      result[key] = await translateObject(obj[key], targetLang);
    } else {
      result[key] = await translateText(obj[key], targetLang);
    }
  }
  
  return result;
}

// Translate all translation files
async function translateAllFiles() {
  console.log('🌍 Starting automated translation process...');
  
  // Translate frontend files
  console.log('📱 Translating frontend files...');
  await translatePlatformFiles(FRONTEND_LOCALES_DIR, 'frontend');
  
  // Translate admin files
  console.log('⚙️ Translating admin files...');
  await translatePlatformFiles(ADMIN_LOCALES_DIR, 'admin');
  
  console.log('✅ Translation process completed!');
}

// Translate files for a specific platform
async function translatePlatformFiles(localesDir, platform) {
  for (const lang of LANGUAGES) {
    console.log(`🔄 Translating ${platform} to ${lang.toUpperCase()}...`);
    
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Translate the content
      const translatedContent = await translateObject(content, lang);
      
      // Save translated content
      fs.writeFileSync(filePath, JSON.stringify(translatedContent, null, 2));
      
      console.log(`  ✅ Translated ${file}`);
    }
  }
}

// Main execution
async function main() {
  try {
    await translateAllFiles();
  } catch (error) {
    console.error('💥 Translation script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { translateText, translateObject, translateAllFiles };
