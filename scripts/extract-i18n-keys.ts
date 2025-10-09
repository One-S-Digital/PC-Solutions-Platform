#!/usr/bin/env ts-node
/**
 * Extract all i18n translation keys used in the codebase
 * This helps identify which keys are actually being used
 * 
 * Usage: ts-node scripts/extract-i18n-keys.ts
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const OUTPUT_FILE = path.join(__dirname, '../i18n-used-keys.json');

interface UsedKey {
  key: string;
  file: string;
  line: number;
  context: string;
}

interface UsedKeysReport {
  timestamp: string;
  totalKeys: number;
  byNamespace: Record<string, number>;
  keys: UsedKey[];
}

/**
 * Extract translation keys from code
 */
async function extractKeys(): Promise<void> {
  console.log('🔍 Extracting i18n keys from codebase...\n');

  // Find all TypeScript/TSX files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: FRONTEND_DIR,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
  });

  console.log(`📂 Scanning ${files.length} files...\n`);

  const usedKeys: UsedKey[] = [];
  const keySet = new Set<string>();

  // Regex patterns to find t() calls
  const patterns = [
    // t('key') or t("key")
    /\bt\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g,
    // t('namespace:key')
    /\bt\(\s*['"`]([a-zA-Z0-9_-]+:[^'"`]+)['"`]\s*[,)]/g,
  ];

  for (const file of files) {
    const filePath = path.join(FRONTEND_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const key = match[1];
          
          // Skip if it's a variable or template literal
          if (key.includes('${') || key.includes('`')) {
            continue;
          }

          keySet.add(key);
          usedKeys.push({
            key,
            file: file,
            line: lineIndex + 1,
            context: line.trim(),
          });
        }
      }
    });
  }

  // Generate report
  const byNamespace: Record<string, number> = {};
  
  usedKeys.forEach(({ key }) => {
    const namespace = key.includes(':') ? key.split(':')[0] : 'common';
    byNamespace[namespace] = (byNamespace[namespace] || 0) + 1;
  });

  const report: UsedKeysReport = {
    timestamp: new Date().toISOString(),
    totalKeys: keySet.size,
    byNamespace,
    keys: usedKeys,
  };

  // Save report
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf8');

  // Print summary
  console.log('📊 Extraction Summary:');
  console.log(`   Total unique keys: ${keySet.size}`);
  console.log(`   Total occurrences: ${usedKeys.length}`);
  console.log('\n📈 Keys by namespace:');
  
  Object.entries(byNamespace)
    .sort(([, a], [, b]) => b - a)
    .forEach(([ns, count]) => {
      console.log(`   ${ns.padEnd(20)} ${count}`);
    });

  console.log(`\n✅ Report saved to: ${OUTPUT_FILE}`);
}

// Run extraction
extractKeys().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
