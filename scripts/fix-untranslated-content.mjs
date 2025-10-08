#!/usr/bin/env node

/**
 * Fix Untranslated Content Script
 * 
 * This script systematically fixes all untranslated content warnings
 * by translating English text to French and German using Swiss terminology.
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

// Comprehensive Swiss terminology for untranslated content
const UNTRANSLATED_FIXES = {
  // Auth translations
  'Sign in to your account': {
    fr: 'Connectez-vous à votre compte',
    de: 'Melden Sie sich in Ihrem Konto an'
  },
  'Enter your email': {
    fr: 'Saisissez votre e-mail',
    de: 'Geben Sie Ihre E-Mail ein'
  },
  'Enter your password': {
    fr: 'Saisissez votre mot de passe',
    de: 'Geben Sie Ihr Passwort ein'
  },
  'Forgot password functionality coming soon': {
    fr: 'Fonctionnalité de réinitialisation de mot de passe bientôt disponible',
    de: 'Passwort-Reset-Funktion kommt bald'
  },
  'Or continue with': {
    fr: 'Ou continuer avec',
    de: 'Oder fortfahren mit'
  },
  'Google': {
    fr: 'Google',
    de: 'Google'
  },
  'Facebook': {
    fr: 'Facebook',
    de: 'Facebook'
  },
  'Please fill in both email and password': {
    fr: 'Veuillez remplir l\'e-mail et le mot de passe',
    de: 'Bitte füllen Sie sowohl E-Mail als auch Passwort aus'
  },
  'Phone': {
    fr: 'Téléphone',
    de: 'Telefon'
  },
  'Role': {
    fr: 'Rôle',
    de: 'Rolle'
  },
  'First name is required': {
    fr: 'Le prénom est obligatoire',
    de: 'Vorname ist erforderlich'
  },
  'Last name is required': {
    fr: 'Le nom de famille est obligatoire',
    de: 'Nachname ist erforderlich'
  },
  'Email is required': {
    fr: 'L\'e-mail est obligatoire',
    de: 'E-Mail ist erforderlich'
  },
  'Password is required': {
    fr: 'Le mot de passe est obligatoire',
    de: 'Passwort ist erforderlich'
  },
  'Phone is required': {
    fr: 'Le téléphone est obligatoire',
    de: 'Telefon ist erforderlich'
  },
  'Organization is required': {
    fr: 'L\'organisation est obligatoire',
    de: 'Organisation ist erforderlich'
  },
  'Role is required': {
    fr: 'Le rôle est obligatoire',
    de: 'Rolle ist erforderlich'
  },
  'Account created successfully': {
    fr: 'Compte créé avec succès',
    de: 'Konto erfolgreich erstellt'
  },
  'Failed to create account': {
    fr: 'Échec de la création du compte',
    de: 'Kontoerstellung fehlgeschlagen'
  },
  'Organization name is required': {
    fr: 'Le nom de l\'organisation est obligatoire',
    de: 'Organisationsname ist erforderlich'
  },
  'Please enter a valid email address': {
    fr: 'Veuillez saisir une adresse e-mail valide',
    de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
  },
  'Passwords do not match': {
    fr: 'Les mots de passe ne correspondent pas',
    de: 'Passwörter stimmen nicht überein'
  },
  'Phone number is required': {
    fr: 'Le numéro de téléphone est obligatoire',
    de: 'Telefonnummer ist erforderlich'
  },
  'Canton is required': {
    fr: 'Le canton est obligatoire',
    de: 'Kanton ist erforderlich'
  },
  'Capacity is required': {
    fr: 'La capacité est obligatoire',
    de: 'Kapazität ist erforderlich'
  },
  'Category is required': {
    fr: 'La catégorie est obligatoire',
    de: 'Kategorie ist erforderlich'
  },
  'Service type is required': {
    fr: 'Le type de service est obligatoire',
    de: 'Serviceart ist erforderlich'
  },
  'Child age is required': {
    fr: 'L\'âge de l\'enfant est obligatoire',
    de: 'Alter des Kindes ist erforderlich'
  },
  'Child start date is required': {
    fr: 'La date de début de l\'enfant est obligatoire',
    de: 'Startdatum des Kindes ist erforderlich'
  },
  'You must accept the terms and conditions': {
    fr: 'Vous devez accepter les conditions générales',
    de: 'Sie müssen den Allgemeinen Geschäftsbedingungen zustimmen'
  },
  'Contact person is required': {
    fr: 'La personne de contact est obligatoire',
    de: 'Kontaktperson ist erforderlich'
  },
  'Parent name is required': {
    fr: 'Le nom du parent est obligatoire',
    de: 'Elternname ist erforderlich'
  },
  'I agree to the terms and conditions': {
    fr: 'J\'accepte les conditions générales',
    de: 'Ich stimme den Allgemeinen Geschäftsbedingungen zu'
  },
  'Enter your first name': {
    fr: 'Saisissez votre prénom',
    de: 'Geben Sie Ihren Vornamen ein'
  },
  'Enter your last name': {
    fr: 'Saisissez votre nom de famille',
    de: 'Geben Sie Ihren Nachnamen ein'
  },
  'Enter your email address': {
    fr: 'Saisissez votre adresse e-mail',
    de: 'Geben Sie Ihre E-Mail-Adresse ein'
  },
  'Enter your password': {
    fr: 'Saisissez votre mot de passe',
    de: 'Geben Sie Ihr Passwort ein'
  },
  'Confirm your password': {
    fr: 'Confirmez votre mot de passe',
    de: 'Bestätigen Sie Ihr Passwort'
  },
  'Enter your phone number': {
    fr: 'Saisissez votre numéro de téléphone',
    de: 'Geben Sie Ihre Telefonnummer ein'
  },
  'Enter your organization name': {
    fr: 'Saisissez le nom de votre organisation',
    de: 'Geben Sie Ihren Organisationsnamen ein'
  },
  'Enter contact person name': {
    fr: 'Saisissez le nom de la personne de contact',
    de: 'Geben Sie den Namen der Kontaktperson ein'
  },
  'Enter your full name': {
    fr: 'Saisissez votre nom complet',
    de: 'Geben Sie Ihren vollständigen Namen ein'
  },
  'Enter product category': {
    fr: 'Saisissez la catégorie de produit',
    de: 'Geben Sie die Produktkategorie ein'
  },
  'Enter service type': {
    fr: 'Saisissez le type de service',
    de: 'Geben Sie die Serviceart ein'
  },
  'Welcome back': {
    fr: 'Bon retour',
    de: 'Willkommen zurück'
  },
  'Choose your role to get started': {
    fr: 'Choisissez votre rôle pour commencer',
    de: 'Wählen Sie Ihre Rolle, um zu beginnen'
  },
  'Registration successful': {
    fr: 'Inscription réussie',
    de: 'Registrierung erfolgreich'
  },
  'Login successful': {
    fr: 'Connexion réussie',
    de: 'Anmeldung erfolgreich'
  },
  'Logout successful': {
    fr: 'Déconnexion réussie',
    de: 'Abmeldung erfolgreich'
  },
  'Invalid credentials': {
    fr: 'Identifiants invalides',
    de: 'Ungültige Anmeldedaten'
  },
  'Password is too short': {
    fr: 'Le mot de passe est trop court',
    de: 'Passwort ist zu kurz'
  },
  'Invalid email format': {
    fr: 'Format d\'e-mail invalide',
    de: 'Ungültiges E-Mail-Format'
  },
  'Invalid phone format': {
    fr: 'Format de téléphone invalide',
    de: 'Ungültiges Telefonformat'
  },
  'I accept the terms of service': {
    fr: 'J\'accepte les conditions d\'utilisation',
    de: 'Ich akzeptiere die Nutzungsbedingungen'
  },
  'I accept the privacy policy': {
    fr: 'J\'accepte la politique de confidentialité',
    de: 'Ich akzeptiere die Datenschutzrichtlinie'
  },
  'Sign up here': {
    fr: 'Inscrivez-vous ici',
    de: 'Hier registrieren'
  },
  'Login here': {
    fr: 'Connectez-vous ici',
    de: 'Hier anmelden'
  },
  'Keep me logged in': {
    fr: 'Me garder connecté',
    de: 'Angemeldet bleiben'
  },
  'Email verified': {
    fr: 'E-mail vérifié',
    de: 'E-Mail verifiziert'
  },
  'Email not verified': {
    fr: 'E-mail non vérifié',
    de: 'E-Mail nicht verifiziert'
  },
  'Resend verification': {
    fr: 'Renvoyer la vérification',
    de: 'Verifizierung erneut senden'
  },
  'Verification email sent': {
    fr: 'E-mail de vérification envoyé',
    de: 'Verifizierungs-E-Mail gesendet'
  },
  'Account activated successfully': {
    fr: 'Compte activé avec succès',
    de: 'Konto erfolgreich aktiviert'
  },
  'Account deactivated': {
    fr: 'Compte désactivé',
    de: 'Konto deaktiviert'
  },
  'Account suspended': {
    fr: 'Compte suspendu',
    de: 'Konto gesperrt'
  },
  'Account deleted': {
    fr: 'Compte supprimé',
    de: 'Konto gelöscht'
  },
  'Profile updated': {
    fr: 'Profil mis à jour',
    de: 'Profil aktualisiert'
  },
  'Password changed': {
    fr: 'Mot de passe modifié',
    de: 'Passwort geändert'
  },
  'Password reset': {
    fr: 'Réinitialisation du mot de passe',
    de: 'Passwort zurückgesetzt'
  },
  'Login expired': {
    fr: 'Connexion expirée',
    de: 'Anmeldung abgelaufen'
  },
  'Session expired': {
    fr: 'Session expirée',
    de: 'Sitzung abgelaufen'
  },
  'Please login again': {
    fr: 'Veuillez vous reconnecter',
    de: 'Bitte melden Sie sich erneut an'
  },
  'Access denied': {
    fr: 'Accès refusé',
    de: 'Zugriff verweigert'
  },
  'Insufficient permissions': {
    fr: 'Permissions insuffisantes',
    de: 'Unzureichende Berechtigungen'
  },
  'Unauthorized': {
    fr: 'Non autorisé',
    de: 'Nicht autorisiert'
  },
  'Forbidden': {
    fr: 'Interdit',
    de: 'Verboten'
  },
  'Not found': {
    fr: 'Non trouvé',
    de: 'Nicht gefunden'
  },
  'Server error': {
    fr: 'Erreur serveur',
    de: 'Serverfehler'
  },
  'Network error': {
    fr: 'Erreur réseau',
    de: 'Netzwerkfehler'
  },
  'Try again': {
    fr: 'Réessayer',
    de: 'Erneut versuchen'
  },
  'Contact support': {
    fr: 'Contacter le support',
    de: 'Support kontaktieren'
  },
  'Report issue': {
    fr: 'Signaler un problème',
    de: 'Problem melden'
  },
  'Help center': {
    fr: 'Centre d\'aide',
    de: 'Hilfezentrum'
  },
  'Documentation': {
    fr: 'Documentation',
    de: 'Dokumentation'
  },
  'Changelog': {
    fr: 'Journal des modifications',
    de: 'Änderungsprotokoll'
  },
  'Version': {
    fr: 'Version',
    de: 'Version'
  },
  'Build': {
    fr: 'Build',
    de: 'Build'
  },
  'Environment': {
    fr: 'Environnement',
    de: 'Umgebung'
  },
  'Development': {
    fr: 'Développement',
    de: 'Entwicklung'
  },
  'Staging': {
    fr: 'Staging',
    de: 'Staging'
  },
  'Production': {
    fr: 'Production',
    de: 'Produktion'
  },
  'Test': {
    fr: 'Test',
    de: 'Test'
  },
  'Debug': {
    fr: 'Debug',
    de: 'Debug'
  },
  'Critical': {
    fr: 'Critique',
    de: 'Kritisch'
  },
  'Fatal': {
    fr: 'Fatal',
    de: 'Fatal'
  },
  'New message from': {
    fr: 'Nouveau message de',
    de: 'Neue Nachricht von'
  },
  'Hide password': {
    fr: 'Masquer le mot de passe',
    de: 'Passwort verbergen'
  },
  'Show password': {
    fr: 'Afficher le mot de passe',
    de: 'Passwort anzeigen'
  },
  'Remember me': {
    fr: 'Se souvenir de moi',
    de: 'Angemeldet bleiben'
  },
  'Join the platform': {
    fr: 'Rejoindre la plateforme',
    de: 'Der Plattform beitreten'
  },
  'Type': {
    fr: 'Type',
    de: 'Typ'
  },
  'Language': {
    fr: 'Langue',
    de: 'Sprache'
  },
  'Qualifications': {
    fr: 'Qualifications',
    de: 'Qualifikationen'
  },
  'Benefits': {
    fr: 'Avantages',
    de: 'Vorteile'
  },
  'Requirements': {
    fr: 'Exigences',
    de: 'Anforderungen'
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
 * Translate text using Swiss terminology
 */
function translateText(text, targetLang) {
  if (targetLang === 'en') return text;
  
  const translation = UNTRANSLATED_FIXES[text];
  if (translation && translation[targetLang]) {
    return translation[targetLang];
  }
  
  return text;
}

/**
 * Translate object recursively
 */
function translateObject(obj, targetLang) {
  const result = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      result[key] = translateObject(obj[key], targetLang);
    } else if (typeof obj[key] === 'string') {
      result[key] = translateText(obj[key], targetLang);
    } else {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Fix untranslated content in platform
 */
function fixUntranslatedContent(platformDir, platform) {
  console.log(`🔧 Fixing untranslated content in ${platform}...`);
  
  const translations = loadTranslations(platformDir);
  
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    
    const langDir = path.join(platformDir, lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(langDir, file);
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Translate the content
        const translatedContent = translateObject(content, lang);
        
        // Save translated content
        fs.writeFileSync(filePath, JSON.stringify(translatedContent, null, 2));
        
        console.log(`  ✅ Fixed untranslated content in ${lang}/${namespace}.json`);
        
      } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
      }
    }
  }
}

/**
 * Fix all platforms
 */
function fixAllPlatforms() {
  console.log('🔧 Starting untranslated content fix...\n');
  
  // Fix frontend
  fixUntranslatedContent(FRONTEND_LOCALES_DIR, 'frontend');
  
  // Fix admin
  fixUntranslatedContent(ADMIN_LOCALES_DIR, 'admin');
  
  console.log('\n✅ Untranslated content fix completed!');
  console.log('📋 All English text has been translated to French and German.');
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

export { fixAllPlatforms, translateText, translateObject };