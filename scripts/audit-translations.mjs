#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect all unique keys from all translation files
function collectKeys(dirPath, language = 'en') {
  const keys = new Set();
  
  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, fullKey);
      } else {
        keys.add(fullKey);
      }
    }
  }
  
  // Scan all namespaces
  const langDir = path.join(dirPath, language);
  if (!fs.existsSync(langDir)) {
    return {};
  }

  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
  const keysByNamespace = {};
  
  files.forEach(file => {
    const namespace = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8'));
    const nsKeys = new Set();
    
    traverse(content);
    keys.forEach(k => nsKeys.add(k));
    keysByNamespace[namespace] = Array.from(nsKeys);
    keys.clear();
  });
  
  return keysByNamespace;
}

console.log('🔍 Translation Key Audit\n');

// Canonical translation source for this repo is packages/translations/locales
const packagesLocalesDir = path.join(__dirname, '../packages/translations/locales');
const packagesKeys = collectKeys(packagesLocalesDir);
console.log('📁 PACKAGES (source of truth):');
Object.entries(packagesKeys).forEach(([ns, keys]) => {
  console.log(`  ${ns}: ${keys.length} keys`);
});
console.log(`  Total: ${Object.values(packagesKeys).flat().length} keys\n`);

// Save audit report
const report = {
  timestamp: new Date().toISOString(),
  packages: packagesKeys,
  summary: {
    packagesTotal: Object.values(packagesKeys).flat().length
  }
};

fs.writeFileSync(
  path.join(__dirname, '../translation-audit.json'),
  JSON.stringify(report, null, 2)
);

console.log('✅ Audit complete! Report saved to translation-audit.json');
