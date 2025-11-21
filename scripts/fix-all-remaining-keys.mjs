#!/usr/bin/env node

/**
 * Fix All Remaining Missing Keys
 * Handles edge cases: namespace prefixes, dynamic keys, error messages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales', 'en');

// Load translation files
const translations = {};
['common', 'auth', 'dashboard', 'pricing'].forEach(ns => {
  const file = path.join(TRANSLATIONS_DIR, `${ns}.json`);
  translations[ns] = JSON.parse(fs.readFileSync(file, 'utf8'));
});

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

console.log('🔧 Fixing Remaining Translation Keys\n');

// Fix 1: Add top-level "back" and "loading" to common
if (!translations.common.back) {
  translations.common.back = "Back";
  console.log('✅ Added: common.back = "Back"');
}

if (!translations.common.loading) {
  translations.common.loading = "Loading...";
  console.log('✅ Added: common.loading = "Loading..."');
}

// Fix 2: Add signupPage keys to auth if missing at top level
const signupKeys = ['firstName', 'lastName', 'email', 'password', 'phoneNumber', 'verifyEmail', 'verifyEmailDescription', 'verificationCode'];

if (!translations.auth.signupPage) {
  translations.auth.signupPage = {};
}

signupKeys.forEach(key => {
  if (!translations.auth.signupPage[key]) {
    const value = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    translations.auth.signupPage[key] = value;
    console.log(`✅ Added: auth.signupPage.${key} = "${value}"`);
  }
});

// Fix 3: Add structured order error messages to common
const orderErrorMap = {
  'order.titleAndMessageRequired': 'Title and message are required.',
  'order.cannotSubmitMissingInfo': 'Cannot submit order. User not logged in, supplier info missing, or cart is empty.',
};

Object.entries(orderErrorMap).forEach(([key, value]) => {
  const existing = key.split('.').reduce((acc, part) => acc && acc[part], translations.common);
  if (!existing) {
    setNested(translations.common, key, value);
    console.log(`✅ Added: common.${key} = "${value}"`);
  }
});

// Fix 4: Add contentUploadModal.buttons.upload
setNested(translations.common, 'contentUploadModal.buttons.upload', 'Upload');
console.log('✅ Added: contentUploadModal.buttons.upload');

// Fix 5: Add contentUploadModal.labels.description
setNested(translations.common, 'contentUploadModal.labels.description', 'Description');
console.log('✅ Added: contentUploadModal.labels.description');

// Fix 6: Add contentUploadModal.labels.uploadFile
setNested(translations.common, 'contentUploadModal.labels.uploadFile', 'Upload File');
console.log('✅ Added: contentUploadModal.labels.uploadFile');

// Fix 7: Add file upload button
setNested(translations.common, 'fileUploadModal.uploadButton', 'Upload');
console.log('✅ Added: fileUploadModal.uploadButton');

// Fix 8: Add HR document keys
setNested(translations.common, 'hrDocumentCard.downloadButton', 'Download');
setNested(translations.common, 'hrDocumentCard.previewButtonLabel', 'Preview');
setNested(translations.common, 'hrDocumentCard.versionLabel', 'Version');
console.log('✅ Added: hrDocumentCard keys');

// Fix 9: Add dashboard detail keys
setNested(translations.dashboard, 'dashboardDetailPage.newOrders.ecotoysBlocks', 'Ecotoys Blocks');
setNested(translations.dashboard, 'dashboardDetailPage.newOrders.artFunPack', 'Art Fun Pack');
setNested(translations.dashboard, 'dashboardDetailPage.newOrders.freshBitesMeal', 'Fresh Bites Meal');
setNested(translations.dashboard, 'dashboardDetailPage.openJobs.status.open', 'Open');
setNested(translations.dashboard, 'dashboardDetailPage.openJobs.status.interviewing', 'Interviewing');
setNested(translations.dashboard, 'dashboardDetailPage.pageViews.dashboardViews', 'Dashboard Views');
setNested(translations.dashboard, 'dashboardDetailPage.pageViews.sessionDuration', 'Session Duration');
console.log('✅ Added: dashboardDetailPage keys');

// Fix 10: Add service upload modal
setNested(translations.common, 'serviceUploadModal.addTitle', 'Add Service');
console.log('✅ Added: serviceUploadModal.addTitle');

// Fix 11: Add settings keys
setNested(translations.common, 'settingsAccountSecurity.personalInfo.nameLabel', 'Name');
setNested(translations.common, 'settingsPrivacyData.requestGDPRDeletion', 'Request Data Deletion (GDPR)');
setNested(translations.common, 'settingsPromoCodeManager.addEditModal.addTitle', 'Add Promo Code');
setNested(translations.common, 'settingsTeamPermissions.roles.viewer', 'Viewer');
console.log('✅ Added: settings keys');

// Fix 12: Add support page
setNested(translations.common, 'supportPage.furtherAssistanceText.1', 'Our support team is here to help you.');
console.log('✅ Added: supportPage.furtherAssistanceText.1');

// Fix 13: Add userRoles
if (!translations.common.userRoles) {
  translations.common.userRoles = {
    "parent": "Parent",
    "educator": "Educator",
    "foundation": "Foundation",
    "admin": "Administrator",
    "Product Supplier": "Product Supplier",
    "Service Provider": "Service Provider",
    "productSupplier": "Product Supplier",
    "serviceProvider": "Service Provider"
  };
  console.log('✅ Added: userRoles');
}

// Save all files
fs.writeFileSync(path.join(TRANSLATIONS_DIR, 'common.json'), JSON.stringify(translations.common, null, 2) + '\n');
fs.writeFileSync(path.join(TRANSLATIONS_DIR, 'auth.json'), JSON.stringify(translations.auth, null, 2) + '\n');
fs.writeFileSync(path.join(TRANSLATIONS_DIR, 'dashboard.json'), JSON.stringify(translations.dashboard, null, 2) + '\n');

console.log('\n✅ All remaining keys added!');
console.log('\n💡 Run: node scripts/sync-keys-to-all-languages.mjs');
console.log('   Then: node scripts/find-missing-keys-in-code.mjs');
