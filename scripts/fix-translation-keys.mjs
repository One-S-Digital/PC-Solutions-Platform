#!/usr/bin/env node
/**
 * Fix Translation Keys Migration Script
 * 
 * This script automatically fixes translation key prefixes across the codebase
 * by removing redundant "*Page." prefixes that don't match the namespace structure.
 * 
 * Usage: node scripts/fix-translation-keys.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively find files matching pattern
 */
function findFiles(dir, pattern = /\.(ts|tsx)$/, ignorePatterns = [/node_modules/, /dist/, /build/, /\.d\.ts$/]) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Check ignore patterns
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

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const DRY_RUN = process.argv.includes('--dry-run');

// Track changes for report
const changes = {
  filesModified: 0,
  totalReplacements: 0,
  byFile: {},
  byPattern: {},
};

/**
 * Pattern definitions for fixing translation keys
 * Each pattern defines what to find and how to replace it
 */
const FIX_PATTERNS = [
  // SignupPage patterns
  {
    name: 'signupPage.errors.*',
    find: /t\(['"`]signupPage\.errors\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('errors.$1'",
    namespace: 'signup'
  },
  {
    name: 'signupPage.labels.*',
    find: /t\(['"`]signupPage\.labels\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('labels.$1'",
    namespace: 'signup'
  },
  {
    name: 'signupPage.placeholders.*',
    find: /t\(['"`]signupPage\.placeholders\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('placeholders.$1'",
    namespace: 'signup'
  },
  {
    name: 'signupPage.roles.*',
    find: /t\(['"`]signupPage\.roles\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('roles.$1'",
    namespace: 'signup'
  },
  {
    name: 'signupPage.* (general)',
    find: /t\(['"`]signupPage\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('$1'",
    namespace: 'signup'
  },
  
  // RecruitmentPage patterns
  {
    name: 'recruitmentPage.buttons.*',
    find: /t\(['"`]recruitmentPage\.buttons\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('buttons.$1'",
    namespace: 'recruitment'
  },
  {
    name: 'recruitmentPage.labels.*',
    find: /t\(['"`]recruitmentPage\.labels\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('labels.$1'",
    namespace: 'recruitment'
  },
  {
    name: 'recruitmentPage.jobOffers.*',
    find: /t\(['"`]recruitmentPage\.jobOffers\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('jobOffers.$1'",
    namespace: 'recruitment'
  },
  {
    name: 'recruitmentPage.candidateCard.*',
    find: /t\(['"`]recruitmentPage\.candidateCard\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('candidateCard.$1'",
    namespace: 'recruitment'
  },
  {
    name: 'recruitmentPage.*',
    find: /t\(['"`]recruitmentPage\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('$1'",
    namespace: 'recruitment'
  },
  
  // PricingPage patterns
  {
    name: 'pricingPage.sections.*',
    find: /t\(['"`]pricingPage\.sections\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('sections.$1'",
    namespace: 'pricing'
  },
  {
    name: 'pricingPage.suppliers.*',
    find: /t\(['"`]pricingPage\.suppliers\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('suppliers.$1'",
    namespace: 'pricing'
  },
  {
    name: 'pricingPage.*',
    find: /t\(['"`]pricingPage\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('pricingPage.$1'",
    namespace: 'pricing'
  },
  
  // ParentLeadFormPage patterns
  {
    name: 'parentLeadFormPage.labels.*',
    find: /t\(['"`]parentLeadFormPage\.labels\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('labels.$1'",
    namespace: 'parentLeadForm'
  },
  {
    name: 'parentLeadFormPage.placeholder.*',
    find: /t\(['"`]parentLeadFormPage\.placeholder\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('placeholders.$1'",
    namespace: 'parentLeadForm'
  },
  {
    name: 'parentLeadFormPage.placeholders.*',
    find: /t\(['"`]parentLeadFormPage\.placeholders\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('placeholders.$1'",
    namespace: 'parentLeadForm'
  },
  {
    name: 'parentLeadFormPage.*',
    find: /t\(['"`]parentLeadFormPage\.([a-zA-Z0-9]+)['"`]/g,
    replace: "t('$1'",
    namespace: 'parentLeadForm'
  },
  
  // MarketplacePage patterns
  {
    name: 'marketplacePage.*',
    find: /t\(['"`]marketplacePage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('$1'",
    namespace: 'marketplace'
  },
  
  // MessagesPage patterns
  {
    name: 'messagesPage.*',
    find: /t\(['"`]messagesPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('$1'",
    namespace: 'messages'
  },
  
  // UsersPage patterns
  {
    name: 'usersPage.*',
    find: /t\(['"`]usersPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('roleManagement.$1'",
    namespace: 'users'
  },
  
  // ContentManagementDashboard patterns
  {
    name: 'contentManagementDashboard.*',
    find: /t\(['"`]contentManagementDashboard\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('contentManagementDashboard.$1'",
    namespace: 'content'
  },
  
  // ELearningPage patterns
  {
    name: 'eLearningPage.*',
    find: /t\(['"`]eLearningPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('eLearning.$1'",
    namespace: 'content'
  },
  
  // HRProceduresPage patterns
  {
    name: 'hrProceduresPage.*',
    find: /t\(['"`]hrProceduresPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('hrProcedures.$1'",
    namespace: 'content'
  },
  
  // StatePoliciesPage patterns
  {
    name: 'statePoliciesPage.*',
    find: /t\(['"`]statePoliciesPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('statePoliciesPage.$1'",
    namespace: 'content'
  },
  
  // PartnersPage patterns
  {
    name: 'partnersPage.*',
    find: /t\(['"`]partnersPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('partners.$1'",
    namespace: 'admin'
  },
  
  // PlatformSettings patterns
  {
    name: 'platformSettingsPage.*',
    find: /t\(['"`]platformSettingsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('platformSettings.$1'",
    namespace: 'admin'
  },
  
  // DesignSystemPage patterns
  {
    name: 'designSystemPage.*',
    find: /t\(['"`]designSystemPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('designSystem.$1'",
    namespace: 'admin'
  },
  
  // DiscountTerminationsPage patterns
  {
    name: 'discountTerminationsPage.*',
    find: /t\(['"`]discountTerminationsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('discountTerminations.$1'",
    namespace: 'admin'
  },
  
  // SettingsPage patterns
  {
    name: 'settingsPage.*',
    find: /t\(['"`]settingsPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('page.$1'",
    namespace: 'settings'
  },
  
  // EducatorProfilePage patterns
  {
    name: 'educatorProfilePage.*',
    find: /t\(['"`]educatorProfilePage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('educatorProfilePage.$1'",
    namespace: 'dashboard'
  },
  
  // EducatorDashboard patterns
  {
    name: 'educatorDashboardPage.*',
    find: /t\(['"`]educatorDashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('educatorDashboard.$1'",
    namespace: 'dashboard'
  },
  
  // FoundationDashboard patterns
  {
    name: 'foundationDashboardPage.*',
    find: /t\(['"`]foundationDashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('foundationDashboard.$1'",
    namespace: 'dashboard'
  },
  
  // ParentDashboard patterns
  {
    name: 'parentDashboardPage.*',
    find: /t\(['"`]parentDashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('parentDashboard.$1'",
    namespace: 'dashboard'
  },
  
  // SupplierDashboard patterns
  {
    name: 'supplierDashboardPage.*',
    find: /t\(['"`]supplierDashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('supplierDashboard.$1'",
    namespace: 'dashboard'
  },
  
  // ServiceProviderDashboard patterns
  {
    name: 'serviceProviderDashboardPage.*',
    find: /t\(['"`]serviceProviderDashboardPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('serviceProviderDashboard.$1'",
    namespace: 'dashboard'
  },
  
  // SupportPage patterns
  {
    name: 'supportPage.*',
    find: /t\(['"`]supportPage\.([a-zA-Z0-9.]+)['"`]/g,
    replace: "t('supportPage.$1'",
    namespace: 'common'
  },
];

/**
 * Process a single file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let fileChanges = 0;
  
  for (const pattern of FIX_PATTERNS) {
    const matches = modified.match(pattern.find);
    if (matches && matches.length > 0) {
      modified = modified.replace(pattern.find, pattern.replace);
      
      const count = matches.length;
      fileChanges += count;
      changes.totalReplacements += count;
      
      // Track by pattern
      if (!changes.byPattern[pattern.name]) {
        changes.byPattern[pattern.name] = 0;
      }
      changes.byPattern[pattern.name] += count;
      
      // Track by file
      if (!changes.byFile[filePath]) {
        changes.byFile[filePath] = [];
      }
      changes.byFile[filePath].push({
        pattern: pattern.name,
        count: count,
      });
    }
  }
  
  // If changes were made, write the file
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
 * Main migration function
 */
async function runMigration() {
  console.log('🔄 Starting Translation Keys Migration...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  // Find all TypeScript/TSX files in frontend
  const files = findFiles(FRONTEND_DIR);
  
  console.log(`📂 Found ${files.length} files to process...\n`);
  
  // Process each file
  let processedFiles = 0;
  for (const filePath of files) {
    const changeCount = processFile(filePath);
    
    if (changeCount > 0) {
      const relPath = path.relative(FRONTEND_DIR, filePath);
      console.log(`✅ ${relPath}: ${changeCount} replacements`);
    }
    
    processedFiles++;
    
    // Progress indicator
    if (processedFiles % 10 === 0) {
      process.stdout.write(`   Processed ${processedFiles}/${files.length} files...\r`);
    }
  }
  
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
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
        console.log(`   ${pattern.padEnd(40)} ${count}`);
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
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../translation-migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(changes, null, 2), 'utf8');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN completed - run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('❌ Error during migration:', error);
  process.exit(1);
});
