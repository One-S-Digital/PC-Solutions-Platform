#!/usr/bin/env node
/**
 * Fix Missing Namespace Prefixes Script
 * Adds proper namespace prefixes to translation calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixes = [
  // ContentUploadModal - needs common: prefix
  {
    file: 'frontend/components/admin/ContentUploadModal.tsx',
    replacements: [
      { from: /t\('contentUploadModal\./g, to: "t('common:contentUploadModal." },
      { from: /t\('languageSwitcher\./g, to: "t('common:languageSwitcher." },
      { from: /t\('buttons\.(close|cancel|saveChanges)'\)/g, to: "t('common:buttons.$1')" },
    ]
  },
  // MessagesPage and components
  {
    file: 'frontend/pages/MessagesPage.tsx',
    replacements: [
      { from: /t\('(?!common:|messages:)buttons\./g, to: "t('common:buttons." },
      { from: /t\('(?!common:|messages:)searchPlaceholder'/g, to: "t('messages:searchPlaceholder'" },
      { from: /t\('(?!common:|messages:)filters\./g, to: "t('messages:filters." },
    ]
  },
  {
    file: 'frontend/components/messaging/CreateGroupChatModal.tsx',
    replacements: [
      { from: /t\('createGroupChatModal\./g, to: "t('common:createGroupChatModal." },
      { from: /t\('buttons\./g, to: "t('common:buttons." },
    ]
  },
  // StatePoliciesPage
  {
    file: 'frontend/pages/StatePoliciesPage.tsx',
    replacements: [
      { from: /t\('statePolicies\./g, to: "t('content:statePolicies." },
    ]
  },
  // PolicyAlertModal
  {
    file: 'frontend/components/admin/PolicyAlertModal.tsx',
    replacements: [
      { from: /t\('policyAlertModal\./g, to: "t('common:policyAlertModal." },
      { from: /t\('buttons\./g, to: "t('common:buttons." },
    ]
  },
  // DesignSystemPage
  {
    file: 'frontend/pages/DesignSystemPage.tsx',
    replacements: [
      { from: /t\('designSystem\./g, to: "t('admin:designSystem." },
    ]
  },
  // SettingsPage
  {
    file: 'frontend/pages/SettingsPage.tsx',
    replacements: [
      { from: /t\('settingsPage\./g, to: "t('common:settingsPage." },
      { from: /t\('page\./g, to: "t('settings:page." },
    ]
  },
  // AccountSecuritySettings  
  {
    file: 'frontend/components/settings/sections/AccountSecuritySettings.tsx',
    replacements: [
      { from: /t\('settingsAccountSecurity\./g, to: "t('common:settingsAccountSecurity." },
      { from: /t\('errors\./g, to: "t('common:errors." },
      { from: /t\('buttons\./g, to: "t('common:buttons." },
    ]
  },
  // PricingPage - role.supplier issue
  {
    file: 'frontend/pages/PricingPage.tsx',
    replacements: [
      { from: /t\('role\.supplier'\)/g, to: "t('signup:role.supplier')" },
      { from: /t\('role\.serviceProvider'\)/g, to: "t('signup:role.serviceProvider')" },
      { from: /t\('role\.foundation'\)/g, to: "t('signup:role.foundation')" },
      { from: /t\('role\.parent'\)/g, to: "t('signup:role.parent')" },
      { from: /t\('buttons\.goBack'\)/g, to: "t('common:buttons.goBack')" },
    ]
  },
];

let totalChanges = 0;
let filesModified = 0;

for (const fix of fixes) {
  const filePath = path.join(__dirname, fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${fix.file} - file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanged = false;
  let changeCount = 0;

  for (const replacement of fix.replacements) {
    const matches = content.match(replacement.from);
    if (matches) {
      content = content.replace(replacement.from, replacement.to);
      changeCount += matches.length;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    totalChanges += changeCount;
    console.log(`✅ ${fix.file}: ${changeCount} fixes applied`);
  }
}

console.log(`\n📊 Summary: ${totalChanges} changes across ${filesModified} files`);
