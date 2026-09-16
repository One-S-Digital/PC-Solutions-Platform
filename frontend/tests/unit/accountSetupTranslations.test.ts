import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The account-provisioning gate is the screen a user hits when their session
 * cannot see their account. It is shown mid-signup, at the worst possible
 * moment, and the platform defaults to French — so an untranslated key here is
 * not a cosmetic bug, it is a raw `accountSetup.tryAgain` on screen in front of
 * someone already confused about whether their account exists.
 *
 * These tests fail the build if the three locales drift apart.
 */

const LOCALES = ['en', 'fr', 'de'] as const;
const LOCALES_DIR = path.resolve(__dirname, '../../../packages/translations/locales');
const GATE = path.resolve(__dirname, '../../components/auth/AccountProvisioningGate.tsx');

function accountSetup(lang: string): Record<string, string> {
  const file = path.join(LOCALES_DIR, lang, 'common.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return parsed.accountSetup;
}

describe('accountSetup translations', () => {
  it('exists in every supported locale', () => {
    for (const lang of LOCALES) {
      expect(accountSetup(lang), `missing accountSetup in ${lang}`).toBeTypeOf('object');
    }
  });

  it('has identical keys across locales', () => {
    const reference = Object.keys(accountSetup('en')).sort();
    for (const lang of LOCALES) {
      expect(Object.keys(accountSetup(lang)).sort(), `key drift in ${lang}`).toEqual(reference);
    }
  });

  it('has no empty values', () => {
    for (const lang of LOCALES) {
      for (const [key, value] of Object.entries(accountSetup(lang))) {
        expect(value, `${lang}.${key} is empty`).toBeTruthy();
        expect(String(value).trim().length, `${lang}.${key} is blank`).toBeGreaterThan(0);
      }
    }
  });

  it('is actually translated, not copied from English', () => {
    // The repo already carries auto-generated stubs like "try Again" identical
    // in all three locales. This block must not become more of them.
    const en = accountSetup('en');
    for (const lang of LOCALES.filter(l => l !== 'en')) {
      const copied = Object.entries(accountSetup(lang))
        .filter(([key, value]) => value === en[key])
        .map(([key]) => key);
      expect(copied, `${lang} values identical to English`).toEqual([]);
    }
  });

  it('covers every key the gate renders', () => {
    const source = fs.readFileSync(GATE, 'utf8');
    const used = new Set(
      [...source.matchAll(/t\('accountSetup\.([a-zA-Z]+)'/g)].map(m => m[1]),
    );

    expect(used.size, 'gate appears to render no translated strings').toBeGreaterThan(0);
    const available = new Set(Object.keys(accountSetup('en')));
    for (const key of used) {
      expect(available.has(key), `gate uses accountSetup.${key}, which is not defined`).toBe(true);
    }
  });

  it('leaves no hardcoded English in the gate', () => {
    const source = fs.readFileSync(GATE, 'utf8');
    // The strings this screen used to hardcode. A regression here means a
    // French or German user sees English at the point they are most likely to
    // abandon the signup.
    const previouslyHardcoded = [
      'Welcome, ',
      'Signed in as',
      'Try again',
      'Having trouble',
      'Sign out and use a different account',
      "We couldn't load your account",
      "You've signed in successfully",
    ];
    for (const phrase of previouslyHardcoded) {
      expect(source.includes(phrase), `hardcoded string in gate: "${phrase}"`).toBe(false);
    }
  });

  it('keeps the name placeholder the gate interpolates', () => {
    for (const lang of LOCALES) {
      expect(accountSetup(lang).welcome, `${lang}.welcome lost {{name}}`).toContain('{{name}}');
    }
  });
});
