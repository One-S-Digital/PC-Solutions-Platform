#!/usr/bin/env node

/**
 * Check the last translation run by querying the database
 * Shows which admin.designSystem entries were recently updated
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking recent translation activity for admin.designSystem entries...\n');

  // Get all admin.designSystem entries
  const allEntries = await prisma.staticTranslation.findMany({
    where: {
      namespace: 'admin',
      key: {
        startsWith: 'designSystem.',
      },
    },
    orderBy: [
      { updatedAt: 'desc' },
    ],
  });

  const frEntries = allEntries.filter(e => e.lang === 'fr');
  const deEntries = allEntries.filter(e => e.lang === 'de');

  const prefixPatternFR = /^\[FR\]\s*/i;
  const prefixPatternDE = /^\[DE\]\s*/i;

  const frWithPrefix = frEntries.filter(e => prefixPatternFR.test(e.value));
  const deWithPrefix = deEntries.filter(e => prefixPatternDE.test(e.value));

  // Check when entries were last updated
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const frRecentlyUpdated = frEntries.filter(e => e.updatedAt > fiveMinutesAgo);
  const deRecentlyUpdated = deEntries.filter(e => e.updatedAt > fiveMinutesAgo);

  console.log(`📊 Summary:`);
  console.log(`   French entries with [FR] prefix: ${frWithPrefix.length}`);
  console.log(`   German entries with [DE] prefix: ${deWithPrefix.length}`);
  console.log(`   French entries updated in last 5 minutes: ${frRecentlyUpdated.length}`);
  console.log(`   German entries updated in last 5 minutes: ${deRecentlyUpdated.length}\n`);

  if (frRecentlyUpdated.length > 0) {
    console.log(`\n✅ Recently updated French entries (last 5 minutes):`);
    frRecentlyUpdated.slice(0, 10).forEach(entry => {
      const hasPrefix = prefixPatternFR.test(entry.value);
      console.log(`   ${entry.key}: "${entry.value.substring(0, 50)}" ${hasPrefix ? '🔴 STILL HAS PREFIX' : '✅ TRANSLATED'}`);
      console.log(`      Updated: ${entry.updatedAt.toISOString()}`);
    });
  }

  if (deRecentlyUpdated.length > 0) {
    console.log(`\n✅ Recently updated German entries (last 5 minutes):`);
    deRecentlyUpdated.slice(0, 10).forEach(entry => {
      const hasPrefix = prefixPatternDE.test(entry.value);
      console.log(`   ${entry.key}: "${entry.value.substring(0, 50)}" ${hasPrefix ? '🔴 STILL HAS PREFIX' : '✅ TRANSLATED'}`);
      console.log(`      Updated: ${entry.updatedAt.toISOString()}`);
    });
  }

  if (frRecentlyUpdated.length === 0 && deRecentlyUpdated.length === 0) {
    console.log(`\n⚠️  No admin.designSystem entries were updated in the last 5 minutes.`);
    console.log(`   This suggests the translation system did not process them.`);
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

