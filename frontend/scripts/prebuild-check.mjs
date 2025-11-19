#!/usr/bin/env node

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const log = (message) => console.log(`✅ ${message}`);
const warn = (message) => console.warn(`⚠️  ${message}`);
const error = (message) => console.error(`❌ ${message}`);

log('Running frontend prebuild checks...');

// Check critical files exist
const criticalFiles = [
  'components/ui/ChipInput.tsx',
  'components/settings/sections/CompanyProfileSettings.tsx',
  'components/service-provider/ServiceUploadModal.tsx',
  'constants.ts',
  'types.ts',
];

let allFilesExist = true;

for (const file of criticalFiles) {
  const filePath = join(PROJECT_ROOT, file);
  if (existsSync(filePath)) {
    log(`Found: ${file}`);
  } else {
    error(`Missing: ${file}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  error('Critical files are missing!');
  process.exit(1);
}

// Check for node_modules
const nodeModulesPath = join(PROJECT_ROOT, 'node_modules');
if (!existsSync(nodeModulesPath)) {
  warn('node_modules not found - dependencies may need to be installed');
}

// Verify constants exports
try {
  const constantsPath = join(PROJECT_ROOT, 'constants.ts');
  const { readFileSync } = await import('fs');
  const constantsContent = readFileSync(constantsPath, 'utf8');
  
  if (constantsContent.includes('SUGGESTED_SERVICE_CATEGORIES')) {
    log('Found SUGGESTED_SERVICE_CATEGORIES in constants.ts');
  } else {
    warn('SUGGESTED_SERVICE_CATEGORIES not found in constants.ts');
  }
  
  if (constantsContent.includes('SUGGESTED_PRODUCT_CATEGORIES')) {
    log('Found SUGGESTED_PRODUCT_CATEGORIES in constants.ts');
  } else {
    warn('SUGGESTED_PRODUCT_CATEGORIES not found in constants.ts');
  }
} catch (err) {
  warn(`Could not verify constants: ${err.message}`);
}

log('Frontend prebuild checks complete!');
log('Starting Vite build...');
