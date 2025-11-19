#!/usr/bin/env node

/**
 * Force translate admin.designSystem entries directly
 * This bypasses the normal translation flow to test if DeepL is working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple DeepL service instance (we'll need to initialize it properly)
async function main() {
  console.log('🔍 Force translating admin.designSystem entries...\n');

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

  console.log(`Found ${enEntries.length} English entries\n`);

  // Get French entries with prefixes
  const frEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'fr',
      key: {
        startsWith: 'designSystem.',
      },
    },
  });

  const prefixPatternFR = /^\[FR\]\s*/i;
  const frWithPrefix = frEntries.filter(e => prefixPatternFR.test(e.value));

  console.log(`Found ${frWithPrefix.length} French entries with [FR] prefix\n`);

  if (frWithPrefix.length === 0) {
    console.log('✅ No French entries with prefixes found!');
    return;
  }

  console.log('Checking if entries are being processed by the translation system...\n');
  
  // Check if English entries match French entries
  const enKeys = new Set(enEntries.map(e => e.key));
  const frKeys = new Set(frWithPrefix.map(e => e.key));
  
  const missingEn = Array.from(frKeys).filter(k => !enKeys.has(k));
  const matching = Array.from(frKeys).filter(k => enKeys.has(k));
  
  console.log(`📊 Key matching:`);
  console.log(`   French entries with prefix: ${frWithPrefix.length}`);
  console.log(`   English entries: ${enEntries.length}`);
  console.log(`   Matching keys: ${matching.length}`);
  console.log(`   Missing English keys: ${missingEn.length}`);
  
  if (missingEn.length > 0) {
    console.log(`\n⚠️  French entries without English sources:`);
    missingEn.forEach(k => console.log(`   ${k}`));
  }
  
  if (matching.length === frWithPrefix.length) {
    console.log(`\n✅ All French entries with prefixes have English sources!`);
    console.log(`   They should be processed by the translation system.`);
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

