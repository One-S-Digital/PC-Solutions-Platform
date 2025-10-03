import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

console.log('🔍 Checking for raw imports in frontend...');

const files = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n').filter(f => f && f.startsWith('frontend/src/'));

const bad = [];
for (const f of files) {
  try {
    const c = readFileSync(f, 'utf8');
    if (c.includes('_import_raw') || c.includes('PC-solutions-Design')) bad.push(f);
  } catch (error) {
    console.warn(`⚠️  Could not read file ${f}: ${error.message}`);
  }
}

if (bad.length) {
  console.error('❌ Blocked: imports from mock raw folder detected:');
  bad.forEach(f => console.error(`   ${f}`));
  console.error('\nPlease remove any imports from _import_raw or PC-solutions-Design folders.');
  process.exit(1);
}

console.log('✅ No raw imports detected');
