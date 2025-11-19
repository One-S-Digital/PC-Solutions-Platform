#!/usr/bin/env node

/**
 * Check the actual translated values in the database
 * to see if they're actually translated or just copies of English
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking actual translation values for admin.designSystem entries...\n');

  // Get a few example entries
  const examples = [
    'designSystem.buttons.secondaryDisabled',
    'designSystem.buttons.small',
    'designSystem.buttons.smallIcon',
    'designSystem.cards.hoverEffectCard',
    'designSystem.description',
  ];

  for (const key of examples) {
    const en = await prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace: 'admin',
          key: key,
          lang: 'en',
        },
      },
    });

    const fr = await prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace: 'admin',
          key: key,
          lang: 'fr',
        },
      },
    });

    const de = await prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace: 'admin',
          key: key,
          lang: 'de',
        },
      },
    });

    console.log(`\n📝 ${key}:`);
    console.log(`   EN: "${en?.value || 'NOT FOUND'}"`);
    console.log(`   FR: "${fr?.value || 'NOT FOUND'}" ${fr?.value === en?.value ? '⚠️ SAME AS ENGLISH' : '✅ DIFFERENT'}`);
    console.log(`   DE: "${de?.value || 'NOT FOUND'}" ${de?.value === en?.value ? '⚠️ SAME AS ENGLISH' : '✅ DIFFERENT'}`);
    
    if (fr && fr.value === en?.value) {
      console.log(`   ⚠️  French translation is identical to English - this might be why UI shows same value`);
    }
    if (de && de.value === en?.value) {
      console.log(`   ⚠️  German translation is identical to English - this might be why UI shows same value`);
    }
  }

  // Check how many are identical to English
  const allEn = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: { startsWith: 'designSystem.' },
      lang: 'en',
    },
  });

  const allFr = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: { startsWith: 'designSystem.' },
      lang: 'fr',
    },
  });

  const allDe = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: { startsWith: 'designSystem.' },
      lang: 'de',
    },
  });

  const enMap = new Map(allEn.map(e => [e.key, e.value]));
  
  const frSameAsEn = allFr.filter(fr => {
    const enValue = enMap.get(fr.key);
    return enValue && fr.value === enValue;
  });

  const deSameAsEn = allDe.filter(de => {
    const enValue = enMap.get(de.key);
    return enValue && de.value === enValue;
  });

  console.log(`\n\n📊 Summary:`);
  console.log(`   Total entries: ${allEn.length}`);
  console.log(`   French entries identical to English: ${frSameAsEn.length}`);
  console.log(`   German entries identical to English: ${deSameAsEn.length}`);

  if (frSameAsEn.length > 0) {
    console.log(`\n⚠️  French entries that are identical to English (first 10):`);
    frSameAsEn.slice(0, 10).forEach(e => {
      console.log(`   ${e.key}: "${e.value}"`);
    });
  }

  if (deSameAsEn.length > 0) {
    console.log(`\n⚠️  German entries that are identical to English (first 10):`);
    deSameAsEn.slice(0, 10).forEach(e => {
      console.log(`   ${e.key}: "${e.value}"`);
    });
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

