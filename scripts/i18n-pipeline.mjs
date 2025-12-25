#!/usr/bin/env node

/**
 * Master i18n Pipeline Script
 * 
 * Orchestrates all i18n validation checks in the correct order:
 * 1. Validate translation JSON files
 * 2. Extract used i18n keys
 * 3. Check for missing keys across EN/FR/DE
 * 4. Scan for hardcoded strings
 * 5. Lint translation values for quality issues
 * 
 * Usage:
 *   node scripts/i18n-pipeline.mjs              # Local run (non-blocking quality issues)
 *   node scripts/i18n-pipeline.mjs --ci         # CI run (stricter checks)
 *   node scripts/i18n-pipeline.mjs --strict-quality  # Fail on quality issues
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const strictQuality = args.includes('--strict-quality');

// Detect package manager (prefer pnpm, fallback to npm)
let packageManager = 'npm';
try {
  execSync('pnpm --version', { stdio: 'ignore', cwd: ROOT_DIR });
  packageManager = 'pnpm';
} catch {
  // pnpm not available, use npm
}

// Track overall status
let hasErrors = false;
const stepResults = [];

/**
 * Run a command and capture output
 */
function runCommand(command, description, options = {}) {
  const { allowNonZero = false, captureOutput = false } = options;
  
  console.log(`\n📋 Step: ${description}`);
  console.log(`   Running: ${command}\n`);
  
  try {
    if (captureOutput) {
      // Split command into parts for spawnSync
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? true : false;
      const commandParts = isWindows ? command : command.split(' ');
      
      const result = spawnSync(isWindows ? command : commandParts[0], isWindows ? [] : commandParts.slice(1), {
        shell: shell,
        cwd: ROOT_DIR,
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      const stdout = (result.stdout || '').toString();
      const stderr = (result.stderr || '').toString();
      
      // Print output to console for visibility
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      
      if (result.status !== 0 && !allowNonZero) {
        console.error(`\n❌ ${description} failed with exit code ${result.status}`);
        hasErrors = true;
        return { success: false, stdout, stderr, exitCode: result.status };
      }
      
      console.log(`\n✅ ${description} completed`);
      return { success: true, stdout, stderr, exitCode: result.status };
    } else {
      execSync(command, {
        stdio: 'inherit',
        cwd: ROOT_DIR
      });
      console.log(`\n✅ ${description} completed`);
      return { success: true };
    }
  } catch (error) {
    if (!allowNonZero) {
      console.error(`\n❌ ${description} failed`);
      if (error.message) console.error(error.message);
      if (error.stdout) console.error(error.stdout.toString());
      if (error.stderr) console.error(error.stderr.toString());
      hasErrors = true;
      return { success: false, error: error.message };
    }
    return { success: true, error: error.message };
  }
}

/**
 * Read and parse JSON file
 */
function readJSON(filePath) {
  try {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Parse lint-translation-values output to extract counts
 */
function parseLintOutput(output) {
  const placeholderMatch = output.match(/Placeholder Markers.*?(\d+)\s+found/);
  const mixedLanguageMatch = output.match(/Mixed Language Values.*?(\d+)\s+found/);
  const todoMatch = output.match(/TODO Markers.*?(\d+)\s+found/);
  const missingInterpolationMatch = output.match(/Missing Interpolation Placeholders.*?(\d+)\s+found/);
  
  return {
    placeholderMarkers: placeholderMatch ? parseInt(placeholderMatch[1], 10) : 0,
    mixedLanguage: mixedLanguageMatch ? parseInt(mixedLanguageMatch[1], 10) : 0,
    todoMarkers: todoMatch ? parseInt(todoMatch[1], 10) : 0,
    missingInterpolation: missingInterpolationMatch ? parseInt(missingInterpolationMatch[1], 10) : 0
  };
}

/**
 * Main pipeline execution
 */
function main() {
  console.log('\n🚀 Starting i18n Pipeline');
  console.log(`   Package Manager: ${packageManager}`);
  console.log(`   Mode: ${isCI ? 'CI' : 'Local'}${strictQuality ? ' (strict quality)' : ''}\n`);
  
  // Step 1: Validate translation JSON files
  const step1 = runCommand(
    'node scripts/validate-translations.mjs',
    'Validate translation JSON files'
  );
  stepResults.push({ step: 1, name: 'Validate translations', ...step1 });
  if (!step1.success) {
    console.error('\n❌ Pipeline failed at step 1: Validation');
    process.exit(1);
  }
  
  // Step 2: Extract used i18n keys
  const step2 = runCommand(
    `${packageManager} run extract:i18n-keys`,
    'Extract used i18n keys'
  );
  stepResults.push({ step: 2, name: 'Extract keys', ...step2 });
  if (!step2.success) {
    console.error('\n❌ Pipeline failed at step 2: Extract keys');
    process.exit(1);
  }
  
  // Step 3: Check for missing keys
  const step3 = runCommand(
    `${packageManager} run check:i18n-keys`,
    'Check for missing translation keys'
  );
  stepResults.push({ step: 3, name: 'Check missing keys', ...step3 });
  if (!step3.success) {
    console.error('\n❌ Pipeline failed at step 3: Check missing keys');
    process.exit(1);
  }
  
  // Step 4: Find hardcoded strings
  const step4 = runCommand(
    'node scripts/find-hardcoded-strings.mjs',
    'Scan for hardcoded strings'
  );
  stepResults.push({ step: 4, name: 'Find hardcoded strings', ...step4 });
  if (!step4.success) {
    console.error('\n❌ Pipeline failed at step 4: Find hardcoded strings');
    process.exit(1);
  }
  
  // Step 5: Lint translation values (capture output for parsing)
  const step5 = runCommand(
    'node scripts/lint-translation-values.mjs',
    'Lint translation values for quality',
    { allowNonZero: true, captureOutput: true }
  );
  stepResults.push({ step: 5, name: 'Lint translation values', ...step5 });
  
  // Parse reports for summary
  const missingKeysReport = readJSON('i18n-missing-keys.json');
  const hardcodedReport = readJSON('scripts/i18n-hardcoded-report.json');
  const lintCounts = step5.stdout ? parseLintOutput(step5.stdout + step5.stderr) : null;
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Pipeline Summary');
  console.log('='.repeat(60));
  
  // Missing keys summary
  if (missingKeysReport && missingKeysReport.summary) {
    const missing = missingKeysReport.summary.missingKeys;
    const totalMissing = (missing.de || 0) + (missing.en || 0) + (missing.fr || 0);
    
    console.log('\n🔑 Missing Translation Keys:');
    console.log(`   EN: ${missing.en || 0}`);
    console.log(`   FR: ${missing.fr || 0}`);
    console.log(`   DE: ${missing.de || 0}`);
    console.log(`   Total: ${totalMissing}`);
    
    if (totalMissing > 0) {
      console.error(`\n❌ Missing keys detected! Check i18n-missing-keys.json for details.`);
      hasErrors = true;
    } else {
      console.log(`   ✅ All keys present`);
    }
  } else {
    console.log('\n⚠️  Could not read missing keys report');
  }
  
  // Hardcoded strings summary
  if (hardcodedReport && hardcodedReport.totals) {
    const totals = hardcodedReport.totals;
    const newIssues = (totals.newHigh || 0) + (totals.newMedium || 0);
    
    console.log('\n📝 Hardcoded Strings:');
    console.log(`   New High Priority: ${totals.newHigh || 0}`);
    console.log(`   New Medium Priority: ${totals.newMedium || 0}`);
    console.log(`   Legacy High: ${totals.legacyHigh || 0}`);
    console.log(`   Legacy Medium: ${totals.legacyMedium || 0}`);
    console.log(`   Total New Issues: ${newIssues}`);
    
    if (newIssues > 0) {
      console.error(`\n❌ New hardcoded strings detected! Check scripts/i18n-hardcoded-report.json for details.`);
      hasErrors = true;
    } else {
      console.log(`   ✅ No new hardcoded strings`);
    }
  } else {
    console.log('\n⚠️  Could not read hardcoded strings report');
  }
  
  // Quality issues summary
  if (lintCounts) {
    console.log('\n🎨 Translation Quality Issues:');
    console.log(`   Placeholder Markers: ${lintCounts.placeholderMarkers}`);
    console.log(`   Mixed Language: ${lintCounts.mixedLanguage}`);
    console.log(`   TODO Markers: ${lintCounts.todoMarkers}`);
    console.log(`   Missing Interpolation: ${lintCounts.missingInterpolation}`);
    
    if (lintCounts.missingInterpolation > 0) {
      console.error(`\n❌ Missing interpolation placeholders detected (BLOCKING)!`);
      hasErrors = true;
    }
    
    if (strictQuality) {
      const qualityIssues = lintCounts.placeholderMarkers + lintCounts.mixedLanguage;
      if (qualityIssues > 0) {
        console.error(`\n❌ Quality issues detected (strict mode): ${qualityIssues} total`);
        hasErrors = true;
      } else {
        console.log(`   ✅ No quality issues (strict mode)`);
      }
    } else {
      const qualityIssues = lintCounts.placeholderMarkers + lintCounts.mixedLanguage;
      if (qualityIssues > 0) {
        console.log(`   ⚠️  ${qualityIssues} quality issues (non-blocking, see lint output above)`);
      } else {
        console.log(`   ✅ No quality issues`);
      }
    }
  } else {
    console.log('\n⚠️  Could not parse lint output');
  }
  
  // CI-specific checks
  if (isCI) {
    console.log('\n🔍 CI Mode Checks:');
    
    // Check for missing keys (already checked above)
    if (missingKeysReport && missingKeysReport.summary) {
      const totalMissing = Object.values(missingKeysReport.summary.missingKeys || {}).reduce((a, b) => a + b, 0);
      if (totalMissing > 0) {
        console.error(`   ❌ CI: Missing keys must be 0 (found: ${totalMissing})`);
        hasErrors = true;
      } else {
        console.log(`   ✅ CI: No missing keys`);
      }
    }
    
    // Check for new hardcoded issues (already checked above)
    if (hardcodedReport && hardcodedReport.totals) {
      const newIssues = (hardcodedReport.totals.newHigh || 0) + (hardcodedReport.totals.newMedium || 0);
      if (newIssues > 0) {
        console.error(`   ❌ CI: New hardcoded issues must be 0 (found: ${newIssues})`);
        hasErrors = true;
      } else {
        console.log(`   ✅ CI: No new hardcoded issues`);
      }
    }
    
    // Optional: Check legacy high if env var is set
    if (process.env.I18N_FAIL_LEGACY_HIGH === 'true' && hardcodedReport && hardcodedReport.totals) {
      const legacyHigh = hardcodedReport.totals.legacyHigh || 0;
      if (legacyHigh > 0) {
        console.error(`   ❌ CI: Legacy high priority issues must be 0 (found: ${legacyHigh})`);
        hasErrors = true;
      } else {
        console.log(`   ✅ CI: No legacy high priority issues`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Final result
  if (hasErrors) {
    console.error('\n❌ Pipeline completed with errors');
    console.error('   Review the reports above and fix issues before committing.');
    process.exit(1);
  } else {
    console.log('\n✅ Pipeline completed successfully!');
    console.log('   All i18n checks passed.');
    process.exit(0);
  }
}

// Run the pipeline
main();

