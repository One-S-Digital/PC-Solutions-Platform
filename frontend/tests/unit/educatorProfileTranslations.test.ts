import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The signup page defaults to French, and step 3 is where an educator either
 * finishes or leaves. Two things went wrong here that no type checker sees:
 *
 *  - the CV hint said "Optional but strongly recommended" under a field that is
 *    marked required and blocks the submit button (in all three languages);
 *  - the save-failed and account-still-being-set-up banners had no translation
 *    at all, so French and German users got English at the one moment something
 *    had gone wrong.
 */

const LOCALES = ['en', 'fr', 'de'] as const;
const LOCALES_DIR = path.resolve(__dirname, '../../../packages/translations/locales');
const STEP = path.resolve(__dirname, '../../components/signup/EducatorProfileStep.tsx');

function educatorProfile(lang: string): Record<string, string> {
  const file = path.join(LOCALES_DIR, lang, 'signup.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).educatorProfile;
}

describe('signup:educatorProfile translations', () => {
  it('has identical keys across locales', () => {
    const reference = Object.keys(educatorProfile('en')).sort();
    for (const lang of LOCALES) {
      expect(Object.keys(educatorProfile(lang)).sort(), `key drift in ${lang}`).toEqual(reference);
    }
  });

  it('has no empty values', () => {
    for (const lang of LOCALES) {
      for (const [key, value] of Object.entries(educatorProfile(lang))) {
        expect(String(value).trim().length, `${lang}.${key} is blank`).toBeGreaterThan(0);
      }
    }
  });

  it('covers every educatorProfile key the step renders', () => {
    const source = fs.readFileSync(STEP, 'utf8');
    const used = new Set(
      [...source.matchAll(/['"]signup:educatorProfile\.([A-Za-z0-9_]+)['"]/g)].map(m => m[1]),
    );
    expect(used.size).toBeGreaterThan(10);

    for (const lang of LOCALES) {
      const present = educatorProfile(lang);
      const missing = [...used].filter(key => !(key in present));
      expect(missing, `${lang} is missing keys the step uses`).toEqual([]);
    }
  });

  it('does not call the CV optional while the form requires it', () => {
    const optional = /optional|optionnel|optionell|empfohlen|recommand/i;
    for (const lang of LOCALES) {
      expect(educatorProfile(lang).cvHint, `${lang}.cvHint`).not.toMatch(optional);
    }
  });

  it('says the CV is required, in each language', () => {
    expect(educatorProfile('en').cvHint).toMatch(/required/i);
    expect(educatorProfile('fr').cvHint).toMatch(/obligatoire/i);
    expect(educatorProfile('de').cvHint).toMatch(/erforderlich/i);
  });

  it('words the CV upload for a finger as well as a mouse', () => {
    for (const lang of LOCALES) {
      const label = educatorProfile(lang).cvSelect;
      expect(label, `${lang}.cvSelect`).toBeTruthy();
      expect(label, `${lang}.cvSelect mentions dragging`).not.toMatch(/drag|glisse|zieh/i);
    }
  });

  it('translates the failure banners rather than falling back to English', () => {
    const en = educatorProfile('en');
    for (const lang of ['fr', 'de'] as const) {
      const strings = educatorProfile(lang);
      for (const key of ['provisioningDelayed', 'saveFailedTitle', 'saveFailedHint']) {
        expect(strings[key], `${lang}.${key} missing`).toBeTruthy();
        expect(strings[key], `${lang}.${key} copied from English`).not.toBe(en[key]);
      }
    }
  });

  it('names the same button the save-failed hint tells the user to press', () => {
    for (const lang of LOCALES) {
      const strings = educatorProfile(lang);
      expect(strings.saveFailedHint, lang).toContain(strings.completeSetup);
    }
  });
});
