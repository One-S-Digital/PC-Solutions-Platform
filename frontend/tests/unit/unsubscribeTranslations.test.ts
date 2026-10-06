import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * This page is reached from an email, by someone who may not read English, and
 * who has already decided they want out. A raw `unsubscribe.confirmButton` on a
 * button is the worst possible way to meet them.
 */

const LOCALES = ['en', 'fr', 'de'] as const;
const LOCALES_DIR = path.resolve(__dirname, '../../../packages/translations/locales');
const PAGE = path.resolve(__dirname, '../../pages/UnsubscribePage.tsx');

function unsubscribe(lang: string): Record<string, string> {
  const file = path.join(LOCALES_DIR, lang, 'common.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).unsubscribe;
}

describe('common:unsubscribe translations', () => {
  it('exists in every locale with identical keys', () => {
    const reference = Object.keys(unsubscribe('en')).sort();
    expect(reference.length).toBeGreaterThan(10);
    for (const lang of LOCALES) {
      expect(Object.keys(unsubscribe(lang)).sort(), `key drift in ${lang}`).toEqual(reference);
    }
  });

  it('covers every key the page renders', () => {
    const source = fs.readFileSync(PAGE, 'utf8');
    const used = new Set([...source.matchAll(/common:unsubscribe\.([A-Za-z0-9_]+)/g)].map(m => m[1]));
    expect(used.size).toBeGreaterThan(10);
    for (const lang of LOCALES) {
      const missing = [...used].filter(key => !(key in unsubscribe(lang)));
      expect(missing, `${lang} is missing keys the page uses`).toEqual([]);
    }
  });

  it('is translated, not copied from English', () => {
    const en = unsubscribe('en');
    for (const lang of ['fr', 'de'] as const) {
      const copied = Object.entries(unsubscribe(lang))
        .filter(([key, value]) => value === en[key])
        .map(([key]) => key);
      expect(copied, `${lang} values identical to English`).toEqual([]);
    }
  });

  it('keeps the {{email}} placeholder wherever English has it', () => {
    for (const lang of LOCALES) {
      expect(unsubscribe(lang).confirmWithEmail, lang).toContain('{{email}}');
      expect(unsubscribe(lang).confirmNoEmail, lang).not.toContain('{{email}}');
    }
  });
});
