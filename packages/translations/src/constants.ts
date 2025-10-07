/**
 * Constants for the shared translation package
 */

import { SupportedLanguage, TranslationNamespace } from './types';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'fr', 'de'];

export const TRANSLATION_NAMESPACES: TranslationNamespace[] = [
  'common',
  'auth', 
  'dashboard',
  'translation'
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const DEFAULT_NAMESPACE: TranslationNamespace = 'common';

export const SWISS_TERMINOLOGY: Record<string, { fr: string; de: string }> = {
  'Save': { fr: 'Enregistrer', de: 'Speichern' },
  'Cancel': { fr: 'Annuler', de: 'Abbrechen' },
  'Submit': { fr: 'Soumettre', de: 'Absenden' },
  'Add': { fr: 'Ajouter', de: 'Hinzufügen' },
  'Edit': { fr: 'Modifier', de: 'Bearbeiten' },
  'Delete': { fr: 'Supprimer', de: 'Löschen' },
  'View Details': { fr: 'Voir les détails', de: 'Details anzeigen' },
  'Go Back': { fr: 'Retour', de: 'Zurück' },
  'Login': { fr: 'Connexion', de: 'Anmelden' },
  'Sign Up': { fr: 'S\'inscrire', de: 'Registrieren' },
  'Email': { fr: 'E-mail', de: 'E-Mail' },
  'Password': { fr: 'Mot de passe', de: 'Passwort' },
  'Confirm Password': { fr: 'Confirmer le mot de passe', de: 'Passwort bestätigen' },
  'First Name': { fr: 'Prénom', de: 'Vorname' },
  'Last Name': { fr: 'Nom de famille', de: 'Nachname' },
  'Phone Number': { fr: 'Numéro de téléphone', de: 'Telefonnummer' },
  'Organization': { fr: 'Organisation', de: 'Organisation' },
  'Foundation': { fr: 'Fondation', de: 'Stiftung' },
  'Service Provider': { fr: 'Prestataire de services', de: 'Dienstleister' },
  'Product Supplier': { fr: 'Fournisseur de produits', de: 'Produktlieferant' },
  'Parent': { fr: 'Parent', de: 'Elternteil' },
  'Educator': { fr: 'Éducateur', de: 'Erzieher' },
  'Child': { fr: 'Enfant', de: 'Kind' },
  'Crèche': { fr: 'Crèche', de: 'Krippe' },
  'Daycare': { fr: 'Garderie', de: 'Kindertagesstätte' },
  'Welcome': { fr: 'Bienvenue', de: 'Willkommen' },
  'Dashboard': { fr: 'Tableau de bord', de: 'Dashboard' },
  'Settings': { fr: 'Paramètres', de: 'Einstellungen' },
  'Loading': { fr: 'Chargement', de: 'Laden' },
  'Error': { fr: 'Erreur', de: 'Fehler' },
  'Success': { fr: 'Succès', de: 'Erfolg' },
  'Warning': { fr: 'Avertissement', de: 'Warnung' },
  'Info': { fr: 'Information', de: 'Information' },
  'Yes': { fr: 'Oui', de: 'Ja' },
  'No': { fr: 'Non', de: 'Nein' },
  'OK': { fr: 'OK', de: 'OK' },
  'Close': { fr: 'Fermer', de: 'Schließen' },
  'Open': { fr: 'Ouvrir', de: 'Öffnen' },
  'Search': { fr: 'Rechercher', de: 'Suchen' },
  'Filter': { fr: 'Filtrer', de: 'Filtern' },
  'Sort': { fr: 'Trier', de: 'Sortieren' },
  'View': { fr: 'Voir', de: 'Anzeigen' },
  'Download': { fr: 'Télécharger', de: 'Herunterladen' },
  'Upload': { fr: 'Téléverser', de: 'Hochladen' },
  'Continue': { fr: 'Continuer', de: 'Weiter' },
  'Send': { fr: 'Envoyer', de: 'Senden' },
  'Create': { fr: 'Créer', de: 'Erstellen' },
  'Update': { fr: 'Mettre à jour', de: 'Aktualisieren' },
  'Register': { fr: 'S\'inscrire', de: 'Registrieren' }
};

export const TRANSLATION_CONFIG = {
  supportedLanguages: SUPPORTED_LANGUAGES,
  fallbackLanguage: DEFAULT_LANGUAGE,
  namespaces: TRANSLATION_NAMESPACES,
  defaultNamespace: DEFAULT_NAMESPACE
};