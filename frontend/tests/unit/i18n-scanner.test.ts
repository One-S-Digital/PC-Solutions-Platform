import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('i18n Scanner Tests', () => {
  const testDir = path.join(__dirname, 'fixtures');
  const localesDir = path.join(testDir, 'locales');
  const reportPath = path.join(testDir, 'test-report.json');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(localesDir)) {
      fs.mkdirSync(localesDir, { recursive: true });
    }

    // Create test locale files
    const enTranslations = {
      "common": {
        "hello": "Hello",
        "world": "World",
        "unusedKey": "This key is not used in code"
      },
      "buttons": {
        "save": "Save",
        "cancel": "Cancel",
        "missingKey": "This key is missing in other languages"
      }
    };

    const frTranslations = {
      "common": {
        "hello": "Bonjour",
        "world": "Monde"
        // missing "unusedKey"
      },
      "buttons": {
        "save": "Enregistrer",
        "cancel": "Annuler"
        // missing "missingKey"
      }
    };

    const deTranslations = {
      "common": {
        "hello": "Hallo",
        "world": "Welt"
        // missing "unusedKey"
      },
      "buttons": {
        "save": "Speichern",
        "cancel": "Abbrechen"
        // missing "missingKey"
      }
    };

    // Create language directories and files
    ['en', 'fr', 'de'].forEach(lang => {
      const langDir = path.join(localesDir, lang);
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }
    });

    fs.writeFileSync(
      path.join(localesDir, 'en', 'translation.json'),
      JSON.stringify(enTranslations, null, 2)
    );
    fs.writeFileSync(
      path.join(localesDir, 'fr', 'translation.json'),
      JSON.stringify(frTranslations, null, 2)
    );
    fs.writeFileSync(
      path.join(localesDir, 'de', 'translation.json'),
      JSON.stringify(deTranslations, null, 2)
    );
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should detect hardcoded text in JSX', () => {
    const testFile = path.join(testDir, 'hardcoded-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>Hardcoded Title</h1>
      <p>This is hardcoded text</p>
      <button title="Hardcoded tooltip">Click me</button>
      <input placeholder="Hardcoded placeholder" />
      <span>{t('common.hello')}</span>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      expect(report.summary.hardcodedCount).toBeGreaterThan(0);
      expect(report.hardcoded).toHaveLength(4); // h1, p, button title, input placeholder
      
      const hardcodedTexts = report.hardcoded.map((h: any) => h.snippet);
      expect(hardcodedTexts).toContain('Hardcoded Title');
      expect(hardcodedTexts).toContain('This is hardcoded text');
      expect(hardcodedTexts).toContain('Hardcoded tooltip');
      expect(hardcodedTexts).toContain('Hardcoded placeholder');

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should detect missing translation keys', () => {
    const testFile = path.join(testDir, 'missing-keys-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <span>{t('common.hello')}</span>
      <span>{t('buttons.save')}</span>
      <span>{t('buttons.missingKey')}</span>
      <span>{t('nonexistent.key')}</span>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      expect(report.summary.missingKeyCount).toBeGreaterThan(0);
      expect(report.missingKeys.length).toBeGreaterThan(0);
      
      const missingKeys = report.missingKeys.map((m: any) => m.key);
      expect(missingKeys).toContain('translation:buttons.missingKey');
      expect(missingKeys).toContain('translation:nonexistent.key');

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should detect unused translation keys', () => {
    const testFile = path.join(testDir, 'unused-keys-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <span>{t('common.hello')}</span>
      <span>{t('buttons.save')}</span>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json --checkUnused`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      expect(report.summary.unusedKeyCount).toBeGreaterThan(0);
      expect(report.unusedKeys.length).toBeGreaterThan(0);
      
      const unusedKeys = report.unusedKeys.map((u: any) => u.key);
      expect(unusedKeys).toContain('translation:common.unusedKey');

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should ignore i18n-ignore comments', () => {
    const testFile = path.join(testDir, 'ignore-comments-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>This should be flagged</h1>
      {/* i18n-ignore */}
      <p>This should be ignored</p>
      <span>{t('common.hello')}</span>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      expect(report.summary.hardcodedCount).toBe(1);
      expect(report.hardcoded[0].snippet).toContain('This should be flagged');

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should handle Trans components correctly', () => {
    const testFile = path.join(testDir, 'trans-component-test.tsx');
    const testCode = `
import React from 'react';
import { Trans } from 'react-i18next';

const TestComponent = () => {
  return (
    <div>
      <Trans i18nKey="common.hello">Hello</Trans>
      <Trans i18nKey="buttons.save">Save</Trans>
      <h1>This should be flagged</h1>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      // Should only flag the h1, not the Trans components
      expect(report.summary.hardcodedCount).toBe(1);
      expect(report.hardcoded[0].snippet).toContain('This should be flagged');

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should generate comprehensive report', () => {
    const testFile = path.join(testDir, 'comprehensive-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>Hardcoded Title</h1>
      <p>Hardcoded paragraph</p>
      <button title="Hardcoded tooltip">Click me</button>
      <span>{t('common.hello')}</span>
      <span>{t('buttons.save')}</span>
      <span>{t('nonexistent.key')}</span>
      <Trans i18nKey="common.world">World</Trans>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json --out "${reportPath}"`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      // Verify report structure
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('hardcoded');
      expect(report).toHaveProperty('missingKeys');
      expect(report).toHaveProperty('unusedKeys');
      
      expect(report.summary).toHaveProperty('hardcodedCount');
      expect(report.summary).toHaveProperty('missingKeyCount');
      expect(report.summary).toHaveProperty('unusedKeyCount');
      expect(report.summary).toHaveProperty('langs');
      expect(report.summary).toHaveProperty('defaultNs');
      expect(report.summary).toHaveProperty('namespaces');
      expect(report.summary).toHaveProperty('localesRoot');

      // Verify file was created
      expect(fs.existsSync(reportPath)).toBe(true);

    } finally {
      fs.unlinkSync(testFile);
    }
  });

  it('should handle different namespace formats', () => {
    const testFile = path.join(testDir, 'namespace-test.tsx');
    const testCode = `
import React from 'react';
import { useTranslation } from 'react-i18next';

const TestComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <span>{t('common.hello')}</span>
      <span>{t('translation:buttons.save')}</span>
      <span>{t('buttons.cancel', { ns: 'translation' })}</span>
    </div>
  );
};

export default TestComponent;
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execSync(
        `ts-node ../../scan-i18n.ts --src "${testFile}" --locales "${localesDir}" --languages "en,fr,de" --defaultNs "translation" --report json`,
        { encoding: 'utf8', cwd: __dirname }
      );

      const report = JSON.parse(result);
      
      // Should not have any missing keys since all are properly defined
      expect(report.summary.missingKeyCount).toBe(0);

    } finally {
      fs.unlinkSync(testFile);
    }
  });
});