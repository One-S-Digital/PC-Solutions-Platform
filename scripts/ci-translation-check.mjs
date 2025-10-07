#!/usr/bin/env node

/**
 * CI/CD Translation Check Script
 * 
 * This script runs translation validation as part of CI/CD pipeline
 * and ensures translation quality gates are met.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CI/CD Configuration
const CI_CONFIG = {
  minCoverage: 95, // Minimum translation coverage percentage
  maxErrors: 0,    // Maximum allowed errors
  maxWarnings: 10, // Maximum allowed warnings
  requiredLanguages: ['en', 'fr', 'de'],
  requiredNamespaces: ['common', 'auth', 'dashboard']
};

// CI/CD Results
const ciResults = {
  passed: true,
  checks: [],
  coverage: 0,
  errors: 0,
  warnings: 0,
  missingKeys: 0,
  recommendations: []
};

/**
 * Run translation validation
 */
function runTranslationValidation() {
  console.log('🔍 Running translation validation...');
  
  try {
    const output = execSync('node scripts/translation-validation.mjs', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(output);
    
    // Parse validation results
    const reportPath = path.join(__dirname, '../translation-validation-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      ciResults.coverage = report.overall.coverage;
      ciResults.errors = report.overall.totalErrors;
      ciResults.warnings = report.overall.totalWarnings;
      
      // Count missing keys
      ciResults.missingKeys = [
        ...report.frontend.missingKeys,
        ...report.admin.missingKeys,
        ...report.shared.missingKeys
      ].length;
      
      ciResults.checks.push({
        name: 'Translation Validation',
        passed: report.overall.isValid,
        details: `Coverage: ${report.overall.coverage}%, Errors: ${report.overall.totalErrors}, Warnings: ${report.overall.totalWarnings}`
      });
    }
    
  } catch (error) {
    console.error('❌ Translation validation failed:', error.message);
    ciResults.checks.push({
      name: 'Translation Validation',
      passed: false,
      details: `Validation failed: ${error.message}`
    });
    ciResults.passed = false;
  }
}

/**
 * Check translation coverage
 */
function checkCoverage() {
  console.log('📊 Checking translation coverage...');
  
  const coverageCheck = {
    name: 'Translation Coverage',
    passed: ciResults.coverage >= CI_CONFIG.minCoverage,
    details: `Coverage: ${ciResults.coverage}% (minimum: ${CI_CONFIG.minCoverage}%)`
  };
  
  ciResults.checks.push(coverageCheck);
  
  if (!coverageCheck.passed) {
    ciResults.passed = false;
    ciResults.recommendations.push(`Increase translation coverage to at least ${CI_CONFIG.minCoverage}%`);
  }
}

/**
 * Check error limits
 */
function checkErrorLimits() {
  console.log('❌ Checking error limits...');
  
  const errorCheck = {
    name: 'Error Limits',
    passed: ciResults.errors <= CI_CONFIG.maxErrors,
    details: `Errors: ${ciResults.errors} (maximum: ${CI_CONFIG.maxErrors})`
  };
  
  ciResults.checks.push(errorCheck);
  
  if (!errorCheck.passed) {
    ciResults.passed = false;
    ciResults.recommendations.push('Fix all translation errors before merging');
  }
}

/**
 * Check warning limits
 */
function checkWarningLimits() {
  console.log('⚠️ Checking warning limits...');
  
  const warningCheck = {
    name: 'Warning Limits',
    passed: ciResults.warnings <= CI_CONFIG.maxWarnings,
    details: `Warnings: ${ciResults.warnings} (maximum: ${CI_CONFIG.maxWarnings})`
  };
  
  ciResults.checks.push(warningCheck);
  
  if (!warningCheck.passed) {
    ciResults.recommendations.push('Consider reducing translation warnings');
  }
}

/**
 * Check required languages
 */
function checkRequiredLanguages() {
  console.log('🌍 Checking required languages...');
  
  const missingLanguages = [];
  
  for (const lang of CI_CONFIG.requiredLanguages) {
    const frontendExists = fs.existsSync(path.join(__dirname, `../frontend/public/locales/${lang}`));
    const adminExists = fs.existsSync(path.join(__dirname, `../admin/src/i18n/locales/${lang}`));
    
    if (!frontendExists || !adminExists) {
      missingLanguages.push(lang);
    }
  }
  
  const languageCheck = {
    name: 'Required Languages',
    passed: missingLanguages.length === 0,
    details: missingLanguages.length === 0 
      ? `All required languages present: ${CI_CONFIG.requiredLanguages.join(', ')}`
      : `Missing languages: ${missingLanguages.join(', ')}`
  };
  
  ciResults.checks.push(languageCheck);
  
  if (!languageCheck.passed) {
    ciResults.passed = false;
    ciResults.recommendations.push(`Add missing language directories: ${missingLanguages.join(', ')}`);
  }
}

/**
 * Check required namespaces
 */
function checkRequiredNamespaces() {
  console.log('📚 Checking required namespaces...');
  
  const missingNamespaces = [];
  
  for (const lang of CI_CONFIG.requiredLanguages) {
    for (const namespace of CI_CONFIG.requiredNamespaces) {
      const frontendFile = path.join(__dirname, `../frontend/public/locales/${lang}/${namespace}.json`);
      const adminFile = path.join(__dirname, `../admin/src/i18n/locales/${lang}/${namespace}.json`);
      
      if (!fs.existsSync(frontendFile) || !fs.existsSync(adminFile)) {
        missingNamespaces.push(`${lang}/${namespace}`);
      }
    }
  }
  
  const namespaceCheck = {
    name: 'Required Namespaces',
    passed: missingNamespaces.length === 0,
    details: missingNamespaces.length === 0 
      ? `All required namespaces present: ${CI_CONFIG.requiredNamespaces.join(', ')}`
      : `Missing namespaces: ${missingNamespaces.join(', ')}`
  };
  
  ciResults.checks.push(namespaceCheck);
  
  if (!namespaceCheck.passed) {
    ciResults.passed = false;
    ciResults.recommendations.push(`Add missing namespace files: ${missingNamespaces.join(', ')}`);
  }
}

/**
 * Check for hardcoded text
 */
function checkHardcodedText() {
  console.log('🔍 Checking for hardcoded text...');
  
  try {
    const output = execSync('node scripts/translation-audit-simple.mjs', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    // Parse hardcoded text count from output
    const hardcodedMatch = output.match(/Hardcoded Text: (\d+)/g);
    const totalHardcoded = hardcodedMatch ? 
      hardcodedMatch.reduce((sum, match) => sum + parseInt(match.match(/\d+/)[0]), 0) : 0;
    
    const hardcodedCheck = {
      name: 'Hardcoded Text',
      passed: totalHardcoded <= 50, // Allow some hardcoded text
      details: `Hardcoded text instances: ${totalHardcoded}`
    };
    
    ciResults.checks.push(hardcodedCheck);
    
    if (totalHardcoded > 50) {
      ciResults.recommendations.push('Consider reducing hardcoded text instances');
    }
    
  } catch (error) {
    console.error('❌ Hardcoded text check failed:', error.message);
    ciResults.checks.push({
      name: 'Hardcoded Text',
      passed: false,
      details: `Check failed: ${error.message}`
    });
  }
}

/**
 * Generate CI/CD report
 */
function generateCIReport() {
  console.log('\n🚀 CI/CD TRANSLATION CHECK REPORT');
  console.log('==================================\n');
  
  // Overall status
  console.log(`Overall Status: ${ciResults.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Coverage: ${ciResults.coverage}%`);
  console.log(`Errors: ${ciResults.errors}`);
  console.log(`Warnings: ${ciResults.warnings}`);
  console.log(`Missing Keys: ${ciResults.missingKeys}\n`);
  
  // Individual checks
  console.log('Check Results:');
  ciResults.checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.log(`  ${status} ${check.name}: ${check.details}`);
  });
  
  // Recommendations
  if (ciResults.recommendations.length > 0) {
    console.log('\nRecommendations:');
    ciResults.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  // Save CI report
  const reportPath = path.join(__dirname, '../ci-translation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(ciResults, null, 2));
  console.log(`\n📄 CI report saved to: ${reportPath}`);
  
  return ciResults.passed;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting CI/CD Translation Check...\n');
  
  try {
    // Run all checks
    runTranslationValidation();
    checkCoverage();
    checkErrorLimits();
    checkWarningLimits();
    checkRequiredLanguages();
    checkRequiredNamespaces();
    checkHardcodedText();
    
    // Generate report
    const passed = generateCIReport();
    
    if (!passed) {
      console.log('\n❌ CI/CD Translation Check FAILED!');
      console.log('Please fix the issues above before merging.');
      process.exit(1);
    } else {
      console.log('\n✅ CI/CD Translation Check PASSED!');
      console.log('All translation quality gates met.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 CI/CD Translation Check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runCITranslationCheck };