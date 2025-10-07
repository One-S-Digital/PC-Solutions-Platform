#!/usr/bin/env node

/**
 * Fix Hardcoded Text and Missing Keys Script
 * 
 * This script systematically fixes hardcoded text and missing translation keys
 * across frontend and admin platforms.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LANGUAGES = ['en', 'fr', 'de'];
const FRONTEND_LOCALES_DIR = path.join(__dirname, '../frontend/public/locales');
const ADMIN_LOCALES_DIR = path.join(__dirname, '../admin/src/i18n/locales');

// Swiss terminology for common hardcoded text
const COMMON_HARDCODED_FIXES = {
  '🔍 DEBUG MODE ACTIVE - Look for purple debug buttons in bottom corners': {
    en: '🔍 DEBUG MODE ACTIVE - Look for purple debug buttons in bottom corners',
    fr: '🔍 MODE DEBUG ACTIF - Cherchez les boutons de debug violets dans les coins inférieurs',
    de: '🔍 DEBUG-MODUS AKTIV - Suchen Sie nach violetten Debug-Buttons in den unteren Ecken'
  },
  '&rarr;': {
    en: '&rarr;',
    fr: '&rarr;',
    de: '&rarr;'
  },
  'Continue Shopping': {
    en: 'Continue Shopping',
    fr: 'Continuer les achats',
    de: 'Einkauf fortsetzen'
  },
  'Add to Cart': {
    en: 'Add to Cart',
    fr: 'Ajouter au panier',
    de: 'In den Warenkorb legen'
  },
  'Remove from Cart': {
    en: 'Remove from Cart',
    fr: 'Retirer du panier',
    de: 'Aus Warenkorb entfernen'
  },
  'View Cart': {
    en: 'View Cart',
    fr: 'Voir le panier',
    de: 'Warenkorb anzeigen'
  },
  'Checkout': {
    en: 'Checkout',
    fr: 'Commander',
    de: 'Zur Kasse'
  },
  'Total': {
    en: 'Total',
    fr: 'Total',
    de: 'Gesamt'
  },
  'Subtotal': {
    en: 'Subtotal',
    fr: 'Sous-total',
    de: 'Zwischensumme'
  },
  'Tax': {
    en: 'Tax',
    fr: 'Taxe',
    de: 'Steuer'
  },
  'Shipping': {
    en: 'Shipping',
    fr: 'Livraison',
    de: 'Versand'
  },
  'Discount': {
    en: 'Discount',
    fr: 'Remise',
    de: 'Rabatt'
  },
  'Free': {
    en: 'Free',
    fr: 'Gratuit',
    de: 'Kostenlos'
  },
  'Loading...': {
    en: 'Loading...',
    fr: 'Chargement...',
    de: 'Laden...'
  },
  'Error': {
    en: 'Error',
    fr: 'Erreur',
    de: 'Fehler'
  },
  'Success': {
    en: 'Success',
    fr: 'Succès',
    de: 'Erfolg'
  },
  'Warning': {
    en: 'Warning',
    fr: 'Avertissement',
    de: 'Warnung'
  },
  'Info': {
    en: 'Info',
    fr: 'Information',
    de: 'Information'
  },
  'Yes': {
    en: 'Yes',
    fr: 'Oui',
    de: 'Ja'
  },
  'No': {
    en: 'No',
    fr: 'Non',
    de: 'Nein'
  },
  'OK': {
    en: 'OK',
    fr: 'OK',
    de: 'OK'
  },
  'Cancel': {
    en: 'Cancel',
    fr: 'Annuler',
    de: 'Abbrechen'
  },
  'Save': {
    en: 'Save',
    fr: 'Enregistrer',
    de: 'Speichern'
  },
  'Delete': {
    en: 'Delete',
    fr: 'Supprimer',
    de: 'Löschen'
  },
  'Edit': {
    en: 'Edit',
    fr: 'Modifier',
    de: 'Bearbeiten'
  },
  'Add': {
    en: 'Add',
    fr: 'Ajouter',
    de: 'Hinzufügen'
  },
  'Remove': {
    en: 'Remove',
    fr: 'Retirer',
    de: 'Entfernen'
  },
  'Close': {
    en: 'Close',
    fr: 'Fermer',
    de: 'Schließen'
  },
  'Open': {
    en: 'Open',
    fr: 'Ouvrir',
    de: 'Öffnen'
  },
  'Search': {
    en: 'Search',
    fr: 'Rechercher',
    de: 'Suchen'
  },
  'Filter': {
    en: 'Filter',
    fr: 'Filtrer',
    de: 'Filtern'
  },
  'Sort': {
    en: 'Sort',
    fr: 'Trier',
    de: 'Sortieren'
  },
  'View': {
    en: 'View',
    fr: 'Voir',
    de: 'Anzeigen'
  },
  'Download': {
    en: 'Download',
    fr: 'Télécharger',
    de: 'Herunterladen'
  },
  'Upload': {
    en: 'Upload',
    fr: 'Téléverser',
    de: 'Hochladen'
  },
  'Send': {
    en: 'Send',
    fr: 'Envoyer',
    de: 'Senden'
  },
  'Submit': {
    en: 'Submit',
    fr: 'Soumettre',
    de: 'Absenden'
  },
  'Create': {
    en: 'Create',
    fr: 'Créer',
    de: 'Erstellen'
  },
  'Update': {
    en: 'Update',
    fr: 'Mettre à jour',
    de: 'Aktualisieren'
  },
  'Register': {
    en: 'Register',
    fr: 'S\'inscrire',
    de: 'Registrieren'
  },
  'Login': {
    en: 'Login',
    fr: 'Connexion',
    de: 'Anmelden'
  },
  'Logout': {
    en: 'Logout',
    fr: 'Déconnexion',
    de: 'Abmelden'
  },
  'Profile': {
    en: 'Profile',
    fr: 'Profil',
    de: 'Profil'
  },
  'Settings': {
    en: 'Settings',
    fr: 'Paramètres',
    de: 'Einstellungen'
  },
  'Dashboard': {
    en: 'Dashboard',
    fr: 'Tableau de bord',
    de: 'Dashboard'
  },
  'Home': {
    en: 'Home',
    fr: 'Accueil',
    de: 'Startseite'
  },
  'About': {
    en: 'About',
    fr: 'À propos',
    de: 'Über uns'
  },
  'Contact': {
    en: 'Contact',
    fr: 'Contact',
    de: 'Kontakt'
  },
  'Help': {
    en: 'Help',
    fr: 'Aide',
    de: 'Hilfe'
  },
  'Support': {
    en: 'Support',
    fr: 'Support',
    de: 'Support'
  },
  'FAQ': {
    en: 'FAQ',
    fr: 'FAQ',
    de: 'FAQ'
  },
  'Terms': {
    en: 'Terms',
    fr: 'Conditions',
    de: 'Bedingungen'
  },
  'Privacy': {
    en: 'Privacy',
    fr: 'Confidentialité',
    de: 'Datenschutz'
  },
  'Copyright': {
    en: 'Copyright',
    fr: 'Droits d\'auteur',
    de: 'Urheberrecht'
  },
  'All Rights Reserved': {
    en: 'All Rights Reserved',
    fr: 'Tous droits réservés',
    de: 'Alle Rechte vorbehalten'
  }
};

// Missing keys that need to be added
const MISSING_KEYS = {
  'supportPage.furtherAssistanceText.0': {
    en: 'If you need further assistance, please contact us at',
    fr: 'Si vous avez besoin d\'une assistance supplémentaire, veuillez nous contacter à',
    de: 'Wenn Sie weitere Hilfe benötigen, kontaktieren Sie uns unter'
  },
  'supportPage.furtherAssistanceText.1': {
    en: 'support@procrechesolutions.com',
    fr: 'support@procrechesolutions.com',
    de: 'support@procrechesolutions.com'
  }
};

/**
 * Load translation files for a platform
 */
function loadTranslations(platformDir) {
  const translations = {};
  
  for (const lang of LANGUAGES) {
    const langDir = path.join(platformDir, lang);
    if (!fs.existsSync(langDir)) continue;
    
    translations[lang] = {};
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(langDir, file);
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        translations[lang][namespace] = content;
      } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
      }
    }
  }
  
  return translations;
}

/**
 * Add missing keys to translation files
 */
function addMissingKeys(translations, platformDir) {
  console.log('🔧 Adding missing translation keys...');
  
  for (const [key, translations_by_lang] of Object.entries(MISSING_KEYS)) {
    const keyParts = key.split('.');
    const namespace = keyParts[0];
    
    for (const lang of LANGUAGES) {
      const langDir = path.join(platformDir, lang);
      if (!fs.existsSync(langDir)) continue;
      
      const filePath = path.join(langDir, `${namespace}.json`);
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Create nested object structure
        let current = content;
        for (let i = 1; i < keyParts.length - 1; i++) {
          if (!current[keyParts[i]]) {
            current[keyParts[i]] = {};
          }
          current = current[keyParts[i]];
        }
        
        // Set the final value
        const finalKey = keyParts[keyParts.length - 1];
        current[finalKey] = translations_by_lang[lang] || translations_by_lang['en'];
        
        // Save updated content
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`  ✅ Added ${key} to ${lang}/${namespace}.json`);
        
      } catch (error) {
        console.error(`Error adding key ${key} to ${filePath}:`, error.message);
      }
    }
  }
}

/**
 * Fix hardcoded text in source files
 */
function fixHardcodedText() {
  console.log('🔧 Fixing hardcoded text in source files...');
  
  // This would require parsing source files and replacing hardcoded text
  // For now, we'll create a mapping file that developers can use
  const hardcodedMappings = {};
  
  for (const [text, translations] of Object.entries(COMMON_HARDCODED_FIXES)) {
    hardcodedMappings[text] = {
      key: generateTranslationKey(text),
      translations
    };
  }
  
  // Save hardcoded text mappings
  const mappingsPath = path.join(__dirname, '../hardcoded-text-mappings.json');
  fs.writeFileSync(mappingsPath, JSON.stringify(hardcodedMappings, null, 2));
  console.log(`  📄 Hardcoded text mappings saved to: ${mappingsPath}`);
  
  return hardcodedMappings;
}

/**
 * Generate translation key from text
 */
function generateTranslationKey(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

/**
 * Add hardcoded text translations to common namespace
 */
function addHardcodedTranslations(translations, platformDir) {
  console.log('🔧 Adding hardcoded text translations...');
  
  for (const [text, translations_by_lang] of Object.entries(COMMON_HARDCODED_FIXES)) {
    const key = generateTranslationKey(text);
    
    for (const lang of LANGUAGES) {
      const langDir = path.join(platformDir, lang);
      if (!fs.existsSync(langDir)) continue;
      
      const filePath = path.join(langDir, 'common.json');
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Add to hardcodedText section
        if (!content.hardcodedText) {
          content.hardcodedText = {};
        }
        
        content.hardcodedText[key] = translations_by_lang[lang] || translations_by_lang['en'];
        
        // Save updated content
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`  ✅ Added hardcoded text "${text}" as ${key} to ${lang}/common.json`);
        
      } catch (error) {
        console.error(`Error adding hardcoded text to ${filePath}:`, error.message);
      }
    }
  }
}

/**
 * Fix all platforms
 */
function fixAllPlatforms() {
  console.log('🔧 Starting hardcoded text and missing keys fix...\n');
  
  // Fix frontend
  console.log('📱 Fixing frontend...');
  const frontendTranslations = loadTranslations(FRONTEND_LOCALES_DIR);
  addMissingKeys(frontendTranslations, FRONTEND_LOCALES_DIR);
  addHardcodedTranslations(frontendTranslations, FRONTEND_LOCALES_DIR);
  
  // Fix admin
  console.log('⚙️ Fixing admin...');
  const adminTranslations = loadTranslations(ADMIN_LOCALES_DIR);
  addMissingKeys(adminTranslations, ADMIN_LOCALES_DIR);
  addHardcodedTranslations(adminTranslations, ADMIN_LOCALES_DIR);
  
  // Create hardcoded text mappings
  const hardcodedMappings = fixHardcodedText();
  
  console.log('\n✅ Hardcoded text and missing keys fix completed!');
  console.log(`📄 Created ${Object.keys(hardcodedMappings).length} hardcoded text mappings`);
  console.log('📋 Next steps:');
  console.log('  1. Review hardcoded-text-mappings.json');
  console.log('  2. Replace hardcoded text in source files with translation keys');
  console.log('  3. Run translation validation to verify fixes');
}

/**
 * Main execution
 */
function main() {
  try {
    fixAllPlatforms();
  } catch (error) {
    console.error('💥 Fix script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixAllPlatforms, addMissingKeys, addHardcodedTranslations };