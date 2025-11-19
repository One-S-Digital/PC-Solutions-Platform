#!/usr/bin/env node

/**
 * Check admin.designSystem translations in database
 * Shows which entries have [FR] prefixes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking admin.designSystem translations in database...\n');

  // Find all admin.designSystem entries in French
  const frEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'fr',
      key: {
        startsWith: 'designSystem.',
      },
    },
    orderBy: {
      key: 'asc',
    },
  });

  console.log(`Found ${frEntries.length} admin.designSystem entries in French\n`);

  // Check which ones have [FR] prefixes
  const prefixPattern = /^\[FR\]\s*/i;
  const entriesWithPrefix = frEntries.filter(e => prefixPattern.test(e.value));
  const entriesWithoutPrefix = frEntries.filter(e => !prefixPattern.test(e.value));

  console.log(`📊 Summary:`);
  console.log(`   - Total entries: ${frEntries.length}`);
  console.log(`   - With [FR] prefix: ${entriesWithPrefix.length}`);
  console.log(`   - Without [FR] prefix: ${entriesWithoutPrefix.length}\n`);

  if (entriesWithPrefix.length > 0) {
    console.log(`\n🔴 Entries WITH [FR] prefix (need translation):`);
    entriesWithPrefix.slice(0, 20).forEach(entry => {
      console.log(`   ${entry.key} = "${entry.value.substring(0, 60)}"`);
    });
    if (entriesWithPrefix.length > 20) {
      console.log(`   ... and ${entriesWithPrefix.length - 20} more`);
    }
  }

  if (entriesWithoutPrefix.length > 0) {
    console.log(`\n✅ Entries WITHOUT [FR] prefix (already translated):`);
    entriesWithoutPrefix.slice(0, 10).forEach(entry => {
      console.log(`   ${entry.key} = "${entry.value.substring(0, 60)}"`);
    });
    if (entriesWithoutPrefix.length > 10) {
      console.log(`   ... and ${entriesWithoutPrefix.length - 10} more`);
    }
  }

  // Also check if English sources exist
  console.log(`\n\n🔍 Checking if English sources exist for these keys...\n`);
  
  const keys = frEntries.map(e => e.key);
  const enEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      lang: 'en',
      key: {
        in: keys,
      },
    },
  });

  const keysWithEnSource = new Set(enEntries.map(e => e.key));
  const keysWithoutEnSource = keys.filter(k => !keysWithEnSource.has(k));

  console.log(`📊 English Source Summary:`);
  console.log(`   - French entries: ${keys.length}`);
  console.log(`   - Have English source: ${keysWithEnSource.size}`);
  console.log(`   - Missing English source: ${keysWithoutEnSource.length}\n`);

  if (keysWithoutEnSource.length > 0) {
    console.log(`⚠️  Keys WITHOUT English sources (cannot be translated):`);
    keysWithoutEnSource.forEach(key => {
      console.log(`   ${key}`);
    });
  }

  // Check entries with prefixes that don't have English sources
  const prefixEntriesWithoutEn = entriesWithPrefix.filter(e => !keysWithEnSource.has(e.key));
  if (prefixEntriesWithoutEn.length > 0) {
    console.log(`\n\n🚨 CRITICAL: Entries with [FR] prefix but NO English source (cannot be auto-translated):`);
    prefixEntriesWithoutEn.forEach(entry => {
      console.log(`   ${entry.key} = "${entry.value}"`);
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

