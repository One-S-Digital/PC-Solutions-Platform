import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Import existing JSON translations from packages/translations to database
 * 
 * Usage:
 *   ts-node scripts/import-static-translations.ts
 */
async function importTranslations() {
  const projectRoot = path.join(__dirname, '../..');
  const localesDir = path.join(projectRoot, 'packages/translations/locales');
  
  const languages = ['en', 'fr', 'de'];
  const namespaces = [
    'common',
    'auth',
    'dashboard',
    'settings',
    'billing',
    'elearning',
    'supplier',
    'hr',
    'emails',
    'marketplace',
    'recruitment',
    'users',
    'content',
    'messages',
    'admin',
    'profile',
    'signup',
    'pricing',
    'parentLeadForm',
  ];

  let totalImported = 0;
  let totalSkipped = 0;

  console.log('Starting translation import...');
  console.log(`Languages: ${languages.join(', ')}`);
  console.log(`Namespaces: ${namespaces.join(', ')}`);
  console.log('');

  for (const lang of languages) {
    for (const ns of namespaces) {
      const filePath = path.join(localesDir, lang, `${ns}.json`);

      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${lang}/${ns} - file not found`);
        totalSkipped++;
        continue;
      }

      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const translations = flattenObject(content, ns);

        let imported = 0;
        for (const [key, value] of Object.entries(translations)) {
          try {
            await prisma.staticTranslation.upsert({
              where: {
                namespace_key_lang: {
                  namespace: ns,
                  key,
                  lang,
                },
              },
              update: {
                value: value as string,
                updatedAt: new Date(),
              },
              create: {
                namespace: ns,
                key,
                lang,
                value: value as string,
              },
            });
            imported++;
          } catch (error) {
            console.error(`  ❌ Error importing ${key}:`, error);
          }
        }

        totalImported += imported;
        console.log(`✅ Imported ${lang}/${ns}: ${imported} keys`);
      } catch (error) {
        console.error(`❌ Error processing ${lang}/${ns}:`, error);
      }
    }
  }

  console.log('');
  console.log('=== Import Summary ===');
  console.log(`Total imported: ${totalImported} translations`);
  console.log(`Total skipped: ${totalSkipped} files`);
  console.log('');
  
  // Create initial release version
  try {
    const version = `v1.0.0-${new Date().toISOString().split('T')[0]}`;
    await prisma.translationRelease.upsert({
      where: { version },
      update: {},
      create: {
        version,
        description: 'Initial import from JSON files',
        isActive: true,
      },
    });
    
    // Deactivate any other active releases
    await prisma.translationRelease.updateMany({
      where: {
        isActive: true,
        version: { not: version },
      },
      data: { isActive: false },
    });
    
    console.log(`✅ Created translation release: ${version}`);
  } catch (error) {
    console.error('⚠️  Error creating release:', error);
  }

  console.log('Import completed!');
}

/**
 * Flatten nested object to dot notation keys
 * Example: { buttons: { submit: "Submit" } } -> { "buttons.submit": "Submit" }
 */
function flattenObject(obj: any, prefix: string = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenObject(value, newKey));
    } else if (value !== null && value !== undefined) {
      // Convert to string (handles numbers, booleans, etc.)
      result[newKey] = String(value);
    }
  }

  return result;
}

// Run import
importTranslations()
  .catch((error) => {
    console.error('Fatal error during import:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

