import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { signupProgressPercent } from '../../utils/signupProgress';

/**
 * Educators have one more form than anyone else, and the bar used to be drawn on
 * the shorter scale for them: 100% on step 3, which is where the long profile
 * form (nine required fields, a CV) starts. The log showed two of five educators
 * leaving that screen within 50 seconds.
 */
describe('signupProgressPercent', () => {
  it('never shows an educator as finished while the profile form is still ahead of them', () => {
    expect(signupProgressPercent(1, true)).toBe(25);
    expect(signupProgressPercent(2, true)).toBe(50);
    expect(signupProgressPercent(3, true)).toBe(75);
    expect(signupProgressPercent(3, true)).toBeLessThan(100);
  });

  it('reaches 100% only on the success screen', () => {
    expect(signupProgressPercent(4, true)).toBe(100);
  });

  it('is unchanged for every other role', () => {
    expect(signupProgressPercent(1, false)).toBe(33);
    expect(signupProgressPercent(2, false)).toBe(66);
  });

  it('is never ahead of the user, so two of three is 66 and not 67', () => {
    expect(signupProgressPercent(2, false)).toBe(66);
  });

  it('only ever moves forward', () => {
    for (const isEducator of [true, false]) {
      const steps = ([1, 2, 3, 4] as const).map(s => signupProgressPercent(s, isEducator));
      expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    }
  });

  it('stays within 0-100 whatever it is given', () => {
    expect(signupProgressPercent(4, false)).toBe(100);
    expect(signupProgressPercent(0 as any, true)).toBeGreaterThan(0);
    expect(signupProgressPercent(9 as any, true)).toBe(100);
  });
});

describe('educator progress label', () => {
  const read = (lang: string) =>
    JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../packages/translations/locales/${lang}/signup.json`), 'utf8'))
      .progress as Record<string, string>;

  it('says "of 3" in every language, so "2 of 2" is never followed by a step 3', () => {
    for (const lang of ['en', 'fr', 'de']) {
      const progress = read(lang);
      expect(progress.step2Educator, lang).toMatch(/3/);
      expect(progress.step2Educator, lang).not.toBe(progress.step2);
      expect(progress.step2, lang).toMatch(/2.*2/);
    }
  });
});
