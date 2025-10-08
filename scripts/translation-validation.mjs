#!/usr/bin/env node

/**
 * Translation Validation Script
 * 
 * This script validates translation completeness, quality, and consistency
 * across all platforms and languages.
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
const SHARED_LOCALES_DIR = path.join(__dirname, '../packages/translations/locales');

// Validation results
const validationResults = {
  frontend: { errors: [], warnings: [], missingKeys: [], unusedKeys: [] },
  admin: { errors: [], warnings: [], missingKeys: [], unusedKeys: [] },
  shared: { errors: [], warnings: [], missingKeys: [], unusedKeys: [] },
  overall: { isValid: true, coverage: 0, totalErrors: 0, totalWarnings: 0 }
};

/**
 * Load all translation files for a platform
 */
function loadTranslations(platformDir, platform) {
  const translations = {};
  
  for (const lang of LANGUAGES) {
    const langDir = path.join(platformDir, lang);
    if (!fs.existsSync(langDir)) {
      validationResults[platform].errors.push(`Missing language directory: ${lang}`);
      continue;
    }
    
    translations[lang] = {};
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(langDir, file);
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        translations[lang][namespace] = content;
      } catch (error) {
        validationResults[platform].errors.push(`Invalid JSON in ${filePath}: ${error.message}`);
      }
    }
  }
  
  return translations;
}

/**
 * Extract all translation keys from nested object
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Check for missing translations
 */
function checkMissingTranslations(translations, platform) {
  const englishKeys = extractKeys(translations.en);
  
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    
    const langKeys = extractKeys(translations[lang] || {});
    const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
    
    if (missingKeys.length > 0) {
      validationResults[platform].missingKeys.push(...missingKeys.map(key => `${lang}:${key}`));
      validationResults[platform].warnings.push(`Missing ${missingKeys.length} translations in ${lang}`);
    }
  }
}

/**
 * Check for untranslated content
 */
function checkUntranslatedContent(translations, platform) {
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    
    const langTranslations = translations[lang] || {};
    
    for (const [namespace, content] of Object.entries(langTranslations)) {
      const keys = extractKeys(content);
      
      for (const key of keys) {
        const value = getNestedValue(content, key);
        if (typeof value === 'string') {
          // Check if value appears to be untranslated (English text)
          if (isEnglishText(value)) {
            validationResults[platform].warnings.push(`Untranslated content in ${lang}/${namespace}: ${key} = "${value}"`);
          }
        }
      }
    }
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, key) {
  return key.split('.').reduce((current, k) => current?.[k], obj);
}

/**
 * Check if text appears to be English
 */
function isEnglishText(text) {
  // Skip if text contains French/German characters or is already translated
  if (text.includes('é') || text.includes('è') || text.includes('ê') || text.includes('ë') ||
      text.includes('à') || text.includes('â') || text.includes('ä') || text.includes('ç') ||
      text.includes('ù') || text.includes('û') || text.includes('ü') || text.includes('ö') ||
      text.includes('ß') || text.includes('ä') || text.includes('ö') || text.includes('ü') ||
      text.includes('É') || text.includes('È') || text.includes('Ê') || text.includes('Ë') ||
      text.includes('À') || text.includes('Â') || text.includes('Ä') || text.includes('Ç') ||
      text.includes('Ù') || text.includes('Û') || text.includes('Ü') || text.includes('Ö')) {
    return false;
  }
  
  // Skip if text contains common French/German words
  const nonEnglishWords = [
    'Mot de passe', 'Confirmer', 'Saisissez', 'Veuillez', 'obligatoire', 'requis',
    'Passwort', 'Bestätigen', 'Geben Sie', 'Bitte', 'erforderlich', 'benötigt',
    'Se connecter', 'Connexion', 'Anmelden', 'Anmeldung',
    'Nom de famille', 'Nachname', 'Vorname', 'Prénom',
    'Organisation', 'Téléphone', 'Telefon', 'Canton', 'Kanton',
    'Langues', 'Sprachen', 'Type de service', 'Serviceart',
    'Personne de contact', 'Kontaktperson', 'Fondation', 'Stiftung',
    'Fournisseur', 'Lieferant', 'Prestataire', 'Dienstleister',
    'Enregistrer', 'Speichern', 'Annuler', 'Abbrechen',
    'Soumettre', 'Absenden', 'Ajouter', 'Hinzufügen',
    'Modifier', 'Bearbeiten', 'Supprimer', 'Löschen',
    'Voir les détails', 'Details anzeigen', 'Retour', 'Zurück'
  ];
  
  if (nonEnglishWords.some(word => text.includes(word))) {
    return false;
  }
  
  // Simple heuristic: check for common English patterns
  const englishPatterns = [
    /^[A-Z][a-z\s]+$/, // Title case
    /^[a-z]+[A-Z]/, // camelCase
    /^[a-z_]+$/, // snake_case
    /^[A-Z_]+$/, // SCREAMING_SNAKE_CASE
  ];
  
  return englishPatterns.some(pattern => pattern.test(text));
}

/**
 * Check for unused translation keys
 */
function checkUnusedKeys(translations, platform) {
  // This would require scanning source code for translation usage
  // For now, we'll just note that this check should be implemented
  validationResults[platform].warnings.push('Unused key detection not implemented yet');
}

/**
 * Validate translation quality
 */
function validateQuality(translations, platform) {
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;
    
    const langTranslations = translations[lang] || {};
    
    for (const [namespace, content] of Object.entries(langTranslations)) {
      const keys = extractKeys(content);
      
      for (const key of keys) {
        const value = getNestedValue(content, key);
        if (typeof value === 'string') {
          // Check for common quality issues
          if (value.includes('[FR]') || value.includes('[DE]')) {
            validationResults[platform].warnings.push(`Translation placeholder found in ${lang}/${namespace}: ${key} = "${value}"`);
          }
          
          if (value.length === 0) {
            validationResults[platform].errors.push(`Empty translation in ${lang}/${namespace}: ${key}`);
          }
          
          if (value === key) {
            validationResults[platform].warnings.push(`Translation key equals value in ${lang}/${namespace}: ${key}`);
          }
        }
      }
    }
  }
}

/**
 * Calculate coverage percentage
 */
function calculateCoverage(translations, platform) {
  const englishKeys = extractKeys(translations.en);
  const totalKeys = englishKeys.length;
  
  if (totalKeys === 0) return 100;
  
  let translatedKeys = 0;
  
  for (const lang of LANGUAGES) {
    if (lang === 'en') {
      translatedKeys += totalKeys;
      continue;
    }
    
    const langKeys = extractKeys(translations[lang] || {});
    translatedKeys += langKeys.length;
  }
  
  const totalPossibleKeys = totalKeys * LANGUAGES.length;
  return Math.round((translatedKeys / totalPossibleKeys) * 100);
}

/**
 * Validate all platforms
 */
function validateAllPlatforms() {
  console.log('🔍 Starting translation validation...\n');
  
  // Validate frontend
  console.log('📱 Validating frontend translations...');
  const frontendTranslations = loadTranslations(FRONTEND_LOCALES_DIR, 'frontend');
  checkMissingTranslations(frontendTranslations, 'frontend');
  checkUntranslatedContent(frontendTranslations, 'frontend');
  checkUnusedKeys(frontendTranslations, 'frontend');
  validateQuality(frontendTranslations, 'frontend');
  
  // Validate admin
  console.log('⚙️ Validating admin translations...');
  const adminTranslations = loadTranslations(ADMIN_LOCALES_DIR, 'admin');
  checkMissingTranslations(adminTranslations, 'admin');
  checkUntranslatedContent(adminTranslations, 'admin');
  checkUnusedKeys(adminTranslations, 'admin');
  validateQuality(adminTranslations, 'admin');
  
  // Validate shared package
  console.log('📦 Validating shared translations...');
  const sharedTranslations = loadTranslations(SHARED_LOCALES_DIR, 'shared');
  checkMissingTranslations(sharedTranslations, 'shared');
  checkUntranslatedContent(sharedTranslations, 'shared');
  checkUnusedKeys(sharedTranslations, 'shared');
  validateQuality(sharedTranslations, 'shared');
  
  // Calculate overall results
  const allErrors = [
    ...validationResults.frontend.errors,
    ...validationResults.admin.errors,
    ...validationResults.shared.errors
  ];
  
  const allWarnings = [
    ...validationResults.frontend.warnings,
    ...validationResults.admin.warnings,
    ...validationResults.shared.warnings
  ];
  
  validationResults.overall = {
    isValid: allErrors.length === 0,
    coverage: calculateCoverage(frontendTranslations, 'frontend'),
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length
  };
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n📋 VALIDATION REPORT');
  console.log('===================\n');
  
  // Frontend results
  console.log('Frontend Platform:');
  console.log(`  ❌ Errors: ${validationResults.frontend.errors.length}`);
  console.log(`  ⚠️  Warnings: ${validationResults.frontend.warnings.length}`);
  console.log(`  🔍 Missing Keys: ${validationResults.frontend.missingKeys.length}`);
  console.log(`  🗑️  Unused Keys: ${validationResults.frontend.unusedKeys.length}`);
  
  if (validationResults.frontend.errors.length > 0) {
    console.log('\n  Errors:');
    validationResults.frontend.errors.forEach(error => console.log(`    - ${error}`));
  }
  
  if (validationResults.frontend.warnings.length > 0) {
    console.log('\n  Warnings:');
    validationResults.frontend.warnings.forEach(warning => console.log(`    - ${warning}`));
  }
  
  // Admin results
  console.log('\nAdmin Platform:');
  console.log(`  ❌ Errors: ${validationResults.admin.errors.length}`);
  console.log(`  ⚠️  Warnings: ${validationResults.admin.warnings.length}`);
  console.log(`  🔍 Missing Keys: ${validationResults.admin.missingKeys.length}`);
  console.log(`  🗑️  Unused Keys: ${validationResults.admin.unusedKeys.length}`);
  
  if (validationResults.admin.errors.length > 0) {
    console.log('\n  Errors:');
    validationResults.admin.errors.forEach(error => console.log(`    - ${error}`));
  }
  
  if (validationResults.admin.warnings.length > 0) {
    console.log('\n  Warnings:');
    validationResults.admin.warnings.forEach(warning => console.log(`    - ${warning}`));
  }
  
  // Shared package results
  console.log('\nShared Package:');
  console.log(`  ❌ Errors: ${validationResults.shared.errors.length}`);
  console.log(`  ⚠️  Warnings: ${validationResults.shared.warnings.length}`);
  console.log(`  🔍 Missing Keys: ${validationResults.shared.missingKeys.length}`);
  console.log(`  🗑️  Unused Keys: ${validationResults.shared.unusedKeys.length}`);
  
  if (validationResults.shared.errors.length > 0) {
    console.log('\n  Errors:');
    validationResults.shared.errors.forEach(error => console.log(`    - ${error}`));
  }
  
  if (validationResults.shared.warnings.length > 0) {
    console.log('\n  Warnings:');
    validationResults.shared.warnings.forEach(warning => console.log(`    - ${warning}`));
  }
  
  // Overall results
  console.log('\nOverall Results:');
  console.log(`  ✅ Valid: ${validationResults.overall.isValid ? 'Yes' : 'No'}`);
  console.log(`  📊 Coverage: ${validationResults.overall.coverage}%`);
  console.log(`  ❌ Total Errors: ${validationResults.overall.totalErrors}`);
  console.log(`  ⚠️  Total Warnings: ${validationResults.overall.totalWarnings}`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../translation-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return validationResults.overall.isValid;
}

/**
 * Main execution
 */
function main() {
  try {
    validateAllPlatforms();
    const isValid = generateReport();
    
    if (!isValid) {
      console.log('\n❌ Validation failed! Please fix the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All translations validated successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Validation script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateAllPlatforms, generateReport };