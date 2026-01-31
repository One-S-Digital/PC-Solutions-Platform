#!/usr/bin/env node

/**
 * Prebuild script for Knowledge Base documentation
 * 
 * This script validates that:
 * 1. All required documentation files exist for each language
 * 2. The documentation structure is consistent across languages
 * 3. Key files have content (not empty placeholders)
 * 
 * Run: node scripts/prebuild-knowledge-base.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const KB_ROOT = join(PROJECT_ROOT, 'docs', 'knowledge-base');

// Supported languages
const LANGUAGES = ['en', 'fr', 'de'];
const PRIMARY_LANGUAGE = 'en';

// Required documentation files (relative to language folder)
const REQUIRED_FILES = {
  tutorials: [
    '1-getting-started.md',
  ],
  guides: [
    '2-foundation-daycare-guide.md',
    '3-product-supplier-guide.md',
    '4-service-provider-guide.md',
    '5-educator-candidate-guide.md',
    '6-parent-guide.md',
    '8-common-features.md',
    '9-billing-and-subscriptions.md',
  ],
  reference: [
    '10-troubleshooting-faq.md',
    'glossary.md',
    'settings-guide.md',
    'supported-browsers.md',
    'security-and-compliance.md',
  ],
};

// Minimum content length (in characters) to be considered non-placeholder
const MIN_CONTENT_LENGTH = 500;

// Logging utilities
const log = (message) => console.log(`✅ ${message}`);
const warn = (message) => console.warn(`⚠️  ${message}`);
const error = (message) => console.error(`❌ ${message}`);
const info = (message) => console.log(`ℹ️  ${message}`);

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if a file exists and has content
 */
function checkFile(filePath, isRequired = true) {
  if (!existsSync(filePath)) {
    if (isRequired) {
      error(`Missing required file: ${filePath}`);
      hasErrors = true;
    } else {
      warn(`Missing optional file: ${filePath}`);
      hasWarnings = true;
    }
    return false;
  }

  const stats = statSync(filePath);
  if (stats.size < MIN_CONTENT_LENGTH) {
    const message = `File appears to be a placeholder (< ${MIN_CONTENT_LENGTH} chars): ${filePath}`;
    if (isRequired) {
      error(message);
      hasErrors = true;
    } else {
      warn(message);
      hasWarnings = true;
    }
    return false;
  }

  return true;
}

/**
 * Check all required files for a language
 */
function checkLanguageFiles(lang) {
  const langPath = join(KB_ROOT, lang);
  
  if (!existsSync(langPath)) {
    if (lang === PRIMARY_LANGUAGE) {
      error(`Primary language folder missing: ${langPath}`);
      hasErrors = true;
    } else {
      warn(`Translation folder missing: ${langPath}`);
      hasWarnings = true;
    }
    return;
  }

  info(`Checking ${lang.toUpperCase()} documentation...`);

  for (const [folder, files] of Object.entries(REQUIRED_FILES)) {
    for (const file of files) {
      const filePath = join(langPath, folder, file);
      const isRequired = lang === PRIMARY_LANGUAGE;
      
      if (checkFile(filePath, isRequired)) {
        if (lang === PRIMARY_LANGUAGE) {
          log(`Found: ${lang}/${folder}/${file}`);
        }
      }
    }
  }
}

/**
 * Check for consistency between languages
 */
function checkLanguageConsistency() {
  const primaryLangPath = join(KB_ROOT, PRIMARY_LANGUAGE);
  
  if (!existsSync(primaryLangPath)) {
    return;
  }

  info('Checking translation completeness...');

  for (const lang of LANGUAGES) {
    if (lang === PRIMARY_LANGUAGE) continue;

    const langPath = join(KB_ROOT, lang);
    if (!existsSync(langPath)) {
      warn(`${lang.toUpperCase()}: No translations found`);
      continue;
    }

    let translatedCount = 0;
    let totalCount = 0;

    for (const [folder, files] of Object.entries(REQUIRED_FILES)) {
      for (const file of files) {
        totalCount++;
        const filePath = join(langPath, folder, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          if (content.length >= MIN_CONTENT_LENGTH) {
            translatedCount++;
          }
        }
      }
    }

    const percentage = Math.round((translatedCount / totalCount) * 100);
    if (percentage === 100) {
      log(`${lang.toUpperCase()}: Fully translated (${translatedCount}/${totalCount} files)`);
    } else if (percentage >= 50) {
      warn(`${lang.toUpperCase()}: Partially translated (${translatedCount}/${totalCount} files - ${percentage}%)`);
    } else {
      warn(`${lang.toUpperCase()}: Translation needed (${translatedCount}/${totalCount} files - ${percentage}%)`);
    }
  }
}

/**
 * Check README exists
 */
function checkReadme() {
  const readmePath = join(KB_ROOT, 'README.md');
  if (checkFile(readmePath, true)) {
    log('Found: README.md (main navigation)');
  }
}

/**
 * Main execution
 */
function main() {
  console.log('');
  console.log('📚 Knowledge Base Prebuild Validation');
  console.log('=====================================');
  console.log('');

  // Check knowledge base root exists
  if (!existsSync(KB_ROOT)) {
    error(`Knowledge base root not found: ${KB_ROOT}`);
    process.exit(1);
  }

  // Check README
  checkReadme();
  console.log('');

  // Check primary language (required)
  checkLanguageFiles(PRIMARY_LANGUAGE);
  console.log('');

  // Check translations (optional, but warn if missing)
  for (const lang of LANGUAGES) {
    if (lang !== PRIMARY_LANGUAGE) {
      checkLanguageFiles(lang);
    }
  }
  console.log('');

  // Check consistency
  checkLanguageConsistency();
  console.log('');

  // Summary
  console.log('=====================================');
  if (hasErrors) {
    error('Knowledge base validation FAILED');
    error('Please add missing required documentation files');
    process.exit(1);
  } else if (hasWarnings) {
    warn('Knowledge base validation passed with warnings');
    warn('Consider completing translations for FR and DE');
    process.exit(0);
  } else {
    log('Knowledge base validation PASSED');
    process.exit(0);
  }
}

main();
