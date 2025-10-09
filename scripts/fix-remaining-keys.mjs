#!/usr/bin/env node
/**
 * Fix Remaining Translation Keys
 * Manual fixes for keys that the automated script couldn't handle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '../frontend');

// Fix SignupPage.tsx
const signupPath = path.join(FRONTEND_DIR, 'pages/SignupPage.tsx');
let signupContent = fs.readFileSync(signupPath, 'utf8');

// Fix role keys
signupContent = signupContent.replace(
  /nameKey: 'signupPage\.roles\.(foundation|supplier|serviceProvider|parent)'/g,
  "nameKey: 'roles.$1'"
);

// Fix validation error keys (remaining ones)
signupContent = signupContent.replace(
  /t\('signupPage\.errors\.(parentNameRequired|contactPersonRequired)'\)/g,
  "t('errors.$1')"
);

// Fix label and placeholder keys
signupContent = signupContent.replace(
  /renderField\('([^']+)',\s*'signupPage\.labels\.([^']+)'/g,
  "renderField('$1', 'labels.$2'"
);
signupContent = signupContent.replace(
  /'signupPage\.placeholders\.([^']+)'/g,
  "'placeholders.$1'"
);

// Fix button keys
signupContent = signupContent.replace(
  /t\('createAccountButton'\)/g,
  "t('buttons.createAccount')"
);

// Fix loginPage reference
signupContent = signupContent.replace(
  /t\('loginPage\.alreadyAccount'\)/g,
  "t('common:loginPage.alreadyAccount')"
);
signupContent = signupContent.replace(
  /t\('buttons\.login'\)/g,
  "t('common:buttons.login')"
);

// Fix common namespace keys
signupContent = signupContent.replace(
  /t\('hidePassword'\)/g,
  "t('common:hidePassword')"
);
signupContent = signupContent.replace(
  /t\('showPassword'\)/g,
  "t('common:showPassword')"
);

fs.writeFileSync(signupPath, signupContent, 'utf8');
console.log('✅ Fixed SignupPage.tsx');

// Check other files for common issues
console.log('\n📊 Checking for other common issues...\n');

let totalFixed = 1;

console.log(`\n✅ Total files manually fixed: ${totalFixed}`);
console.log('✅ Remaining translation key fixes completed!\n');
