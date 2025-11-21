#!/usr/bin/env node

/**
 * Check translation status for admin.designSystem entries
 * Shows which entries still have prefixes and need translation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking translation status for admin.designSystem entries...\n');

  // Get all admin.designSystem entries
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

  const enEntries = allEntries.filter(e => e.lang === 'en');
  const frEntries = allEntries.filter(e => e.lang === 'fr');
  const deEntries = allEntries.filter(e => e.lang === 'de');

  const prefixPatternFR = /^\[FR\]\s*/i;
  const prefixPatternDE = /^\[DE\]\s*/i;

  const frWithPrefix = frEntries.filter(e => prefixPatternFR.test(e.value));
  const deWithPrefix = deEntries.filter(e => prefixPatternDE.test(e.value));

  console.log(`📊 Summary:`);
  console.log(`   English (en): ${enEntries.length} entries`);
  console.log(`   French (fr): ${frEntries.length} entries`);
  console.log(`     - ✅ Translated: ${frEntries.length - frWithPrefix.length}`);
  console.log(`     - 🔴 Still have [FR] prefix: ${frWithPrefix.length}`);
  console.log(`   German (de): ${deEntries.length} entries`);
  console.log(`     - ✅ Translated: ${deEntries.length - deWithPrefix.length}`);
  console.log(`     - 🔴 Still have [DE] prefix: ${deWithPrefix.length}\n`);

  if (frWithPrefix.length > 0) {
    console.log(`\n🔴 French entries STILL needing translation (${frWithPrefix.length}):`);
    frWithPrefix.forEach(entry => {
      const enEntry = enEntries.find(e => e.key === entry.key);
      console.log(`   ${entry.key}`);
      console.log(`      EN: "${enEntry?.value || 'NOT FOUND'}"`);
      console.log(`      FR: "${entry.value}"`);
      console.log('');
    });
  }

  if (deWithPrefix.length > 0) {
    console.log(`\n🔴 German entries STILL needing translation (${deWithPrefix.length}):`);
    deWithPrefix.forEach(entry => {
      const enEntry = enEntries.find(e => e.key === entry.key);
      console.log(`   ${entry.key}`);
      console.log(`      EN: "${enEntry?.value || 'NOT FOUND'}"`);
      console.log(`      DE: "${entry.value}"`);
      console.log('');
    });
  }

  if (frWithPrefix.length === 0 && deWithPrefix.length === 0) {
    console.log(`\n✅ All admin.designSystem entries are translated!`);
  } else {
    console.log(`\n💡 These entries still have prefixes and need to be translated.`);
    console.log(`   The translation system should pick them up when you click "Translate EN→FR" or "Translate EN→DE".`);
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

