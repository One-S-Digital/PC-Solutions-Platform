import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('i18n Scanner Basic Tests', () => {
  it('should run the scanner without errors and produce valid output', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report table`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    // Check that the output contains expected sections
    expect(result).toContain('=== i18n scan results ===');
    expect(result).toContain('Hardcoded text:');
    expect(result).toContain('Missing keys:');
    expect(result).toContain('Unused keys:');
  });

  it('should generate a JSON report file', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report table --out test-i18n-report.json`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    // Check that the report file was created
    const fs = require('fs');
    expect(fs.existsSync('/workspace/frontend/test-i18n-report.json')).toBe(true);
    
    // Clean up
    fs.unlinkSync('/workspace/frontend/test-i18n-report.json');
  });

  it('should find unused keys in the current codebase', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report table`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    // The scanner should find unused keys (we saw 1251 in the previous run)
    expect(result).toMatch(/Unused keys:\s+\d+/);
    
    // Extract the number of unused keys
    const unusedMatch = result.match(/Unused keys:\s+(\d+)/);
    expect(unusedMatch).toBeTruthy();
    
    const unusedCount = parseInt(unusedMatch![1]);
    expect(unusedCount).toBeGreaterThan(0);
  });

  it('should not find hardcoded text issues', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report table`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    // Should not find hardcoded text issues
    const hardcodedMatch = result.match(/Hardcoded text:\s+(\d+)/);
    expect(hardcodedMatch).toBeTruthy();
    
    const hardcodedCount = parseInt(hardcodedMatch![1]);
    expect(hardcodedCount).toBe(0);
  });

  it('should not find missing key issues', () => {
    const result = execSync(
      `ts-node /workspace/scan-i18n.ts --src "**/*.{ts,tsx,js,jsx}" --locales "public/locales" --languages "en,fr,de" --defaultNs "translation" --report table`,
      { encoding: 'utf8', cwd: '/workspace/frontend' }
    );

    // Should not find missing key issues
    const missingMatch = result.match(/Missing keys:\s+(\d+)/);
    expect(missingMatch).toBeTruthy();
    
    const missingCount = parseInt(missingMatch![1]);
    expect(missingCount).toBe(0);
  });
});