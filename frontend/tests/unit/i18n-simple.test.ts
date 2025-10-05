import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('i18n Scanner Simple Tests', () => {
  it('should run the scanner without errors', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report json`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    const report = JSON.parse(result);
    
    expect(report).toHaveProperty('summary');
    expect(report.summary).toHaveProperty('hardcodedCount');
    expect(report.summary).toHaveProperty('missingKeyCount');
    expect(report.summary).toHaveProperty('unusedKeyCount');
    expect(report.summary).toHaveProperty('langs');
    expect(report.summary).toHaveProperty('defaultNs');
    expect(report.summary).toHaveProperty('namespaces');
    expect(report.summary).toHaveProperty('localesRoot');
    
    expect(report).toHaveProperty('hardcoded');
    expect(report).toHaveProperty('missingKeys');
    expect(report).toHaveProperty('unusedKeys');
    
    expect(Array.isArray(report.hardcoded)).toBe(true);
    expect(Array.isArray(report.missingKeys)).toBe(true);
    expect(Array.isArray(report.unusedKeys)).toBe(true);
  });

  it('should detect unused keys in the current codebase', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report json`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    const report = JSON.parse(result);
    
    // We expect to find unused keys since the scanner found 1251 unused keys
    expect(report.summary.unusedKeyCount).toBeGreaterThan(0);
    expect(report.unusedKeys.length).toBeGreaterThan(0);
  });

  it('should not find hardcoded text in the current codebase', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report json`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    const report = JSON.parse(result);
    
    // The current codebase should not have hardcoded text issues
    expect(report.summary.hardcodedCount).toBe(0);
    expect(report.hardcoded.length).toBe(0);
  });

  it('should not find missing keys in the current codebase', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report json`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    const report = JSON.parse(result);
    
    // The current codebase should not have missing key issues
    expect(report.summary.missingKeyCount).toBe(0);
    expect(report.missingKeys.length).toBe(0);
  });
});