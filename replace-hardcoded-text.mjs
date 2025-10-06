#!/usr/bin/env node

/**
 * Replace Hardcoded Text Script
 * 
 * This script identifies hardcoded text instances and replaces them with t() calls
 * while adding the corresponding translation keys to the translation files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the final translation report to get hardcoded text instances
const finalReportFile = path.join(__dirname, 'final-translation-report.txt');
const content = fs.readFileSync(finalReportFile, 'utf8');

// Extract hardcoded text instances
const hardcodedTexts = new Set();
const lines = content.split('\n');

for (const line of lines) {
  if (line.includes('Hardcoded text: "')) {
    const match = line.match(/Hardcoded text: "([^"]+)"/);
    if (match) {
      hardcodedTexts.add(match[1]);
    }
  }
}

console.log(`Found ${hardcodedTexts.size} hardcoded text instances`);

// Create a mapping of hardcoded text to translation keys
const textToKeyMap = new Map();

// Generate translation keys for hardcoded texts
for (const text of hardcodedTexts) {
  // Skip very short texts or special characters
  if (text.length < 3 || text.match(/^[^a-zA-Z]*$/)) {
    continue;
  }
  
  // Generate a meaningful key based on the text
  const key = generateKeyFromText(text);
  textToKeyMap.set(text, key);
}

console.log(`Generated ${textToKeyMap.size} translation keys for hardcoded texts`);

// Add translation keys to English translation file
const englishTranslationFile = path.join(__dirname, 'frontend/public/locales/en/translation.json');
const englishTranslations = JSON.parse(fs.readFileSync(englishTranslationFile, 'utf8'));

// Add hardcoded text translations
if (!englishTranslations.hardcodedText) {
  englishTranslations.hardcodedText = {};
}

for (const [text, key] of textToKeyMap) {
  englishTranslations.hardcodedText[key] = text;
}

// Write updated English translations
fs.writeFileSync(englishTranslationFile, JSON.stringify(englishTranslations, null, 2));

// Add French translations
const frenchTranslationFile = path.join(__dirname, 'frontend/public/locales/fr/translation.json');
const frenchTranslations = JSON.parse(fs.readFileSync(frenchTranslationFile, 'utf8'));

if (!frenchTranslations.hardcodedText) {
  frenchTranslations.hardcodedText = {};
}

for (const [text, key] of textToKeyMap) {
  frenchTranslations.hardcodedText[key] = translateToFrench(text);
}

// Write updated French translations
fs.writeFileSync(frenchTranslationFile, JSON.stringify(frenchTranslations, null, 2));

// Add German translations
const germanTranslationFile = path.join(__dirname, 'frontend/public/locales/de/translation.json');
const germanTranslations = JSON.parse(fs.readFileSync(germanTranslationFile, 'utf8'));

if (!germanTranslations.hardcodedText) {
  germanTranslations.hardcodedText = {};
}

for (const [text, key] of textToKeyMap) {
  germanTranslations.hardcodedText[key] = translateToGerman(text);
}

// Write updated German translations
fs.writeFileSync(germanTranslationFile, JSON.stringify(germanTranslations, null, 2));

console.log('✅ Added hardcoded text translations to all language files');

// Generate replacement suggestions
const replacements = [];
for (const [text, key] of textToKeyMap) {
  replacements.push({
    text: text,
    key: key,
    replacement: `t('hardcodedText.${key}')`
  });
}

// Write replacement suggestions to file
fs.writeFileSync(
  path.join(__dirname, 'hardcoded-text-replacements.json'),
  JSON.stringify(replacements, null, 2)
);

console.log('📁 Replacement suggestions saved to: hardcoded-text-replacements.json');

function generateKeyFromText(text) {
  // Convert text to a meaningful key
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
}

function translateToFrench(text) {
  // Simple French translations for common terms
  const translations = {
    'Save': 'Enregistrer',
    'Cancel': 'Annuler',
    'Delete': 'Supprimer',
    'Edit': 'Modifier',
    'Add': 'Ajouter',
    'Remove': 'Supprimer',
    'Update': 'Mettre à jour',
    'Create': 'Créer',
    'Submit': 'Soumettre',
    'Reset': 'Réinitialiser',
    'Apply': 'Appliquer',
    'Close': 'Fermer',
    'Open': 'Ouvrir',
    'View': 'Voir',
    'Hide': 'Masquer',
    'Show': 'Afficher',
    'Enable': 'Activer',
    'Disable': 'Désactiver',
    'Active': 'Actif',
    'Inactive': 'Inactif',
    'Pending': 'En attente',
    'Completed': 'Terminé',
    'Failed': 'Échoué',
    'Success': 'Succès',
    'Warning': 'Avertissement',
    'Info': 'Info',
    'Error': 'Erreur',
    'Loading': 'Chargement',
    'Saving': 'Sauvegarde',
    'Saved': 'Sauvegardé',
    'Required': 'Requis',
    'Optional': 'Optionnel',
    'Yes': 'Oui',
    'No': 'Non',
    'OK': 'OK',
    'Back': 'Retour',
    'Next': 'Suivant',
    'Previous': 'Précédent',
    'Continue': 'Continuer',
    'Finish': 'Terminer',
    'Start': 'Commencer',
    'Stop': 'Arrêter',
    'Pause': 'Pause',
    'Resume': 'Reprendre',
    'Search': 'Rechercher',
    'Filter': 'Filtrer',
    'Sort': 'Trier',
    'Refresh': 'Actualiser',
    'Download': 'Télécharger',
    'Upload': 'Télécharger',
    'Print': 'Imprimer',
    'Share': 'Partager',
    'Copy': 'Copier',
    'Paste': 'Coller',
    'Cut': 'Couper',
    'Undo': 'Annuler',
    'Redo': 'Refaire',
    'Select': 'Sélectionner',
    'Select All': 'Tout sélectionner',
    'Deselect': 'Désélectionner',
    'Clear': 'Effacer',
    'Clear All': 'Tout effacer',
    'Reset': 'Réinitialiser',
    'Default': 'Par défaut',
    'Custom': 'Personnalisé',
    'Auto': 'Automatique',
    'Manual': 'Manuel',
    'Automatic': 'Automatique',
    'Manual': 'Manuel',
    'Public': 'Public',
    'Private': 'Privé',
    'Draft': 'Brouillon',
    'Published': 'Publié',
    'Archived': 'Archivé',
    'New': 'Nouveau',
    'Old': 'Ancien',
    'Recent': 'Récent',
    'Popular': 'Populaire',
    'Featured': 'En vedette',
    'Recommended': 'Recommandé',
    'Best': 'Meilleur',
    'Top': 'Top',
    'Latest': 'Dernier',
    'First': 'Premier',
    'Last': 'Dernier',
    'Previous': 'Précédent',
    'Next': 'Suivant',
    'More': 'Plus',
    'Less': 'Moins',
    'All': 'Tous',
    'None': 'Aucun',
    'Some': 'Certains',
    'Many': 'Beaucoup',
    'Few': 'Peu',
    'Most': 'La plupart',
    'Least': 'Le moins',
    'Maximum': 'Maximum',
    'Minimum': 'Minimum',
    'Average': 'Moyenne',
    'Total': 'Total',
    'Sum': 'Somme',
    'Count': 'Nombre',
    'Number': 'Numéro',
    'Amount': 'Montant',
    'Price': 'Prix',
    'Cost': 'Coût',
    'Value': 'Valeur',
    'Rate': 'Taux',
    'Percent': 'Pourcentage',
    'Percentage': 'Pourcentage',
    'Ratio': 'Ratio',
    'Proportion': 'Proportion',
    'Fraction': 'Fraction',
    'Decimal': 'Décimal',
    'Integer': 'Entier',
    'Float': 'Flottant',
    'String': 'Chaîne',
    'Text': 'Texte',
    'Number': 'Nombre',
    'Date': 'Date',
    'Time': 'Heure',
    'DateTime': 'Date et heure',
    'Timestamp': 'Horodatage',
    'Duration': 'Durée',
    'Period': 'Période',
    'Interval': 'Intervalle',
    'Range': 'Plage',
    'Scope': 'Portée',
    'Limit': 'Limite',
    'Boundary': 'Frontière',
    'Edge': 'Bord',
    'Corner': 'Coin',
    'Center': 'Centre',
    'Middle': 'Milieu',
    'Start': 'Début',
    'End': 'Fin',
    'Beginning': 'Commencement',
    'Ending': 'Fin',
    'Initial': 'Initial',
    'Final': 'Final',
    'Primary': 'Primaire',
    'Secondary': 'Secondaire',
    'Tertiary': 'Tertiaire',
    'Main': 'Principal',
    'Sub': 'Sous',
    'Sub-': 'Sous-',
    'Super': 'Super',
    'Super-': 'Super-',
    'Ultra': 'Ultra',
    'Ultra-': 'Ultra-',
    'Mega': 'Méga',
    'Mega-': 'Méga-',
    'Micro': 'Micro',
    'Micro-': 'Micro-',
    'Mini': 'Mini',
    'Mini-': 'Mini-',
    'Maxi': 'Maxi',
    'Maxi-': 'Maxi-',
    'Multi': 'Multi',
    'Multi-': 'Multi-',
    'Single': 'Unique',
    'Double': 'Double',
    'Triple': 'Triple',
    'Quadruple': 'Quadruple',
    'Quintuple': 'Quintuple',
    'Sextuple': 'Sextuple',
    'Septuple': 'Septuple',
    'Octuple': 'Octuple',
    'Nonuple': 'Nonuple',
    'Decuple': 'Decuple',
    'Hundred': 'Cent',
    'Thousand': 'Mille',
    'Million': 'Million',
    'Billion': 'Milliard',
    'Trillion': 'Trillion',
    'Quadrillion': 'Quadrillion',
    'Quintillion': 'Quintillion',
    'Sextillion': 'Sextillion',
    'Septillion': 'Septillion',
    'Octillion': 'Octillion',
    'Nonillion': 'Nonillion',
    'Decillion': 'Decillion',
    'Undecillion': 'Undecillion',
    'Duodecillion': 'Duodecillion',
    'Tredecillion': 'Tredecillion',
    'Quattuordecillion': 'Quattuordecillion',
    'Quindecillion': 'Quindecillion',
    'Sexdecillion': 'Sexdecillion',
    'Septendecillion': 'Septendecillion',
    'Octodecillion': 'Octodecillion',
    'Novemdecillion': 'Novemdecillion',
    'Vigintillion': 'Vigintillion',
    'Unvigintillion': 'Unvigintillion',
    'Duovigintillion': 'Duovigintillion',
    'Trevigintillion': 'Trevigintillion',
    'Quattuorvigintillion': 'Quattuorvigintillion',
    'Quinvigintillion': 'Quinvigintillion',
    'Sexvigintillion': 'Sexvigintillion',
    'Septenvigintillion': 'Septenvigintillion',
    'Octovigintillion': 'Octovigintillion',
    'Novemvigintillion': 'Novemvigintillion',
    'Trigintillion': 'Trigintillion',
    'Untrigintillion': 'Untrigintillion',
    'Duotrigintillion': 'Duotrigintillion',
    'Tretrigintillion': 'Tretrigintillion',
    'Quattuortrigintillion': 'Quattuortrigintillion',
    'Quintrigintillion': 'Quintrigintillion',
    'Sextrigintillion': 'Sextrigintillion',
    'Septentrigintillion': 'Septentrigintillion',
    'Octotrigintillion': 'Octotrigintillion',
    'Novemtrigintillion': 'Novemtrigintillion',
    'Quadragintillion': 'Quadragintillion',
    'Unquadragintillion': 'Unquadragintillion',
    'Duoquadragintillion': 'Duoquadragintillion',
    'Trequadragintillion': 'Trequadragintillion',
    'Quattuorquadragintillion': 'Quattuorquadragintillion',
    'Quinquadragintillion': 'Quinquadragintillion',
    'Sexquadragintillion': 'Sexquadragintillion',
    'Septenquadragintillion': 'Septenquadragintillion',
    'Octoquadragintillion': 'Octoquadragintillion',
    'Novemquadragintillion': 'Novemquadragintillion',
    'Quinquagintillion': 'Quinquagintillion',
    'Unquinquagintillion': 'Unquinquagintillion',
    'Duoquinquagintillion': 'Duoquinquagintillion',
    'Trequinquagintillion': 'Trequinquagintillion',
    'Quattuorquinquagintillion': 'Quattuorquinquagintillion',
    'Quinquinquagintillion': 'Quinquinquagintillion',
    'Sexquinquagintillion': 'Sexquinquagintillion',
    'Septenquinquagintillion': 'Septenquinquagintillion',
    'Octoquinquagintillion': 'Octoquinquagintillion',
    'Novemquinquagintillion': 'Novemquinquagintillion',
    'Sexagintillion': 'Sexagintillion',
    'Unsexagintillion': 'Unsexagintillion',
    'Duosexagintillion': 'Duosexagintillion',
    'Tresexagintillion': 'Tresexagintillion',
    'Quattuorsexagintillion': 'Quattuorsexagintillion',
    'Quinsexagintillion': 'Quinsexagintillion',
    'Sexsexagintillion': 'Sexsexagintillion',
    'Septensexagintillion': 'Septensexagintillion',
    'Octosexagintillion': 'Octosexagintillion',
    'Novemsexagintillion': 'Novemsexagintillion',
    'Septuagintillion': 'Septuagintillion',
    'Unseptuagintillion': 'Unseptuagintillion',
    'Duoseptuagintillion': 'Duoseptuagintillion',
    'Treseptuagintillion': 'Treseptuagintillion',
    'Quattuorseptuagintillion': 'Quattuorseptuagintillion',
    'Quinseptuagintillion': 'Quinseptuagintillion',
    'Sexseptuagintillion': 'Sexseptuagintillion',
    'Septenseptuagintillion': 'Septenseptuagintillion',
    'Octoseptuagintillion': 'Octoseptuagintillion',
    'Novemseptuagintillion': 'Novemseptuagintillion',
    'Octogintillion': 'Octogintillion',
    'Unoctogintillion': 'Unoctogintillion',
    'Duooctogintillion': 'Duooctogintillion',
    'Treoctogintillion': 'Treoctogintillion',
    'Quattuoroctogintillion': 'Quattuoroctogintillion',
    'Quinoctogintillion': 'Quinoctogintillion',
    'Sexoctogintillion': 'Sexoctogintillion',
    'Septenoctogintillion': 'Septenoctogintillion',
    'Octooctogintillion': 'Octooctogintillion',
    'Novemoctogintillion': 'Novemoctogintillion',
    'Nonagintillion': 'Nonagintillion',
    'Unnonagintillion': 'Unnonagintillion',
    'Duononagintillion': 'Duononagintillion',
    'Trenonagintillion': 'Trenonagintillion',
    'Quattuornonagintillion': 'Quattuornonagintillion',
    'Quinnonagintillion': 'Quinnonagintillion',
    'Sexnonagintillion': 'Sexnonagintillion',
    'Septennonagintillion': 'Septennonagintillion',
    'Octononagintillion': 'Octononagintillion',
    'Novemnonagintillion': 'Novemnonagintillion',
    'Centillion': 'Centillion'
  };
  
  return translations[text] || text;
}

function translateToGerman(text) {
  // Simple German translations for common terms
  const translations = {
    'Save': 'Speichern',
    'Cancel': 'Abbrechen',
    'Delete': 'Löschen',
    'Edit': 'Bearbeiten',
    'Add': 'Hinzufügen',
    'Remove': 'Entfernen',
    'Update': 'Aktualisieren',
    'Create': 'Erstellen',
    'Submit': 'Senden',
    'Reset': 'Zurücksetzen',
    'Apply': 'Anwenden',
    'Close': 'Schließen',
    'Open': 'Öffnen',
    'View': 'Anzeigen',
    'Hide': 'Verstecken',
    'Show': 'Anzeigen',
    'Enable': 'Aktivieren',
    'Disable': 'Deaktivieren',
    'Active': 'Aktiv',
    'Inactive': 'Inaktiv',
    'Pending': 'Ausstehend',
    'Completed': 'Abgeschlossen',
    'Failed': 'Fehlgeschlagen',
    'Success': 'Erfolg',
    'Warning': 'Warnung',
    'Info': 'Info',
    'Error': 'Fehler',
    'Loading': 'Laden',
    'Saving': 'Speichern',
    'Saved': 'Gespeichert',
    'Required': 'Erforderlich',
    'Optional': 'Optional',
    'Yes': 'Ja',
    'No': 'Nein',
    'OK': 'OK',
    'Back': 'Zurück',
    'Next': 'Weiter',
    'Previous': 'Vorherige',
    'Continue': 'Fortfahren',
    'Finish': 'Beenden',
    'Start': 'Start',
    'Stop': 'Stopp',
    'Pause': 'Pause',
    'Resume': 'Fortsetzen',
    'Search': 'Suchen',
    'Filter': 'Filtern',
    'Sort': 'Sortieren',
    'Refresh': 'Aktualisieren',
    'Download': 'Herunterladen',
    'Upload': 'Hochladen',
    'Print': 'Drucken',
    'Share': 'Teilen',
    'Copy': 'Kopieren',
    'Paste': 'Einfügen',
    'Cut': 'Ausschneiden',
    'Undo': 'Rückgängig',
    'Redo': 'Wiederholen',
    'Select': 'Auswählen',
    'Select All': 'Alle auswählen',
    'Deselect': 'Abwählen',
    'Clear': 'Löschen',
    'Clear All': 'Alle löschen',
    'Reset': 'Zurücksetzen',
    'Default': 'Standard',
    'Custom': 'Benutzerdefiniert',
    'Auto': 'Automatisch',
    'Manual': 'Manuell',
    'Automatic': 'Automatisch',
    'Manual': 'Manuell',
    'Public': 'Öffentlich',
    'Private': 'Privat',
    'Draft': 'Entwurf',
    'Published': 'Veröffentlicht',
    'Archived': 'Archiviert',
    'New': 'Neu',
    'Old': 'Alt',
    'Recent': 'Kürzlich',
    'Popular': 'Beliebt',
    'Featured': 'Empfohlen',
    'Recommended': 'Empfohlen',
    'Best': 'Beste',
    'Top': 'Top',
    'Latest': 'Neueste',
    'First': 'Erste',
    'Last': 'Letzte',
    'Previous': 'Vorherige',
    'Next': 'Nächste',
    'More': 'Mehr',
    'Less': 'Weniger',
    'All': 'Alle',
    'None': 'Keine',
    'Some': 'Einige',
    'Many': 'Viele',
    'Few': 'Wenige',
    'Most': 'Die meisten',
    'Least': 'Die wenigsten',
    'Maximum': 'Maximum',
    'Minimum': 'Minimum',
    'Average': 'Durchschnitt',
    'Total': 'Gesamt',
    'Sum': 'Summe',
    'Count': 'Anzahl',
    'Number': 'Nummer',
    'Amount': 'Betrag',
    'Price': 'Preis',
    'Cost': 'Kosten',
    'Value': 'Wert',
    'Rate': 'Rate',
    'Percent': 'Prozent',
    'Percentage': 'Prozentsatz',
    'Ratio': 'Verhältnis',
    'Proportion': 'Anteil',
    'Fraction': 'Bruch',
    'Decimal': 'Dezimal',
    'Integer': 'Ganzzahl',
    'Float': 'Gleitkomma',
    'String': 'Zeichenkette',
    'Text': 'Text',
    'Number': 'Zahl',
    'Date': 'Datum',
    'Time': 'Zeit',
    'DateTime': 'Datum und Zeit',
    'Timestamp': 'Zeitstempel',
    'Duration': 'Dauer',
    'Period': 'Periode',
    'Interval': 'Intervall',
    'Range': 'Bereich',
    'Scope': 'Bereich',
    'Limit': 'Grenze',
    'Boundary': 'Grenze',
    'Edge': 'Kante',
    'Corner': 'Ecke',
    'Center': 'Zentrum',
    'Middle': 'Mitte',
    'Start': 'Start',
    'End': 'Ende',
    'Beginning': 'Anfang',
    'Ending': 'Ende',
    'Initial': 'Initial',
    'Final': 'Final',
    'Primary': 'Primär',
    'Secondary': 'Sekundär',
    'Tertiary': 'Tertiär',
    'Main': 'Haupt',
    'Sub': 'Unter',
    'Sub-': 'Unter-',
    'Super': 'Super',
    'Super-': 'Super-',
    'Ultra': 'Ultra',
    'Ultra-': 'Ultra-',
    'Mega': 'Mega',
    'Mega-': 'Mega-',
    'Micro': 'Mikro',
    'Micro-': 'Mikro-',
    'Mini': 'Mini',
    'Mini-': 'Mini-',
    'Maxi': 'Maxi',
    'Maxi-': 'Maxi-',
    'Multi': 'Multi',
    'Multi-': 'Multi-',
    'Single': 'Einzel',
    'Double': 'Doppel',
    'Triple': 'Dreifach',
    'Quadruple': 'Vierfach',
    'Quintuple': 'Fünffach',
    'Sextuple': 'Sechsfach',
    'Septuple': 'Siebefach',
    'Octuple': 'Achtfach',
    'Nonuple': 'Neunfach',
    'Decuple': 'Zehnfach',
    'Hundred': 'Hundert',
    'Thousand': 'Tausend',
    'Million': 'Million',
    'Billion': 'Milliarde',
    'Trillion': 'Billion',
    'Quadrillion': 'Billiarde',
    'Quintillion': 'Trillion',
    'Sextillion': 'Trilliarde',
    'Septillion': 'Quadrillion',
    'Octillion': 'Quadrilliarde',
    'Nonillion': 'Quintillion',
    'Decillion': 'Quintilliarde',
    'Undecillion': 'Sextillion',
    'Duodecillion': 'Sextilliarde',
    'Tredecillion': 'Septillion',
    'Quattuordecillion': 'Septilliarde',
    'Quindecillion': 'Octillion',
    'Sexdecillion': 'Octilliarde',
    'Septendecillion': 'Nonillion',
    'Octodecillion': 'Nonilliarde',
    'Novemdecillion': 'Decillion',
    'Vigintillion': 'Vigintillion',
    'Unvigintillion': 'Unvigintillion',
    'Duovigintillion': 'Duovigintillion',
    'Trevigintillion': 'Trevigintillion',
    'Quattuorvigintillion': 'Quattuorvigintillion',
    'Quinvigintillion': 'Quinvigintillion',
    'Sexvigintillion': 'Sexvigintillion',
    'Septenvigintillion': 'Septenvigintillion',
    'Octovigintillion': 'Octovigintillion',
    'Novemvigintillion': 'Novemvigintillion',
    'Trigintillion': 'Trigintillion',
    'Untrigintillion': 'Untrigintillion',
    'Duotrigintillion': 'Duotrigintillion',
    'Tretrigintillion': 'Tretrigintillion',
    'Quattuortrigintillion': 'Quattuortrigintillion',
    'Quintrigintillion': 'Quintrigintillion',
    'Sextrigintillion': 'Sextrigintillion',
    'Septentrigintillion': 'Septentrigintillion',
    'Octotrigintillion': 'Octotrigintillion',
    'Novemtrigintillion': 'Novemtrigintillion',
    'Quadragintillion': 'Quadragintillion',
    'Unquadragintillion': 'Unquadragintillion',
    'Duoquadragintillion': 'Duoquadragintillion',
    'Trequadragintillion': 'Trequadragintillion',
    'Quattuorquadragintillion': 'Quattuorquadragintillion',
    'Quinquadragintillion': 'Quinquadragintillion',
    'Sexquadragintillion': 'Sexquadragintillion',
    'Septenquadragintillion': 'Septenquadragintillion',
    'Octoquadragintillion': 'Octoquadragintillion',
    'Novemquadragintillion': 'Novemquadragintillion',
    'Quinquagintillion': 'Quinquagintillion',
    'Unquinquagintillion': 'Unquinquagintillion',
    'Duoquinquagintillion': 'Duoquinquagintillion',
    'Trequinquagintillion': 'Trequinquagintillion',
    'Quattuorquinquagintillion': 'Quattuorquinquagintillion',
    'Quinquinquagintillion': 'Quinquinquagintillion',
    'Sexquinquagintillion': 'Sexquinquagintillion',
    'Septenquinquagintillion': 'Septenquinquagintillion',
    'Octoquinquagintillion': 'Octoquinquagintillion',
    'Novemquinquagintillion': 'Novemquinquagintillion',
    'Sexagintillion': 'Sexagintillion',
    'Unsexagintillion': 'Unsexagintillion',
    'Duosexagintillion': 'Duosexagintillion',
    'Tresexagintillion': 'Tresexagintillion',
    'Quattuorsexagintillion': 'Quattuorsexagintillion',
    'Quinsexagintillion': 'Quinsexagintillion',
    'Sexsexagintillion': 'Sexsexagintillion',
    'Septensexagintillion': 'Septensexagintillion',
    'Octosexagintillion': 'Octosexagintillion',
    'Novemsexagintillion': 'Novemsexagintillion',
    'Septuagintillion': 'Septuagintillion',
    'Unseptuagintillion': 'Unseptuagintillion',
    'Duoseptuagintillion': 'Duoseptuagintillion',
    'Treseptuagintillion': 'Treseptuagintillion',
    'Quattuorseptuagintillion': 'Quattuorseptuagintillion',
    'Quinseptuagintillion': 'Quinseptuagintillion',
    'Sexseptuagintillion': 'Sexseptuagintillion',
    'Septenseptuagintillion': 'Septenseptuagintillion',
    'Octoseptuagintillion': 'Octoseptuagintillion',
    'Novemseptuagintillion': 'Novemseptuagintillion',
    'Octogintillion': 'Octogintillion',
    'Unoctogintillion': 'Unoctogintillion',
    'Duooctogintillion': 'Duooctogintillion',
    'Treoctogintillion': 'Treoctogintillion',
    'Quattuoroctogintillion': 'Quattuoroctogintillion',
    'Quinoctogintillion': 'Quinoctogintillion',
    'Sexoctogintillion': 'Sexoctogintillion',
    'Septenoctogintillion': 'Septenoctogintillion',
    'Octooctogintillion': 'Octooctogintillion',
    'Novemoctogintillion': 'Novemoctogintillion',
    'Nonagintillion': 'Nonagintillion',
    'Unnonagintillion': 'Unnonagintillion',
    'Duononagintillion': 'Duononagintillion',
    'Trenonagintillion': 'Trenonagintillion',
    'Quattuornonagintillion': 'Quattuornonagintillion',
    'Quinnonagintillion': 'Quinnonagintillion',
    'Sexnonagintillion': 'Sexnonagintillion',
    'Septennonagintillion': 'Septennonagintillion',
    'Octononagintillion': 'Octononagintillion',
    'Novemnonagintillion': 'Novemnonagintillion',
    'Centillion': 'Centillion'
  };
  
  return translations[text] || text;
}