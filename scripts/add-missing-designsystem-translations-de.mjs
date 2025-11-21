#!/usr/bin/env node

/**
 * Add missing admin.designSystem German translations with [DE] prefixes
 * This will allow the translation system to translate them
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding missing admin.designSystem German translations...\n');

  // Get all English designSystem entries
  const enEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'en',
      key: {
        startsWith: 'designSystem.',
      },
    },
  });

  console.log(`Found ${enEntries.length} English designSystem entries\n`);

  // Get all existing German entries
  const deEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'de',
      key: {
        startsWith: 'designSystem.',
      },
    },
  });

  const existingDeKeys = new Set(deEntries.map(e => e.key));
  console.log(`Found ${deEntries.length} existing German entries\n`);

  // Find missing entries
  const missingEntries = enEntries.filter(e => !existingDeKeys.has(e.key));

  console.log(`📊 Missing ${missingEntries.length} German translations\n`);

  if (missingEntries.length === 0) {
    console.log('✅ All translations exist!');
    return;
  }

  // Add missing entries with [DE] prefix
  console.log('➕ Adding missing entries with [DE] prefix...\n');

  let added = 0;
  for (const enEntry of missingEntries) {
    const deValue = `[DE] ${enEntry.value}`;
    
    await prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace: 'admin',
          key: enEntry.key,
          lang: 'de',
        },
      },
      update: {
        value: deValue,
      },
      create: {
        namespace: 'admin',
        key: enEntry.key,
        lang: 'de',
        value: deValue,
      },
    });

    console.log(`   ✅ ${enEntry.key} = "${deValue.substring(0, 50)}"`);
    added++;
  }

  console.log(`\n✅ Added ${added} missing German translations with [DE] prefixes!`);
  console.log('\n💡 Now you can run the translation system to translate these entries.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

