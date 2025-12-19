#!/usr/bin/env node

/**
 * Import static translations from packages/translations/locales/{lang}/{namespace}.json
 * into the staticTranslation table using Prisma.
 *
 * This flattens nested JSON keys with dot notation to match i18next usage.
 *
 * Usage: node scripts/import-static-from-files.mjs
 *
 * Prereqs:
 * - DATABASE_URL is configured (same as the API)
 * - @prisma/client is installed (generated for the API schema)
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LOCALES_DIR = path.join(process.cwd(), 'packages', 'translations', 'locales');
const LANGS = ['en', 'fr', 'de'];

function listNamespaces(langDir) {
  if (!fs.existsSync(langDir)) return [];
  return fs
    .readdirSync(langDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

function flatten(obj, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flatten(value, fullKey));
    } else {
      entries.push([fullKey, value ?? '']);
    }
  }
  return entries;
}

async function importFile(lang, namespace) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Missing file for ${lang}/${namespace}: ${filePath}`);
    return { imported: 0 };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  const flattened = flatten(json);

  let imported = 0;
  for (const [key, value] of flattened) {
    await prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
      update: { value: String(value) },
      create: {
        namespace,
        key,
        lang,
        value: String(value),
      },
    });
    imported++;
  }
  return { imported };
}

async function main() {
  console.log('🚀 Importing static translations into DB');
  let total = 0;
  for (const lang of LANGS) {
    const nsList = listNamespaces(path.join(LOCALES_DIR, lang));
    if (nsList.length === 0) {
      console.warn(`⚠️  No namespaces found for ${lang}`);
    }
    for (const ns of nsList) {
      const { imported } = await importFile(lang, ns);
      console.log(`  ✅ ${lang}/${ns}: ${imported} rows`);
      total += imported;
    }
  }
  console.log(`🎯 Done. Total upserts: ${total}`);
}

main()
  .catch((err) => {
    console.error('❌ Import failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

