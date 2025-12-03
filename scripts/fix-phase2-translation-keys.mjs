#!/usr/bin/env node
/**
 * ⚠️  DEPRECATED - DO NOT USE ⚠️
 * 
 * This script has been DEPRECATED because it causes issues with the translation system.
 * It incorrectly modifies translation keys, removing namespace prefixes, which breaks translations.
 * 
 * USE INSTEAD: scripts/check-untranslated-strings.mjs
 * 
 * That script only REPORTS issues and does NOT modify code.
 * 
 * This script is kept for reference only. DO NOT RUN IT.
 * 
 * Previous description:
 * Phase 2: Fix Remaining Translation Keys
 * Fixes all remaining dashboard, analytics, profile, and other page-specific
 * translation keys that weren't handled in Phase 1.
 * 
 * Usage: node scripts/fix-phase2-translation-keys.mjs [--dry-run]
 */

// Exit immediately with warning
console.error('❌ ERROR: This script has been DEPRECATED and should not be used.');
console.error('💡 Use "npm run check:untranslated" instead to find untranslated strings.');
console.error('📖 See scripts/README-translation-scripts.md for details.');
process.exit(1);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const DRY_RUN = process.argv.includes('--dry-run');

// Track changes
const changes = {
  filesModified: 0,
  totalReplacements: 0,
  byFile: {},
  byPattern: {},
};

/**
 * Recursively find files
 */
function findFiles(dir, pattern = /\.(ts|tsx)$/, ignorePatterns = [/node_modules/, /dist/, /build/, /\.d\.ts$/]) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (ignorePatterns.some(p => p.test(fullPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Phase 2 Pattern definitions
 * These handle the remaining dashboard, analytics, and role-specific pages
 */
const PHASE2_PATTERNS = [
  // Keep supportPage.* as-is (it's correctly namespaced)
  // No change needed for supportPage patterns
  
  // Foundation-specific pages
  {
    name: 'foundationOrdersAppointmentsPage.*',
    find: /t\(['"`]foundationOrdersAppointmentsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('foundationOrdersAppointmentsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'foundationLeadsPage.*',
    find: /t\(['"`]foundationLeadsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('foundationLeadsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'foundationAnalyticsPage.*',
    find: /t\(['"`]foundationAnalyticsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('foundationAnalyticsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'foundationOrganisationProfilePage.*',
    find: /t\(['"`]foundationOrganisationProfilePage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('foundationOrganisationProfilePage.$1'",
    namespace: 'dashboard'
  },
  
  // Supplier-specific pages
  {
    name: 'supplierAnalyticsPage.*',
    find: /t\(['"`]supplierAnalyticsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('supplierAnalyticsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'supplierProductListingsPage.*',
    find: /t\(['"`]supplierProductListingsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('supplierProductListingsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'supplierOrdersPage.*',
    find: /t\(['"`]supplierOrdersPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('supplierOrdersPage.$1'",
    namespace: 'dashboard'
  },
  
  // Service Provider pages
  {
    name: 'serviceProviderAnalyticsPage.*',
    find: /t\(['"`]serviceProviderAnalyticsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('serviceProviderAnalyticsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'serviceProviderListingsPage.*',
    find: /t\(['"`]serviceProviderListingsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('serviceProviderListingsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'serviceProviderRequestsPage.*',
    find: /t\(['"`]serviceProviderRequestsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('serviceProviderRequestsPage.$1'",
    namespace: 'dashboard'
  },
  
  // Educator pages
  {
    name: 'educatorApplicationsPage.*',
    find: /t\(['"`]educatorApplicationsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('educatorApplicationsPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'educatorJobBoardPage.*',
    find: /t\(['"`]educatorJobBoardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('educatorJobBoardPage.$1'",
    namespace: 'dashboard'
  },
  
  // Parent pages
  {
    name: 'parentEnquiriesPage.*',
    find: /t\(['"`]parentEnquiriesPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('parentEnquiriesPage.$1'",
    namespace: 'dashboard'
  },
  
  // Partner pages
  {
    name: 'partnerDetailPage.*',
    find: /t\(['"`]partnerDetailPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('partnerDetailPage.$1'",
    namespace: 'dashboard'
  },
  
  // Dashboard pages
  {
    name: 'dashboardPage.*',
    find: /t\(['"`]dashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('dashboardPage.$1'",
    namespace: 'dashboard'
  },
  {
    name: 'dashboardDetailPage.*',
    find: /t\(['"`]dashboardDetailPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('dashboardDetailPage.$1'",
    namespace: 'dashboard'
  },
  
  // Admin pages
  {
    name: 'adminSystemMonitoringPage.*',
    find: /t\(['"`]adminSystemMonitoringPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('adminSystemMonitoringPage.$1'",
    namespace: 'admin'
  },
  
  // Other pages
  {
    name: 'notificationsPage.*',
    find: /t\(['"`]notificationsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('notificationsPage.$1'",
    namespace: 'common'
  },
  
  // Recruitment remaining patterns
  {
    name: 'recruitmentPage.candidatePool.*',
    find: /t\(['"`]recruitmentPage\.candidatePool\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('candidatePool.$1'",
    namespace: 'recruitment'
  },
];

/**
 * Process a single file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let fileChanges = 0;
  
  for (const pattern of PHASE2_PATTERNS) {
    const matches = modified.match(pattern.find);
    if (matches && matches.length > 0) {
      modified = modified.replace(pattern.find, pattern.replace);
      
      const count = matches.length;
      fileChanges += count;
      changes.totalReplacements += count;
      
      if (!changes.byPattern[pattern.name]) {
        changes.byPattern[pattern.name] = 0;
      }
      changes.byPattern[pattern.name] += count;
      
      if (!changes.byFile[filePath]) {
        changes.byFile[filePath] = [];
      }
      changes.byFile[filePath].push({
        pattern: pattern.name,
        count: count,
      });
    }
  }
  
  if (fileChanges > 0) {
    changes.filesModified++;
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, modified, 'utf8');
    }
    
    return fileChanges;
  }
  
  return 0;
}

/**
 * Main migration
 */
async function runPhase2Migration() {
  console.log('🔄 Starting Phase 2 Translation Keys Migration...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  const files = findFiles(FRONTEND_DIR);
  console.log(`📂 Found ${files.length} files to process...\n`);
  
  let processedFiles = 0;
  for (const filePath of files) {
    const changeCount = processFile(filePath);
    
    if (changeCount > 0) {
      const relPath = path.relative(FRONTEND_DIR, filePath);
      console.log(`✅ ${relPath}: ${changeCount} replacements`);
    }
    
    processedFiles++;
    
    if (processedFiles % 10 === 0) {
      process.stdout.write(`   Processed ${processedFiles}/${files.length} files...\r`);
    }
  }
  
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 PHASE 2 MIGRATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Files scanned:      ${files.length}`);
  console.log(`Files modified:     ${changes.filesModified}`);
  console.log(`Total replacements: ${changes.totalReplacements}`);
  console.log('');
  
  if (changes.totalReplacements > 0) {
    console.log('📈 Replacements by Pattern:');
    console.log('─'.repeat(60));
    Object.entries(changes.byPattern)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pattern, count]) => {
        console.log(`   ${pattern.padEnd(45)} ${count}`);
      });
    console.log('');
    
    console.log('📝 Top 10 Modified Files:');
    console.log('─'.repeat(60));
    Object.entries(changes.byFile)
      .sort(([, a], [, b]) => {
        const sumA = a.reduce((sum, item) => sum + item.count, 0);
        const sumB = b.reduce((sum, item) => sum + item.count, 0);
        return sumB - sumA;
      })
      .slice(0, 10)
      .forEach(([file, patterns]) => {
        const total = patterns.reduce((sum, p) => sum + p.count, 0);
        const relPath = path.relative(FRONTEND_DIR, file);
        console.log(`   ${relPath}`);
        console.log(`      Total: ${total} changes`);
        patterns.forEach(p => {
          console.log(`      - ${p.pattern}: ${p.count}`);
        });
        console.log('');
      });
  }
  
  const reportPath = path.join(__dirname, '../translation-phase2-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(changes, null, 2), 'utf8');
  console.log(`📄 Phase 2 report saved to: ${reportPath}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN completed - run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Phase 2 Migration completed successfully!');
  }
}

runPhase2Migration().catch(error => {
  console.error('❌ Error during Phase 2 migration:', error);
  process.exit(1);
});
