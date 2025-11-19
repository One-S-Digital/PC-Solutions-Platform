#!/usr/bin/env node

/**
 * Check a specific translation entry
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const key = 'designSystem.buttons.secondaryDisabled';
  
  console.log(`Checking entry: admin.${key}\n`);

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

  console.log('English:', en ? `"${en.value}"` : 'NOT FOUND');
  console.log('French:', fr ? `"${fr.value}"` : 'NOT FOUND');
  console.log('German:', de ? `"${de.value}"` : 'NOT FOUND');

  if (fr) {
    const hasPrefix = /^\[FR\]\s*/i.test(fr.value);
    console.log(`\nFrench has [FR] prefix: ${hasPrefix}`);
    console.log(`French value length: ${fr.value.length}`);
    console.log(`French value char codes: ${Array.from(fr.value.substring(0, 10)).map(c => c.charCodeAt(0)).join(', ')}`);
  }

  if (de) {
    const hasPrefix = /^\[DE\]\s*/i.test(de.value);
    console.log(`\nGerman has [DE] prefix: ${hasPrefix}`);
    console.log(`German value length: ${de.value.length}`);
    console.log(`German value char codes: ${Array.from(de.value.substring(0, 10)).map(c => c.charCodeAt(0)).join(', ')}`);
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

