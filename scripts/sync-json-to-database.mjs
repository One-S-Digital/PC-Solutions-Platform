#!/usr/bin/env node

/**
 * Sync translation JSON files to database
 * Loads all translations from JSON files and imports them into the StaticTranslation table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales');
const prisma = new PrismaClient();

function getAllKeys(obj, prefix = '') {
  const keys = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(keys, getAllKeys(value, fullKey));
    } else {
      keys[fullKey] = value;
    }
  }
  
  return keys;
}

async function syncNamespace(namespace, language) {
  const filePath = path.join(TRANSLATIONS_DIR, language, `${namespace}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return 0;
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keys = getAllKeys(content);

  const translations = Object.entries(keys).map(([key, value]) => ({
    namespace,
    key,
    lang: language,
    value: String(value),
  }));

  // Use bulk upsert
  let imported = 0;
  for (const translation of translations) {
    await prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace: translation.namespace,
          key: translation.key,
          lang: translation.lang,
        },
      },
      update: {
        value: translation.value,
      },
      create: translation,
    });
    imported++;
  }

  return imported;
}

async function main() {
  console.log('🔄 Syncing JSON translation files to database...\n');

  const languages = ['en', 'fr', 'de'];
  
  // Get all namespace files from English directory
  const enDir = path.join(TRANSLATIONS_DIR, 'en');
  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
  const namespaces = files.map(f => f.replace('.json', ''));

  console.log(`Found ${namespaces.length} namespaces: ${namespaces.join(', ')}\n`);

  let totalImported = 0;

  for (const namespace of namespaces) {
    console.log(`📝 Processing namespace: ${namespace}`);
    
    for (const lang of languages) {
      const count = await syncNamespace(namespace, lang);
      totalImported += count;
      console.log(`   ${lang.toUpperCase()}: ${count} translations`);
    }
    console.log('');
  }

  console.log(`✅ Done! Imported ${totalImported} translations total.`);
  console.log('\n💡 You can now run the translation system to translate entries with [FR] or [DE] prefixes.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

