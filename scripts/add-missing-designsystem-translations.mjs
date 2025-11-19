#!/usr/bin/env node

/**
 * Add missing admin.designSystem French translations with [FR] prefixes
 * This will allow the translation system to translate them
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding missing admin.designSystem French translations...\n');

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

  // Get all existing French entries
  const frEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'fr',
      key: {
        startsWith: 'designSystem.',
      },
    },
  });

  const existingFrKeys = new Set(frEntries.map(e => e.key));
  console.log(`Found ${frEntries.length} existing French entries\n`);

  // Find missing entries
  const missingEntries = enEntries.filter(e => !existingFrKeys.has(e.key));

  console.log(`📊 Missing ${missingEntries.length} French translations\n`);

  if (missingEntries.length === 0) {
    console.log('✅ All translations exist!');
    return;
  }

  // Add missing entries with [FR] prefix
  console.log('➕ Adding missing entries with [FR] prefix...\n');

  let added = 0;
  for (const enEntry of missingEntries) {
    const frValue = `[FR] ${enEntry.value}`;
    
    await prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace: 'admin',
          key: enEntry.key,
          lang: 'fr',
        },
      },
      update: {
        value: frValue,
      },
      create: {
        namespace: 'admin',
        key: enEntry.key,
        lang: 'fr',
        value: frValue,
      },
    });

    console.log(`   ✅ ${enEntry.key} = "${frValue.substring(0, 50)}"`);
    added++;
  }

  console.log(`\n✅ Added ${added} missing French translations with [FR] prefixes!`);
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

