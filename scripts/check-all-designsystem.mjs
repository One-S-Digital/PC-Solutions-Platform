#!/usr/bin/env node

/**
 * Check all admin.designSystem translations (all languages)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking ALL admin.designSystem translations in database...\n');

  // Find all admin.designSystem entries in all languages
  const allEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: {
        startsWith: 'designSystem.',
      },
    },
    orderBy: [
      { key: 'asc' },
      { lang: 'asc' },
    ],
  });

  console.log(`Found ${allEntries.length} total admin.designSystem entries\n`);

  // Group by language
  const byLang = {
    en: allEntries.filter(e => e.lang === 'en'),
    fr: allEntries.filter(e => e.lang === 'fr'),
    de: allEntries.filter(e => e.lang === 'de'),
  };

  console.log(`📊 By Language:`);
  console.log(`   - English (en): ${byLang.en.length}`);
  console.log(`   - French (fr): ${byLang.fr.length}`);
  console.log(`   - German (de): ${byLang.de.length}\n`);

  // Get unique keys
  const uniqueKeys = [...new Set(allEntries.map(e => e.key))];
  console.log(`📋 Unique keys found: ${uniqueKeys.length}\n`);

  if (uniqueKeys.length > 0) {
    console.log(`\n📝 First 20 keys:`);
    uniqueKeys.slice(0, 20).forEach(key => {
      const en = byLang.en.find(e => e.key === key);
      const fr = byLang.fr.find(e => e.key === key);
      const de = byLang.de.find(e => e.key === key);
      console.log(`\n   ${key}:`);
      if (en) console.log(`      EN: "${en.value.substring(0, 50)}"`);
      if (fr) console.log(`      FR: "${fr.value.substring(0, 50)}"`);
      if (de) console.log(`      DE: "${de.value.substring(0, 50)}"`);
      if (!fr) console.log(`      FR: ❌ MISSING`);
      if (!de) console.log(`      DE: ❌ MISSING`);
    });
  }

  // Check if entries exist in JSON files
  console.log(`\n\n💡 If entries are missing from database, they need to be synced from JSON files.`);
  console.log(`   Check if there's a sync/import script to load translations from JSON to database.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

