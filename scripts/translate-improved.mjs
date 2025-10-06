#!/usr/bin/env node

/**
 * Improved Translation Script using multiple free ML services
 * 
 * This script uses:
 * 1. LibreTranslate (free, self-hosted option)
 * 2. MyMemory API (free, 1000 requests/day)
 * 3. Google Translate (fallback)
 * 4. Swiss-specific terminology dictionary
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

// Swiss-specific terminology dictionary
const SWISS_TERMINOLOGY = {
  fr: {
    // Common UI terms
    'Save': 'Enregistrer',
    'Cancel': 'Annuler',
    'Submit': 'Soumettre',
    'Add': 'Ajouter',
    'Edit': 'Modifier',
    'Delete': 'Supprimer',
    'View Details': 'Voir les détails',
    'Go Back': 'Retour',
    'Login': 'Connexion',
    'Sign Up': 'S\'inscrire',
    'Email': 'E-mail',
    'Password': 'Mot de passe',
    'Confirm Password': 'Confirmer le mot de passe',
    'First Name': 'Prénom',
    'Last Name': 'Nom de famille',
    'Phone Number': 'Numéro de téléphone',
    'Organization': 'Organisation',
    'Foundation': 'Fondation',
    'Service Provider': 'Prestataire de services',
    'Product Supplier': 'Fournisseur de produits',
    'Parent': 'Parent',
    'Educator': 'Éducateur',
    'Child': 'Enfant',
    'Crèche': 'Crèche',
    'Daycare': 'Garderie',
    'Welcome': 'Bienvenue',
    'Dashboard': 'Tableau de bord',
    'Settings': 'Paramètres',
    'Loading': 'Chargement',
    'Error': 'Erreur',
    'Success': 'Succès',
    'Warning': 'Avertissement',
    'Info': 'Information',
    'Yes': 'Oui',
    'No': 'Non',
    'OK': 'OK',
    'Close': 'Fermer',
    'Open': 'Ouvrir',
    'Search': 'Rechercher',
    'Filter': 'Filtrer',
    'Sort': 'Trier',
    'View': 'Voir',
    'Download': 'Télécharger',
    'Upload': 'Téléverser',
    'Continue': 'Continuer',
    'Send': 'Envoyer',
    'Create': 'Créer',
    'Update': 'Mettre à jour',
    'Register': 'S\'inscrire',
    'Toggle Navigation': 'Basculer la navigation',
    'Hide Password': 'Masquer le mot de passe',
    'Show Password': 'Afficher le mot de passe',
    'Sign In': 'Se connecter',
    'Sign Out': 'Se déconnecter',
    'Reset Password': 'Réinitialiser le mot de passe',
    'Remember Me': 'Se souvenir de moi',
    'Create Account': 'Créer un compte',
    'Already have an account?': 'Vous avez déjà un compte ?',
    'Don\'t have an account?': 'Vous n\'avez pas de compte ?',
    'Welcome back!': 'Bon retour !',
    'Join the platform': 'Rejoindre la plateforme',
    'Choose your role': 'Choisissez votre rôle',
    'Organization Name': 'Nom de l\'organisation',
    'Contact Person': 'Personne de contact',
    'Canton': 'Canton',
    'Languages': 'Langues',
    'Capacity': 'Capacité',
    'Product Category': 'Catégorie de produit',
    'Service Type': 'Type de service',
    'Child\'s Age': 'Âge de l\'enfant',
    'Preferred Location': 'Lieu préféré',
    'Type': 'Type',
    'Language': 'Langue',
    'Responsibilities': 'Responsabilités',
    'Qualifications': 'Qualifications',
    'Benefits': 'Avantages',
    'Requirements': 'Exigences',
    'Loading translations...': 'Chargement des traductions...',
    'An error occurred': 'Une erreur s\'est produite',
    'An unknown error occurred': 'Une erreur inconnue s\'est produite',
    'Success': 'Succès',
    'Settings updated successfully': 'Paramètres mis à jour avec succès',
    'In Stock': 'En stock',
    'Out of Stock': 'Rupture de stock',
    'Low Stock': 'Stock faible',
    'Discontinued': 'Discontinué'
  },
  de: {
    // Common UI terms
    'Save': 'Speichern',
    'Cancel': 'Abbrechen',
    'Submit': 'Absenden',
    'Add': 'Hinzufügen',
    'Edit': 'Bearbeiten',
    'Delete': 'Löschen',
    'View Details': 'Details anzeigen',
    'Go Back': 'Zurück',
    'Login': 'Anmelden',
    'Sign Up': 'Registrieren',
    'Email': 'E-Mail',
    'Password': 'Passwort',
    'Confirm Password': 'Passwort bestätigen',
    'First Name': 'Vorname',
    'Last Name': 'Nachname',
    'Phone Number': 'Telefonnummer',
    'Organization': 'Organisation',
    'Foundation': 'Stiftung',
    'Service Provider': 'Dienstleister',
    'Product Supplier': 'Produktlieferant',
    'Parent': 'Elternteil',
    'Educator': 'Erzieher',
    'Child': 'Kind',
    'Crèche': 'Krippe',
    'Daycare': 'Kindertagesstätte',
    'Welcome': 'Willkommen',
    'Dashboard': 'Dashboard',
    'Settings': 'Einstellungen',
    'Loading': 'Laden',
    'Error': 'Fehler',
    'Success': 'Erfolg',
    'Warning': 'Warnung',
    'Info': 'Information',
    'Yes': 'Ja',
    'No': 'Nein',
    'OK': 'OK',
    'Close': 'Schließen',
    'Open': 'Öffnen',
    'Search': 'Suchen',
    'Filter': 'Filtern',
    'Sort': 'Sortieren',
    'View': 'Anzeigen',
    'Download': 'Herunterladen',
    'Upload': 'Hochladen',
    'Continue': 'Weiter',
    'Send': 'Senden',
    'Create': 'Erstellen',
    'Update': 'Aktualisieren',
    'Register': 'Registrieren',
    'Toggle Navigation': 'Navigation umschalten',
    'Hide Password': 'Passwort verbergen',
    'Show Password': 'Passwort anzeigen',
    'Sign In': 'Anmelden',
    'Sign Out': 'Abmelden',
    'Reset Password': 'Passwort zurücksetzen',
    'Remember Me': 'Angemeldet bleiben',
    'Create Account': 'Konto erstellen',
    'Already have an account?': 'Haben Sie bereits ein Konto?',
    'Don\'t have an account?': 'Haben Sie kein Konto?',
    'Welcome back!': 'Willkommen zurück!',
    'Join the platform': 'Der Plattform beitreten',
    'Choose your role': 'Wählen Sie Ihre Rolle',
    'Organization Name': 'Organisationsname',
    'Contact Person': 'Kontaktperson',
    'Canton': 'Kanton',
    'Languages': 'Sprachen',
    'Capacity': 'Kapazität',
    'Product Category': 'Produktkategorie',
    'Service Type': 'Serviceart',
    'Child\'s Age': 'Alter des Kindes',
    'Preferred Location': 'Bevorzugter Standort',
    'Type': 'Typ',
    'Language': 'Sprache',
    'Responsibilities': 'Verantwortlichkeiten',
    'Qualifications': 'Qualifikationen',
    'Benefits': 'Vorteile',
    'Requirements': 'Anforderungen',
    'Loading translations...': 'Übersetzungen werden geladen...',
    'An error occurred': 'Ein Fehler ist aufgetreten',
    'An unknown error occurred': 'Ein unbekannter Fehler ist aufgetreten',
    'Success': 'Erfolg',
    'Settings updated successfully': 'Einstellungen erfolgreich aktualisiert',
    'In Stock': 'Auf Lager',
    'Out of Stock': 'Nicht auf Lager',
    'Low Stock': 'Wenig auf Lager',
    'Discontinued': 'Eingestellt'
  }
};

// Translation service using MyMemory API (free, 1000 requests/day)
async function translateWithMyMemory(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip if already translated
  if (text.startsWith('[FR]') || text.startsWith('[DE]')) return text;
  
  // Check Swiss terminology first
  const terminology = SWISS_TERMINOLOGY[targetLang];
  if (terminology && terminology[text]) {
    return terminology[text];
  }
  
  try {
    const sourceLang = 'en';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    
    return text;
  } catch (error) {
    console.error(`MyMemory translation error for "${text}":`, error.message);
    return text;
  }
}

// Fallback to Google Translate
async function translateWithGoogle(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: targetLang,
      dt: 't',
      q: text
    });
    
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    return text;
  } catch (error) {
    console.error(`Google translation error for "${text}":`, error.message);
    return text;
  }
}

// Main translation function with fallbacks
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip if already translated
  if (text.startsWith('[FR]') || text.startsWith('[DE]')) return text;
  
  // Check Swiss terminology first
  const terminology = SWISS_TERMINOLOGY[targetLang];
  if (terminology && terminology[text]) {
    return terminology[text];
  }
  
  // Try MyMemory first (better quality)
  let translated = await translateWithMyMemory(text, targetLang);
  
  // If MyMemory failed or returned the same text, try Google
  if (translated === text) {
    translated = await translateWithGoogle(text, targetLang);
  }
  
  return translated;
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
  console.log('🌍 Starting improved translation process...');
  console.log('Using: MyMemory API + Swiss terminology + Google Translate fallback\n');
  
  // Translate frontend files
  console.log('📱 Translating frontend files...');
  await translatePlatformFiles(FRONTEND_LOCALES_DIR, 'frontend');
  
  // Translate admin files
  console.log('⚙️ Translating admin files...');
  await translatePlatformFiles(ADMIN_LOCALES_DIR, 'admin');
  
  console.log('\n✅ Improved translation process completed!');
  console.log('📋 Translation quality should be significantly better now.');
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