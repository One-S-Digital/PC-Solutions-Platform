#!/usr/bin/env node

/**
 * Clean Admin Translation Files
 * 
 * This script removes corrupted keys and invalid entries from admin translation files.
 * It creates backups before making changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_LOCALES_DIR = path.join(__dirname, '..', 'admin', 'src', 'i18n', 'locales');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', `admin-translations-${new Date().toISOString().split('T')[0]}`);

// Invalid keys to remove
const INVALID_KEYS = [
  ' ', ',', '-', '.', 'div', 'code', 'a', 'tailwindcss',
  'primaryColor', 'secondaryColor', 'accentColor',
  'adminPrimaryColor', 'adminSecondaryColor', 'adminAccentColor',
  'logo', 'adminLogo', 'favicon', 'adminFavicon',
  'heroTitle', 'heroSubtitle', 'heroButtonText', 'heroButtonLink',
  'siteName', 'siteDescription', 'contactEmail', 'contactPhone',
  'clerkPublishableKey', 'clerkSecretKey',
  'googleAnalyticsId', 'facebookPixelId',
  'notificationEmail', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword',
  'de-CH'
];

// Keys that are API paths or URLs
const isAPIPath = (key) => {
  return key.startsWith('/api/') || 
         key.startsWith('/') || 
         key.includes('/uploads');
};

// Keys that reference other namespaces incorrectly
const isNamespaceReference = (key) => {
  return key.includes(':') || key.includes('common.') || key.includes('auth.');
};

// Keys that are just placeholder text
const isPlaceholderText = (key) => {
  const placeholders = [
    'Password reset functionality TBD',
    'Email sent successfully!',
    'System setting created successfully!',
    'Integration created successfully!',
    'Maintenance schedule created successfully!',
    'Maintenance mode enabled successfully!',
    'Maintenance mode disabled successfully!',
    'hardcodedText'
  ];
  return placeholders.includes(key);
};

// Check if value is self-referential
const isSelfReferential = (key, value) => {
  if (typeof value !== 'string') return false;
  return value === key || value.endsWith(`.${key}`);
};

// Recursively clean object
function cleanObject(obj, prefix = '') {
  const cleaned = {};
  let removedCount = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key should be removed
    if (INVALID_KEYS.includes(key)) {
      console.log(`  ❌ Removing invalid key: "${key}"`);
      removedCount++;
      continue;
    }
    
    if (isAPIPath(key)) {
      console.log(`  ❌ Removing API path key: "${key}"`);
      removedCount++;
      continue;
    }
    
    if (isNamespaceReference(key)) {
      console.log(`  ❌ Removing namespace reference: "${key}"`);
      removedCount++;
      continue;
    }
    
    if (isPlaceholderText(key)) {
      console.log(`  ❌ Removing placeholder text: "${key}"`);
      removedCount++;
      continue;
    }
    
    // Check value
    if (typeof value === 'object' && value !== null) {
      // Recursively clean nested objects
      const [cleanedNested, nestedRemoved] = cleanObject(value, prefix ? `${prefix}.${key}` : key);
      
      // Only include if it has content
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      } else {
        console.log(`  ❌ Removing empty object: "${key}"`);
        removedCount++;
      }
      removedCount += nestedRemoved;
    } else if (typeof value === 'string') {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (isSelfReferential(fullKey, value)) {
        console.log(`  ❌ Removing self-referential: "${fullKey}": "${value}"`);
        removedCount++;
        continue;
      }
      
      // Keep valid string values
      cleaned[key] = value;
    }
  }
  
  return [cleaned, removedCount];
}

// Process a single file
function cleanTranslationFile(filePath, relativePath) {
  console.log(`\n📄 Processing: ${relativePath}`);
  
  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Count original keys
    const originalKeyCount = JSON.stringify(data).split('"').length;
    
    // Clean the data
    const [cleaned, removedCount] = cleanObject(data);
    
    // Count cleaned keys
    const cleanedKeyCount = JSON.stringify(cleaned).split('"').length;
    
    if (removedCount > 0) {
      // Create backup
      const backupPath = path.join(BACKUP_DIR, relativePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);
      
      // Write cleaned file
      fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n');
      
      console.log(`  ✅ Cleaned! Removed ${removedCount} invalid entries`);
      console.log(`  📦 Backup saved to: ${backupPath}`);
      
      return { removedCount, success: true };
    } else {
      console.log(`  ✅ No issues found`);
      return { removedCount: 0, success: true };
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { removedCount: 0, success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('🧹 Admin Translation Cleaner');
  console.log('=============================\n');
  
  // Check if admin locales directory exists
  if (!fs.existsSync(ADMIN_LOCALES_DIR)) {
    console.log('❌ Admin locales directory not found:', ADMIN_LOCALES_DIR);
    process.exit(1);
  }
  
  // Create backup directory
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Backup directory created: ${BACKUP_DIR}\n`);
  
  const languages = ['en', 'fr', 'de'];
  const namespaces = ['common', 'auth', 'dashboard'];
  
  let totalRemoved = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  
  for (const lang of languages) {
    for (const ns of namespaces) {
      const filePath = path.join(ADMIN_LOCALES_DIR, lang, `${ns}.json`);
      const relativePath = `${lang}/${ns}.json`;
      
      if (fs.existsSync(filePath)) {
        totalProcessed++;
        const result = cleanTranslationFile(filePath, relativePath);
        totalRemoved += result.removedCount;
        if (!result.success) totalErrors++;
      }
    }
  }
  
  console.log('\n\n📊 Summary');
  console.log('==========');
  console.log(`Files processed: ${totalProcessed}`);
  console.log(`Invalid entries removed: ${totalRemoved}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`\n✅ Cleanup complete!`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the cleaned files in admin/src/i18n/locales/`);
  console.log(`   2. Test the admin panel in all languages`);
  console.log(`   3. If issues occur, restore from: ${BACKUP_DIR}`);
  console.log(`   4. Run: node scripts/validate-translations.mjs`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
