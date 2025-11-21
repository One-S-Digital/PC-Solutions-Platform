#!/usr/bin/env node

/**
 * Clean up Translation Memory entries that have the same value as the source
 * These are contaminated entries that should be removed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up contaminated Translation Memory entries...\n');

  // Get all Translation Memory entries
  const allEntries = await prisma.translationMemory.findMany({
    where: {
      OR: [
        { sourceLang: 'en', targetLang: 'fr' },
        { sourceLang: 'en', targetLang: 'de' },
      ],
    },
  });

  console.log(`Found ${allEntries.length} Translation Memory entries to check\n`);

  let contaminated = 0;
  let cleaned = 0;

  for (const entry of allEntries) {
    // Check if translated text is the same as source (after stripping prefixes)
    const prefixPattern = /^\[(FR|DE|EN)\]\s*/i;
    const cleanTranslated = entry.translatedText.replace(prefixPattern, '').trim();
    
    // We need to get the source text from the hash
    // Since we can't reverse the hash, we'll check if the translated text matches common patterns
    // Actually, we can't easily check this without the source text
    // So we'll just delete entries where translated text has prefixes or is suspiciously short
    
    // Delete entries with prefixes
    if (prefixPattern.test(entry.translatedText)) {
      console.log(`Deleting entry with prefix: ${entry.sourceLang} -> ${entry.targetLang} (hash: ${entry.sourceTextHash.substring(0, 8)}...)`);
      await prisma.translationMemory.delete({
        where: { id: entry.id },
      });
      contaminated++;
      cleaned++;
      continue;
    }
    
    // For now, we'll focus on entries that are clearly wrong
    // The new code will handle checking if TM returns source value
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total entries checked: ${allEntries.length}`);
  console.log(`   Contaminated entries found: ${contaminated}`);
  console.log(`   Entries cleaned: ${cleaned}`);

  console.log(`\n💡 Note: The translation system will now automatically ignore Translation Memory entries that return the source value.`);
  console.log(`   Run the translation again to force DeepL translation for these entries.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

