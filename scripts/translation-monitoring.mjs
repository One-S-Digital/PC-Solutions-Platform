#!/usr/bin/env node

/**
 * Translation Monitoring System
 * 
 * This script provides real-time monitoring of translation quality,
 * coverage, and performance metrics.
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

// Monitoring data
const monitoringData = {
  timestamp: new Date().toISOString(),
  platforms: {
    frontend: {
      coverage: 0,
      quality: 0,
      warnings: 0,
      errors: 0,
      keys: 0,
      hardcodedText: 0
    },
    admin: {
      coverage: 0,
      quality: 0,
      warnings: 0,
      errors: 0,
      keys: 0,
      hardcodedText: 0
    },
    shared: {
      coverage: 0,
      quality: 0,
      warnings: 0,
      errors: 0,
      keys: 0,
      hardcodedText: 0
    }
  },
  overall: {
    coverage: 0,
    quality: 0,
    warnings: 0,
    errors: 0,
    totalKeys: 0,
    totalHardcodedText: 0
  },
  trends: {
    coverageHistory: [],
    qualityHistory: [],
    warningHistory: []
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
 * Check for untranslated content
 */
function checkUntranslatedContent(translations, platform) {
  let warnings = 0;
  let hardcodedText = 0;
  
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
            warnings++;
          }
          
          // Check for hardcoded text patterns
          if (isHardcodedText(value)) {
            hardcodedText++;
          }
        }
      }
    }
  }
  
  return { warnings, hardcodedText };
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
 * Check if text appears to be hardcoded
 */
function isHardcodedText(text) {
  const hardcodedPatterns = [
    /^[A-Z][a-z\s]+$/, // Title case words
    /^[a-z]+[A-Z]/, // camelCase
    /^[a-z_]+$/, // snake_case
    /^[A-Z_]+$/, // SCREAMING_SNAKE_CASE
  ];
  
  return hardcodedPatterns.some(pattern => pattern.test(text));
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
 * Calculate quality score
 */
function calculateQuality(translations, platform) {
  const { warnings, hardcodedText } = checkUntranslatedContent(translations, platform);
  const totalKeys = extractKeys(translations.en).length;
  
  if (totalKeys === 0) return 100;
  
  const warningPenalty = warnings * 0.1;
  const hardcodedPenalty = hardcodedText * 0.2;
  
  const quality = Math.max(0, 100 - warningPenalty - hardcodedPenalty);
  return Math.round(quality);
}

/**
 * Monitor all platforms
 */
function monitorAllPlatforms() {
  console.log('📊 Starting translation monitoring...\n');
  
  // Monitor frontend
  console.log('📱 Monitoring frontend...');
  const frontendTranslations = loadTranslations(FRONTEND_LOCALES_DIR);
  const frontendKeys = extractKeys(frontendTranslations.en);
  const frontendCoverage = calculateCoverage(frontendTranslations, 'frontend');
  const frontendQuality = calculateQuality(frontendTranslations, 'frontend');
  const frontendIssues = checkUntranslatedContent(frontendTranslations, 'frontend');
  
  monitoringData.platforms.frontend = {
    coverage: frontendCoverage,
    quality: frontendQuality,
    warnings: frontendIssues.warnings,
    errors: 0,
    keys: frontendKeys.length,
    hardcodedText: frontendIssues.hardcodedText
  };
  
  // Monitor admin
  console.log('⚙️ Monitoring admin...');
  const adminTranslations = loadTranslations(ADMIN_LOCALES_DIR);
  const adminKeys = extractKeys(adminTranslations.en);
  const adminCoverage = calculateCoverage(adminTranslations, 'admin');
  const adminQuality = calculateQuality(adminTranslations, 'admin');
  const adminIssues = checkUntranslatedContent(adminTranslations, 'admin');
  
  monitoringData.platforms.admin = {
    coverage: adminCoverage,
    quality: adminQuality,
    warnings: adminIssues.warnings,
    errors: 0,
    keys: adminKeys.length,
    hardcodedText: adminIssues.hardcodedText
  };
  
  // Monitor shared package
  console.log('📦 Monitoring shared package...');
  const sharedTranslations = loadTranslations(SHARED_LOCALES_DIR);
  const sharedKeys = extractKeys(sharedTranslations.en);
  const sharedCoverage = calculateCoverage(sharedTranslations, 'shared');
  const sharedQuality = calculateQuality(sharedTranslations, 'shared');
  const sharedIssues = checkUntranslatedContent(sharedTranslations, 'shared');
  
  monitoringData.platforms.shared = {
    coverage: sharedCoverage,
    quality: sharedQuality,
    warnings: sharedIssues.warnings,
    errors: 0,
    keys: sharedKeys.length,
    hardcodedText: sharedIssues.hardcodedText
  };
  
  // Calculate overall metrics
  const totalKeys = frontendKeys.length + adminKeys.length + sharedKeys.length;
  const totalWarnings = frontendIssues.warnings + adminIssues.warnings + sharedIssues.warnings;
  const totalHardcodedText = frontendIssues.hardcodedText + adminIssues.hardcodedText + sharedIssues.hardcodedText;
  const overallCoverage = Math.round((frontendCoverage + adminCoverage + sharedCoverage) / 3);
  const overallQuality = Math.round((frontendQuality + adminQuality + sharedQuality) / 3);
  
  monitoringData.overall = {
    coverage: overallCoverage,
    quality: overallQuality,
    warnings: totalWarnings,
    errors: 0,
    totalKeys,
    totalHardcodedText
  };
}

/**
 * Generate monitoring report
 */
function generateMonitoringReport() {
  console.log('\n📊 TRANSLATION MONITORING REPORT');
  console.log('==================================\n');
  
  // Overall status
  console.log('Overall Status:');
  console.log(`  📊 Coverage: ${monitoringData.overall.coverage}%`);
  console.log(`  ⭐ Quality: ${monitoringData.overall.quality}%`);
  console.log(`  ⚠️  Warnings: ${monitoringData.overall.warnings}`);
  console.log(`  ❌ Errors: ${monitoringData.overall.errors}`);
  console.log(`  🔑 Total Keys: ${monitoringData.overall.totalKeys}`);
  console.log(`  📝 Hardcoded Text: ${monitoringData.overall.totalHardcodedText}\n`);
  
  // Platform breakdown
  console.log('Platform Breakdown:');
  for (const [platform, data] of Object.entries(monitoringData.platforms)) {
    console.log(`\n${platform.toUpperCase()}:`);
    console.log(`  📊 Coverage: ${data.coverage}%`);
    console.log(`  ⭐ Quality: ${data.quality}%`);
    console.log(`  ⚠️  Warnings: ${data.warnings}`);
    console.log(`  ❌ Errors: ${data.errors}`);
    console.log(`  🔑 Keys: ${data.keys}`);
    console.log(`  📝 Hardcoded Text: ${data.hardcodedText}`);
  }
  
  // Quality assessment
  console.log('\nQuality Assessment:');
  if (monitoringData.overall.coverage >= 95) {
    console.log('  ✅ Coverage: Excellent');
  } else if (monitoringData.overall.coverage >= 90) {
    console.log('  ⚠️  Coverage: Good');
  } else {
    console.log('  ❌ Coverage: Needs Improvement');
  }
  
  if (monitoringData.overall.quality >= 90) {
    console.log('  ✅ Quality: Excellent');
  } else if (monitoringData.overall.quality >= 80) {
    console.log('  ⚠️  Quality: Good');
  } else {
    console.log('  ❌ Quality: Needs Improvement');
  }
  
  if (monitoringData.overall.warnings <= 10) {
    console.log('  ✅ Warnings: Low');
  } else if (monitoringData.overall.warnings <= 50) {
    console.log('  ⚠️  Warnings: Moderate');
  } else {
    console.log('  ❌ Warnings: High');
  }
  
  // Save monitoring data
  const reportPath = path.join(__dirname, '../translation-monitoring-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(monitoringData, null, 2));
  console.log(`\n📄 Monitoring report saved to: ${reportPath}`);
  
  return monitoringData;
}

/**
 * Main execution
 */
function main() {
  try {
    monitorAllPlatforms();
    const report = generateMonitoringReport();
    
    // Exit with appropriate code based on quality
    if (report.overall.coverage < 90 || report.overall.quality < 80) {
      console.log('\n❌ Translation quality below threshold!');
      process.exit(1);
    } else {
      console.log('\n✅ Translation quality within acceptable range!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Monitoring script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { monitorAllPlatforms, generateMonitoringReport };