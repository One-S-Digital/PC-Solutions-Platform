#!/usr/bin/env node

/**
 * Manual Translation Creator
 * 
 * This script creates proper French and German translations by copying the English
 * structure and providing high-quality manual translations for key sections.
 * 
 * Usage:
 *   node scripts/create-translations-manual.js
 */

const fs = require('fs');
const path = require('path');

// High-quality manual translations
const TRANSLATIONS = {
  fr: {
    // Core app
    "appName": "Pro Crèche Solutions",
    "loading": "Chargement...",
    
    // Language switcher
    "languageSwitcher": {
      "enShort": "EN",
      "enLong": "Anglais",
      "frShort": "FR",
      "frLong": "Français",
      "deShort": "DE",
      "deLong": "Allemand",
      "selectLanguage": "Sélectionner la langue"
    },
    
    // Common buttons
    "buttons": {
      "save": "Enregistrer",
      "saveChanges": "Enregistrer les modifications",
      "cancel": "Annuler",
      "submit": "Soumettre",
      "add": "Ajouter",
      "edit": "Modifier",
      "delete": "Supprimer",
      "viewDetails": "Voir les détails",
      "goBack": "Retour",
      "login": "Se connecter",
      "signup": "S'inscrire",
      "applyNow": "Postuler maintenant",
      "confirmApply": "Confirmer la candidature",
      "sendMessage": "Envoyer un message",
      "inviteToApply": "Inviter à postuler",
      "inviteToInterview": "Inviter à un entretien",
      "addToFavorites": "Ajouter aux favoris",
      "favorited": "Favori",
      "submitEnquiry": "Soumettre la demande",
      "viewMyEnquiries": "Voir mes demandes",
      "submitTicket": "Envoyer le ticket",
      "goToLogin": "Aller à la connexion",
      "close": "Fermer",
      "view": "Voir",
      "resetFilters": "Réinitialiser les filtres",
      "applyFilters": "Appliquer les filtres",
      "submitRequest": "Envoyer la demande",
      "remove": "Retirer",
      "dismiss": "Rejeter"
    },
    
    // Common terms
    "common": {
      "loading": "Chargement...",
      "error": "Une erreur s'est produite",
      "success": "Succès",
      "name": "Nom",
      "email": "E-mail",
      "phone": "Téléphone",
      "address": "Adresse",
      "description": "Description",
      "status": "Statut",
      "active": "Actif",
      "inactive": "Inactif",
      "pending": "En attente",
      "completed": "Terminé",
      "date": "Date",
      "createdAt": "Créé",
      "updatedAt": "Mis à jour",
      "actions": "Actions",
      "yes": "Oui",
      "no": "Non",
      "ok": "OK",
      "perMonth": "/mois",
      "perYear": "/an",
      "save10Percent": "économisez 10%"
    },
    
    // Errors
    "errors": {
      "unknown": "Une erreur inconnue s'est produite. Veuillez réessayer."
    },
    
    // Login page
    "loginPage": {
      "title": "Bienvenue sur {{appName}}",
      "subtitle": "Connectez-vous à votre compte pour continuer",
      "errorBothFields": "Veuillez saisir l'e-mail et le mot de passe",
      "emailLabel": "Adresse e-mail",
      "emailPlaceholder": "Saisissez votre e-mail",
      "passwordLabel": "Mot de passe",
      "passwordPlaceholder": "Saisissez votre mot de passe",
      "loggingIn": "Connexion en cours...",
      "orContinueWith": "Ou continuer avec",
      "google": "Google",
      "facebook": "Facebook",
      "noAccount": "Vous n'avez pas de compte ?",
      "viewPlansPrompt": "Vous voulez voir nos plans ?",
      "viewPlans": "Voir les plans",
      "parentLookingForCreche": "Êtes-vous un parent à la recherche d'une crèche ?",
      "findCrecheHere": "Trouver une crèche ici",
      "forgotPassword": "Mot de passe oublié ?",
      "forgotPasswordTBD": "La fonctionnalité de réinitialisation du mot de passe arrive bientôt !",
      "socialLoginTBD": "Connexion {{provider}} arrive bientôt !"
    },
    
    // Dashboard
    "dashboardPage": {
      "welcome": "Bon retour, {{name}} !",
      "defaultUser": "Utilisateur",
      "overviewSubtitle": "Voici ce qui se passe avec {{appName}} aujourd'hui",
      "activeUsers": "Utilisateurs actifs",
      "newOrders": "Nouvelles commandes",
      "openJobs": "Emplois ouverts",
      "pageViews": "Vues de page",
      "recentActivity": "Activité récente",
      "quickLinks": "Liens rapides",
      "browseMarketplace": "Parcourir le marché",
      "postNewJob": "Publier un nouvel emploi",
      "manageUsers": "Gérer les utilisateurs",
      "platformSettings": "Paramètres de la plateforme",
      "activityLina": "a mis à jour son profil",
      "activityEcoToys": "a soumis un nouveau produit",
      "activityJohn": "a postulé pour un poste",
      "activityParent": "a soumis une demande",
      "viewDetailsFor": "Voir les détails pour {{name}}",
      "timeAgo": {
        "minutes": "Il y a {{count}} minutes",
        "hours": "Il y a {{count}} heures",
        "yesterday": "Hier"
      },
      "upcomingMeetings": "Réunions à venir",
      "quickActions": "Actions rapides",
      "overview": "Aperçu",
      "announcements": "Annonces",
      "notifications": "Notifications"
    }
  },
  
  de: {
    // Core app
    "appName": "Pro Crèche Solutions",
    "loading": "Lädt...",
    
    // Language switcher
    "languageSwitcher": {
      "enShort": "EN",
      "enLong": "Englisch",
      "frShort": "FR",
      "frLong": "Französisch",
      "deShort": "DE",
      "deLong": "Deutsch",
      "selectLanguage": "Sprache auswählen"
    },
    
    // Common buttons
    "buttons": {
      "save": "Speichern",
      "saveChanges": "Änderungen speichern",
      "cancel": "Abbrechen",
      "submit": "Senden",
      "add": "Hinzufügen",
      "edit": "Bearbeiten",
      "delete": "Löschen",
      "viewDetails": "Details anzeigen",
      "goBack": "Zurück",
      "login": "Anmelden",
      "signup": "Registrieren",
      "applyNow": "Jetzt bewerben",
      "confirmApply": "Bewerbung bestätigen",
      "sendMessage": "Nachricht senden",
      "inviteToApply": "Zur Bewerbung einladen",
      "inviteToInterview": "Zum Gespräch einladen",
      "addToFavorites": "Zu Favoriten hinzufügen",
      "favorited": "Favorisiert",
      "submitEnquiry": "Anfrage senden",
      "viewMyEnquiries": "Meine Anfragen",
      "submitTicket": "Ticket senden",
      "goToLogin": "Zur Anmeldung",
      "close": "Schließen",
      "view": "Ansehen",
      "resetFilters": "Filter zurücksetzen",
      "applyFilters": "Filter anwenden",
      "submitRequest": "Anfrage senden",
      "remove": "Entfernen",
      "dismiss": "Verwerfen"
    },
    
    // Common terms
    "common": {
      "loading": "Lädt...",
      "error": "Ein Fehler ist aufgetreten",
      "success": "Erfolg",
      "name": "Name",
      "email": "E-Mail",
      "phone": "Telefon",
      "address": "Adresse",
      "description": "Beschreibung",
      "status": "Status",
      "active": "Aktiv",
      "inactive": "Inaktiv",
      "pending": "Ausstehend",
      "completed": "Abgeschlossen",
      "date": "Datum",
      "createdAt": "Erstellt",
      "updatedAt": "Aktualisiert",
      "actions": "Aktionen",
      "yes": "Ja",
      "no": "Nein",
      "ok": "OK",
      "perMonth": "/Monat",
      "perYear": "/Jahr",
      "save10Percent": "10% sparen"
    },
    
    // Errors
    "errors": {
      "unknown": "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
    },
    
    // Login page
    "loginPage": {
      "title": "Willkommen bei {{appName}}",
      "subtitle": "Melden Sie sich in Ihrem Konto an, um fortzufahren",
      "errorBothFields": "Bitte geben Sie sowohl E-Mail als auch Passwort ein",
      "emailLabel": "E-Mail-Adresse",
      "emailPlaceholder": "Geben Sie Ihre E-Mail ein",
      "passwordLabel": "Passwort",
      "passwordPlaceholder": "Geben Sie Ihr Passwort ein",
      "loggingIn": "Anmeldung läuft...",
      "orContinueWith": "Oder fortfahren mit",
      "google": "Google",
      "facebook": "Facebook",
      "noAccount": "Haben Sie noch kein Konto?",
      "viewPlansPrompt": "Möchten Sie unsere Pläne sehen?",
      "viewPlans": "Pläne anzeigen",
      "parentLookingForCreche": "Sind Sie ein Elternteil auf der Suche nach einer Krippe?",
      "findCrecheHere": "Hier eine Krippe finden",
      "forgotPassword": "Passwort vergessen?",
      "forgotPasswordTBD": "Passwort-Zurücksetzung kommt bald!",
      "socialLoginTBD": "{{provider}} Anmeldung kommt bald!"
    },
    
    // Dashboard
    "dashboardPage": {
      "welcome": "Willkommen zurück, {{name}}!",
      "defaultUser": "Benutzer",
      "overviewSubtitle": "Hier ist, was heute mit {{appName}} passiert",
      "activeUsers": "Aktive Benutzer",
      "newOrders": "Neue Bestellungen",
      "openJobs": "Offene Stellen",
      "pageViews": "Seitenaufrufe",
      "recentActivity": "Letzte Aktivität",
      "quickLinks": "Schnelllinks",
      "browseMarketplace": "Marktplatz durchsuchen",
      "postNewJob": "Neue Stelle veröffentlichen",
      "manageUsers": "Benutzer verwalten",
      "platformSettings": "Plattform-Einstellungen",
      "activityLina": "hat ihr Profil aktualisiert",
      "activityEcoToys": "hat ein neues Produkt eingereicht",
      "activityJohn": "hat sich auf eine Stelle beworben",
      "activityParent": "hat eine Anfrage eingereicht",
      "viewDetailsFor": "Details anzeigen für {{name}}",
      "timeAgo": {
        "minutes": "vor {{count}} Minuten",
        "hours": "vor {{count}} Stunden",
        "yesterday": "Gestern"
      },
      "upcomingMeetings": "Anstehende Meetings",
      "quickActions": "Schnellaktionen",
      "overview": "Überblick",
      "announcements": "Ankündigungen",
      "notifications": "Benachrichtigungen"
    }
  }
};

class ManualTranslationCreator {
  constructor() {
    this.sourceFile = 'frontend/public/locales/en/translation.json';
    this.outputDir = 'frontend/public/locales';
  }

  async loadSourceFile() {
    const sourcePath = path.join(process.cwd(), this.sourceFile);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const content = fs.readFileSync(sourcePath, 'utf8');
    return JSON.parse(content);
  }

  mergeTranslations(sourceObj, translations) {
    const result = JSON.parse(JSON.stringify(sourceObj)); // Deep clone
    
    // Recursively merge translations
    this.mergeObject(result, translations);
    
    return result;
  }

  mergeObject(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!target[key]) {
          target[key] = {};
        }
        this.mergeObject(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  async saveTranslation(translatedObj, targetLanguage) {
    const outputPath = path.join(process.cwd(), this.outputDir, targetLanguage, 'translation.json');
    
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

  async createAllTranslations() {
    console.log('🚀 Creating manual translations...\n');

    // Load source file
    console.log(`📖 Loading source file: ${this.sourceFile}`);
    const sourceObj = await this.loadSourceFile();
    console.log(`📊 Found ${Object.keys(sourceObj).length} top-level keys\n`);

    // Create translations for each language
    for (const [targetLanguage, translations] of Object.entries(TRANSLATIONS)) {
      try {
        console.log(`\n🌍 Creating ${targetLanguage.toUpperCase()} translation...`);
        
        const translatedObj = this.mergeTranslations(sourceObj, translations);
        await this.saveTranslation(translatedObj, targetLanguage);
        
        console.log(`✅ Created ${targetLanguage.toUpperCase()} translation`);
        
      } catch (error) {
        console.error(`💥 Failed to create ${targetLanguage} translation:`, error.message);
      }
    }

    console.log('\n🎉 Manual translation creation completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the generated translation files');
    console.log('2. Add more translations for missing keys');
    console.log('3. Test the application in different languages');
    console.log('4. Commit the changes to version control');
  }
}

// Main execution
async function main() {
  try {
    const creator = new ManualTranslationCreator();
    await creator.createAllTranslations();
    
  } catch (error) {
    console.error('💥 Translation creation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ManualTranslationCreator };