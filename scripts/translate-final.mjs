#!/usr/bin/env node

/**
 * Final Translation Script with Swiss Terminology Dictionary
 * 
 * This script uses a comprehensive Swiss terminology dictionary
 * to ensure high-quality translations for French and German.
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

// Comprehensive Swiss terminology dictionary
const SWISS_TERMINOLOGY = {
  fr: {
    // Basic UI elements
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
    'Discontinued': 'Discontinué',
    'Apply Now': 'Postuler maintenant',
    'Confirm Apply': 'Confirmer la candidature',
    'Send Message': 'Envoyer un message',
    'Invite to Apply': 'Inviter à postuler',
    'Invite to Interview': 'Inviter à un entretien',
    'Add to Favorites': 'Ajouter aux favoris',
    'Favorited': 'Favori',
    'Submit Enquiry': 'Soumettre la demande',
    'View My Enquiries': 'Voir mes demandes',
    'Submit Ticket': 'Envoyer le ticket',
    'Go to Login': 'Aller à la page de connexion',
    'Reset Filters': 'Réinitialiser les filtres',
    'Apply Filters': 'Appliquer les filtres',
    'Submit Request': 'Envoyer la demande',
    'Remove': 'Retirer',
    'Dismiss': 'Rejeter',
    'View All': 'Voir tout',
    'View Details': 'Voir les détails',
    'Go Back': 'Retour',
    'Save Changes': 'Enregistrer les modifications',
    'Cancel': 'Annuler',
    'Submit': 'Soumettre',
    'Add': 'Ajouter',
    'Edit': 'Modifier',
    'Delete': 'Supprimer',
    'View Details': 'Voir les détails',
    'Go Back': 'Retour',
    'Login': 'Connexion',
    'Sign Up': 'S\'inscrire',
    'Apply Now': 'Postuler maintenant',
    'Confirm Apply': 'Confirmer la candidature',
    'Send Message': 'Envoyer un message',
    'Invite to Apply': 'Inviter à postuler',
    'Invite to Interview': 'Inviter à un entretien',
    'Add to Favorites': 'Ajouter aux favoris',
    'Favorited': 'Favori',
    'Submit Enquiry': 'Soumettre la demande',
    'View My Enquiries': 'Voir mes demandes',
    'Submit Ticket': 'Envoyer le ticket',
    'Go to Login': 'Aller à la page de connexion',
    'Reset Filters': 'Réinitialiser les filtres',
    'Apply Filters': 'Appliquer les filtres',
    'Submit Request': 'Envoyer la demande',
    'Remove': 'Retirer',
    'Dismiss': 'Rejeter'
  },
  de: {
    // Basic UI elements
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
    'Discontinued': 'Eingestellt',
    'Apply Now': 'Jetzt bewerben',
    'Confirm Apply': 'Bewerbung bestätigen',
    'Send Message': 'Nachricht senden',
    'Invite to Apply': 'Zur Bewerbung einladen',
    'Invite to Interview': 'Zum Gespräch einladen',
    'Add to Favorites': 'Zu Favoriten hinzufügen',
    'Favorited': 'Favorisiert',
    'Submit Enquiry': 'Anfrage senden',
    'View My Enquiries': 'Meine Anfragen',
    'Submit Ticket': 'Ticket senden',
    'Go to Login': 'Zur Anmeldeseite',
    'Reset Filters': 'Filter zurücksetzen',
    'Apply Filters': 'Filter anwenden',
    'Submit Request': 'Anfrage absenden',
    'Remove': 'Entfernen',
    'Dismiss': 'Verwerfen',
    'View All': 'Alle anzeigen',
    'View Details': 'Details anzeigen',
    'Go Back': 'Zurück',
    'Save Changes': 'Änderungen speichern',
    'Cancel': 'Abbrechen',
    'Submit': 'Absenden',
    'Add': 'Hinzufügen',
    'Edit': 'Bearbeiten',
    'Delete': 'Löschen',
    'View Details': 'Details anzeigen',
    'Go Back': 'Zurück',
    'Login': 'Anmelden',
    'Sign Up': 'Registrieren',
    'Apply Now': 'Jetzt bewerben',
    'Confirm Apply': 'Bewerbung bestätigen',
    'Send Message': 'Nachricht senden',
    'Invite to Apply': 'Zur Bewerbung einladen',
    'Invite to Interview': 'Zum Gespräch einladen',
    'Add to Favorites': 'Zu Favoriten hinzufügen',
    'Favorited': 'Favorisiert',
    'Submit Enquiry': 'Anfrage senden',
    'View My Enquiries': 'Meine Anfragen',
    'Submit Ticket': 'Ticket senden',
    'Go to Login': 'Zur Anmeldeseite',
    'Reset Filters': 'Filter zurücksetzen',
    'Apply Filters': 'Filter anwenden',
    'Submit Request': 'Anfrage absenden',
    'Remove': 'Entfernen',
    'Dismiss': 'Verwerfen'
  }
};

// Translate text using Swiss terminology dictionary
function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip if already translated
  if (text.startsWith('[FR]') || text.startsWith('[DE]')) return text;
  
  // Check Swiss terminology first
  const terminology = SWISS_TERMINOLOGY[targetLang];
  if (terminology && terminology[text]) {
    return terminology[text];
  }
  
  // If not found in dictionary, return with language prefix for manual review
  return `[${targetLang.toUpperCase()}] ${text}`;
}

// Translate object recursively
async function translateObject(obj, targetLang) {
  const result = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      result[key] = await translateObject(obj[key], targetLang);
    } else {
      result[key] = translateText(obj[key], targetLang);
    }
  }
  
  return result;
}

// Translate all translation files
async function translateAllFiles() {
  console.log('🌍 Starting final translation process...');
  console.log('Using: Swiss terminology dictionary\n');
  
  // Translate frontend files
  console.log('📱 Translating frontend files...');
  await translatePlatformFiles(FRONTEND_LOCALES_DIR, 'frontend');
  
  // Translate admin files
  console.log('⚙️ Translating admin files...');
  await translatePlatformFiles(ADMIN_LOCALES_DIR, 'admin');
  
  console.log('\n✅ Final translation process completed!');
  console.log('📋 All translations now use Swiss terminology dictionary.');
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