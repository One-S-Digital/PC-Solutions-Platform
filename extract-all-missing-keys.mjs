#!/usr/bin/env node

/**
 * Extract All Missing Translation Keys Script
 * 
 * This script extracts all missing translation keys from the comprehensive check
 * and generates a structured JSON file with all missing keys organized by category.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the missing translations file
const missingTranslationsFile = path.join(__dirname, 'missing-translations-detailed.txt');
const content = fs.readFileSync(missingTranslationsFile, 'utf8');

// Extract missing keys from the output
const missingKeys = new Set();
const lines = content.split('\n');

for (const line of lines) {
  if (line.includes('Key: "')) {
    const match = line.match(/Key: "([^"]+)"/);
    if (match) {
      missingKeys.add(match[1]);
    }
  }
}

console.log(`Found ${missingKeys.size} unique missing keys`);

// Organize keys by category
const organizedKeys = {
  // Settings page
  settingsPage: {},
  
  // Admin components
  contentUploadModal: {},
  policyAlertModal: {},
  
  // Cart components
  orderSummaryDrawer: {},
  
  // Debug components
  translationDiagnostics: {},
  translationErrorLogger: {},
  
  // Layout components
  navbar: {},
  sidebar: {},
  
  // Marketplace components
  orderRequestModal: {},
  supplierCard: {},
  
  // Recruitment components
  recruitmentPage: {
    jobDetailModal: {},
    jobPostModal: {},
    viewApplicantsModal: {},
    candidateCard: {}
  },
  
  // Service provider components
  serviceUploadModal: {},
  
  // Settings components
  settingsPage: {
    sections: {},
    forms: {},
    validation: {}
  },
  
  // Page-specific translations
  educatorProfilePage: {
    skills: {},
    availability: {},
    documents: {},
    experience: {},
    education: {},
    certifications: {}
  },
  parentDashboard: {
    enquiry: {},
    quickActions: {},
    childProfile: {},
    favorites: {}
  },
  foundationAnalyticsPage: {},
  serviceProviderDashboard: {},
  supportPage: {},
  partnerDetailPage: {},
  
  // Common/general keys
  common: {},
  buttons: {},
  labels: {},
  status: {},
  messages: {},
  errors: {},
  validation: {},
  placeholders: {},
  tooltips: {},
  helpText: {}
};

// Categorize the missing keys
for (const key of missingKeys) {
  const parts = key.split('.');
  const category = parts[0];
  
  if (organizedKeys[category]) {
    if (parts.length === 1) {
      organizedKeys[category][key] = key; // Simple key
    } else {
      // Nested key - build the nested structure
      let current = organizedKeys[category];
      for (let i = 1; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = key;
    }
  } else {
    // Add to common category
    organizedKeys.common[key] = key;
  }
}

// Generate English translations with meaningful values
const generateEnglishTranslations = (keys, prefix = '') => {
  const translations = {};
  
  for (const [key, value] of Object.entries(keys)) {
    if (typeof value === 'object') {
      translations[key] = generateEnglishTranslations(value, prefix ? `${prefix}.${key}` : key);
    } else {
      // Generate a meaningful translation based on the key
      const fullKey = prefix ? `${prefix}.${key}` : key;
      translations[key] = generateTranslationFromKey(fullKey);
    }
  }
  
  return translations;
};

const generateTranslationFromKey = (key) => {
  // Handle special cases first
  if (key === 'T') return 'T';
  if (key === '.') return '.';
  if (key === 'Title and Message are required.') return 'Title and Message are required.';
  if (key === 'Cannot submit order. User not logged in, supplier info missing, or cart is empty.') return 'Cannot submit order. User not logged in, supplier info missing, or cart is empty.';
  if (key === 'Missing keys copied to clipboard!') return 'Missing keys copied to clipboard!';
  
  // Convert camelCase and snake_case to readable text
  const readable = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Handle specific patterns
  if (key.includes('title')) return readable.replace('Title', 'Title');
  if (key.includes('label')) return readable.replace('Label', 'Label');
  if (key.includes('button')) return readable.replace('Button', 'Button');
  if (key.includes('placeholder')) return readable.replace('Placeholder', 'Placeholder');
  if (key.includes('helpText')) return readable.replace('Help Text', 'Help Text');
  if (key.includes('message')) return readable.replace('Message', 'Message');
  if (key.includes('error')) return readable.replace('Error', 'Error');
  if (key.includes('success')) return readable.replace('Success', 'Success');
  if (key.includes('warning')) return readable.replace('Warning', 'Warning');
  if (key.includes('info')) return readable.replace('Info', 'Info');
  if (key.includes('loading')) return readable.replace('Loading', 'Loading');
  if (key.includes('saving')) return readable.replace('Saving', 'Saving');
  if (key.includes('saved')) return readable.replace('Saved', 'Saved');
  if (key.includes('unsaved')) return readable.replace('Unsaved', 'Unsaved');
  if (key.includes('changes')) return readable.replace('Changes', 'Changes');
  if (key.includes('prompt')) return readable.replace('Prompt', 'Prompt');
  if (key.includes('available')) return readable.replace('Available', 'Available');
  if (key.includes('sections')) return readable.replace('Sections', 'Sections');
  if (key.includes('no')) return readable.replace('No', 'No');
  if (key.includes('browse')) return readable.replace('Browse', 'Browse');
  if (key.includes('drag')) return readable.replace('Drag', 'Drag');
  if (key.includes('drop')) return readable.replace('Drop', 'Drop');
  if (key.includes('selected')) return readable.replace('Selected', 'Selected');
  if (key.includes('current')) return readable.replace('Current', 'Current');
  if (key.includes('file')) return readable.replace('File', 'File');
  if (key.includes('upload')) return readable.replace('Upload', 'Upload');
  if (key.includes('type')) return readable.replace('Type', 'Type');
  if (key.includes('toggle')) return readable.replace('Toggle', 'Toggle');
  if (key.includes('navigation')) return readable.replace('Navigation', 'Navigation');
  if (key.includes('goBack')) return readable.replace('Go Back', 'Go Back');
  if (key.includes('previous')) return readable.replace('Previous', 'Previous');
  if (key.includes('page')) return readable.replace('Page', 'Page');
  if (key.includes('search')) return readable.replace('Search', 'Search');
  if (key.includes('placeholder')) return readable.replace('Placeholder', 'Placeholder');
  
  return readable;
};

// Generate the complete English translation structure
const englishTranslations = generateEnglishTranslations(organizedKeys);

// Write the organized missing keys to a file
fs.writeFileSync(
  path.join(__dirname, 'all-missing-keys-organized.json'),
  JSON.stringify(organizedKeys, null, 2)
);

// Write the English translations
fs.writeFileSync(
  path.join(__dirname, 'all-missing-keys-english.json'),
  JSON.stringify(englishTranslations, null, 2)
);

console.log(`✅ Extracted ${missingKeys.size} missing translation keys`);
console.log(`📁 Organized keys saved to: all-missing-keys-organized.json`);
console.log(`📁 English translations saved to: all-missing-keys-english.json`);