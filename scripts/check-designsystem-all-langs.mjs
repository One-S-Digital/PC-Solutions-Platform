#!/usr/bin/env node

/**
 * Check admin.designSystem translations in all languages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking admin.designSystem translations in all languages...\n');

  // Find all admin.designSystem entries
  const allEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: {
        startsWith: 'designSystem.',
      },
    },
  });

  const frEntries = allEntries.filter(e => e.lang === 'fr');
  const deEntries = allEntries.filter(e => e.lang === 'de');
  const enEntries = allEntries.filter(e => e.lang === 'en');

  const prefixPatternFR = /^\[FR\]\s*/i;
  const prefixPatternDE = /^\[DE\]\s*/i;

  const frWithPrefix = frEntries.filter(e => prefixPatternFR.test(e.value));
  const deWithPrefix = deEntries.filter(e => prefixPatternDE.test(e.value));

  console.log(`📊 Summary:`);
  console.log(`   English (en): ${enEntries.length} entries`);
  console.log(`   French (fr): ${frEntries.length} entries (${frWithPrefix.length} with [FR] prefix, ${frEntries.length - frWithPrefix.length} translated)`);
  console.log(`   German (de): ${deEntries.length} entries (${deWithPrefix.length} with [DE] prefix, ${deEntries.length - deWithPrefix.length} translated)\n`);

  if (frWithPrefix.length > 0) {
    console.log(`\n🔴 French entries WITH [FR] prefix (need translation): ${frWithPrefix.length}`);
    console.log(`   Examples: ${frWithPrefix.slice(0, 3).map(e => e.key).join(', ')}`);
  }

  if (deWithPrefix.length > 0) {
    console.log(`\n🔴 German entries WITH [DE] prefix (need translation): ${deWithPrefix.length}`);
    console.log(`   Examples: ${deWithPrefix.slice(0, 3).map(e => e.key).join(', ')}`);
  }

  if (frWithPrefix.length === 0 && deWithPrefix.length === 0) {
    console.log(`\n✅ All entries are translated! No prefixes found.`);
  } else {
    console.log(`\n💡 Run the translation system to translate these entries:`);
    if (frWithPrefix.length > 0) {
      console.log(`   - Click "Translate EN→FR" to translate ${frWithPrefix.length} French entries`);
    }
    if (deWithPrefix.length > 0) {
      console.log(`   - Click "Translate EN→DE" to translate ${deWithPrefix.length} German entries`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

