#!/usr/bin/env node

/**
 * Extract Final Missing Translation Keys Script
 * 
 * This script extracts the remaining missing translation keys from the final report
 * and generates a structured JSON file with all missing keys organized by category.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the final translation report
const finalReportFile = path.join(__dirname, 'final-translation-report.txt');
const content = fs.readFileSync(finalReportFile, 'utf8');

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

console.log(`Found ${missingKeys.size} unique missing keys in final report`);

// Organize keys by category
const organizedKeys = {
  // Content upload modal
  contentUploadModal: {
    error: {},
    labels: {},
    fileUpload: {},
    form: {},
    validation: {},
    success: {}
  },
  
  // Order request modal
  orderRequestModal: {
    form: {},
    validation: {},
    success: {},
    error: {}
  },
  
  // Service upload modal
  serviceUploadModal: {
    form: {},
    validation: {},
    success: {},
    error: {}
  },
  
  // File upload modal
  fileUploadModal: {
    title: {},
    labels: {},
    fileUpload: {},
    validation: {},
    success: {},
    error: {}
  },
  
  // Lead card
  leadCard: {
    title: {},
    labels: {},
    actions: {},
    status: {}
  },
  
  // Supplier card
  supplierCard: {
    title: {},
    labels: {},
    actions: {},
    rating: {}
  },
  
  // Settings pages
  settingsPage: {
    sections: {},
    forms: {},
    validation: {},
    success: {},
    error: {}
  },
  
  // Settings specific sections
  settingsAccountSecurity: {
    personalInfo: {},
    changePassword: {},
    dangerZone: {},
    notifications: {}
  },
  settingsAnalyticsPreferences: {},
  settingsBillingSubscription: {},
  settingsCompanyProfile: {},
  settingsContactBooking: {},
  settingsDefaults: {},
  settingsNotificationPreferences: {},
  settingsPrivacyData: {},
  settingsPromoCodeManager: {},
  settingsTeamPermissions: {},
  
  // Active client toggle
  activeClientToggle: {
    title: {},
    labels: {},
    status: {}
  },
  
  // Feature lock
  featureLock: {
    title: {},
    message: {},
    upgrade: {}
  },
  
  // Organization profile form
  organizationProfileForm: {
    title: {},
    form: {},
    validation: {},
    success: {},
    error: {}
  },
  
  // Signup page
  signupPage: {
    form: {},
    validation: {},
    success: {},
    error: {},
    placeholders: {}
  },
  
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
  if (key.includes('required')) return readable.replace('Required', 'Required');
  if (key.includes('invalid')) return readable.replace('Invalid', 'Invalid');
  if (key.includes('valid')) return readable.replace('Valid', 'Valid');
  if (key.includes('confirm')) return readable.replace('Confirm', 'Confirm');
  if (key.includes('cancel')) return readable.replace('Cancel', 'Cancel');
  if (key.includes('save')) return readable.replace('Save', 'Save');
  if (key.includes('edit')) return readable.replace('Edit', 'Edit');
  if (key.includes('delete')) return readable.replace('Delete', 'Delete');
  if (key.includes('add')) return readable.replace('Add', 'Add');
  if (key.includes('remove')) return readable.replace('Remove', 'Remove');
  if (key.includes('update')) return readable.replace('Update', 'Update');
  if (key.includes('create')) return readable.replace('Create', 'Create');
  if (key.includes('submit')) return readable.replace('Submit', 'Submit');
  if (key.includes('reset')) return readable.replace('Reset', 'Reset');
  if (key.includes('apply')) return readable.replace('Apply', 'Apply');
  if (key.includes('close')) return readable.replace('Close', 'Close');
  if (key.includes('open')) return readable.replace('Open', 'Open');
  if (key.includes('view')) return readable.replace('View', 'View');
  if (key.includes('hide')) return readable.replace('Hide', 'Hide');
  if (key.includes('show')) return readable.replace('Show', 'Show');
  if (key.includes('enable')) return readable.replace('Enable', 'Enable');
  if (key.includes('disable')) return readable.replace('Disable', 'Disable');
  if (key.includes('active')) return readable.replace('Active', 'Active');
  if (key.includes('inactive')) return readable.replace('Inactive', 'Inactive');
  if (key.includes('pending')) return readable.replace('Pending', 'Pending');
  if (key.includes('completed')) return readable.replace('Completed', 'Completed');
  if (key.includes('failed')) return readable.replace('Failed', 'Failed');
  if (key.includes('success')) return readable.replace('Success', 'Success');
  if (key.includes('warning')) return readable.replace('Warning', 'Warning');
  if (key.includes('info')) return readable.replace('Info', 'Info');
  if (key.includes('error')) return readable.replace('Error', 'Error');
  if (key.includes('critical')) return readable.replace('Critical', 'Critical');
  if (key.includes('fatal')) return readable.replace('Fatal', 'Fatal');
  if (key.includes('debug')) return readable.replace('Debug', 'Debug');
  if (key.includes('test')) return readable.replace('Test', 'Test');
  if (key.includes('production')) return readable.replace('Production', 'Production');
  if (key.includes('staging')) return readable.replace('Staging', 'Staging');
  if (key.includes('development')) return readable.replace('Development', 'Development');
  if (key.includes('environment')) return readable.replace('Environment', 'Environment');
  if (key.includes('version')) return readable.replace('Version', 'Version');
  if (key.includes('build')) return readable.replace('Build', 'Build');
  if (key.includes('changelog')) return readable.replace('Changelog', 'Changelog');
  if (key.includes('documentation')) return readable.replace('Documentation', 'Documentation');
  if (key.includes('apiDocs')) return readable.replace('Api Docs', 'API Documentation');
  if (key.includes('helpCenter')) return readable.replace('Help Center', 'Help Center');
  if (key.includes('contactSupport')) return readable.replace('Contact Support', 'Contact Support');
  if (key.includes('reportIssue')) return readable.replace('Report Issue', 'Report Issue');
  if (key.includes('tryAgain')) return readable.replace('Try Again', 'Try Again');
  if (key.includes('networkError')) return readable.replace('Network Error', 'Network Error');
  if (key.includes('serverError')) return readable.replace('Server Error', 'Server Error');
  if (key.includes('notFound')) return readable.replace('Not Found', 'Not Found');
  if (key.includes('forbidden')) return readable.replace('Forbidden', 'Forbidden');
  if (key.includes('unauthorized')) return readable.replace('Unauthorized', 'Unauthorized');
  if (key.includes('accessDenied')) return readable.replace('Access Denied', 'Access Denied');
  if (key.includes('insufficientPermissions')) return readable.replace('Insufficient Permissions', 'Insufficient Permissions');
  if (key.includes('pleaseLoginAgain')) return readable.replace('Please Login Again', 'Please Login Again');
  if (key.includes('sessionExpired')) return readable.replace('Session Expired', 'Session Expired');
  if (key.includes('loginExpired')) return readable.replace('Login Expired', 'Login Expired');
  if (key.includes('passwordReset')) return readable.replace('Password Reset', 'Password Reset');
  if (key.includes('passwordChanged')) return readable.replace('Password Changed', 'Password Changed');
  if (key.includes('profileUpdated')) return readable.replace('Profile Updated', 'Profile Updated');
  if (key.includes('accountDeleted')) return readable.replace('Account Deleted', 'Account Deleted');
  if (key.includes('accountSuspended')) return readable.replace('Account Suspended', 'Account Suspended');
  if (key.includes('accountDeactivated')) return readable.replace('Account Deactivated', 'Account Deactivated');
  if (key.includes('accountActivated')) return readable.replace('Account Activated', 'Account Activated');
  if (key.includes('accountCreated')) return readable.replace('Account Created', 'Account Created');
  if (key.includes('verificationSent')) return readable.replace('Verification Sent', 'Verification Sent');
  if (key.includes('resendVerification')) return readable.replace('Resend Verification', 'Resend Verification');
  if (key.includes('emailNotVerified')) return readable.replace('Email Not Verified', 'Email Not Verified');
  if (key.includes('emailVerified')) return readable.replace('Email Verified', 'Email Verified');
  if (key.includes('verifyEmail')) return readable.replace('Verify Email', 'Verify Email');
  if (key.includes('twoFactorAuth')) return readable.replace('Two Factor Auth', 'Two-Factor Authentication');
  if (key.includes('keepMeLoggedIn')) return readable.replace('Keep Me Logged In', 'Keep Me Logged In');
  if (key.includes('loginHere')) return readable.replace('Login Here', 'Login Here');
  if (key.includes('signupHere')) return readable.replace('Signup Here', 'Sign Up Here');
  if (key.includes('termsAndPrivacy')) return readable.replace('Terms And Privacy', 'Terms and Privacy');
  if (key.includes('privacyAccepted')) return readable.replace('Privacy Accepted', 'Privacy Accepted');
  if (key.includes('termsAccepted')) return readable.replace('Terms Accepted', 'Terms Accepted');
  if (key.includes('phoneRequired')) return readable.replace('Phone Required', 'Phone Required');
  if (key.includes('lastNameRequired')) return readable.replace('Last Name Required', 'Last Name Required');
  if (key.includes('firstNameRequired')) return readable.replace('First Name Required', 'First Name Required');
  if (key.includes('organizationRequired')) return readable.replace('Organization Required', 'Organization Required');
  if (key.includes('roleRequired')) return readable.replace('Role Required', 'Role Required');
  if (key.includes('phoneInvalid')) return readable.replace('Phone Invalid', 'Phone Invalid');
  if (key.includes('emailInvalid')) return readable.replace('Email Invalid', 'Email Invalid');
  if (key.includes('passwordsDoNotMatch')) return readable.replace('Passwords Do Not Match', 'Passwords Do Not Match');
  if (key.includes('passwordTooShort')) return readable.replace('Password Too Short', 'Password Too Short');
  if (key.includes('passwordRequired')) return readable.replace('Password Required', 'Password Required');
  if (key.includes('emailRequired')) return readable.replace('Email Required', 'Email Required');
  if (key.includes('invalidCredentials')) return readable.replace('Invalid Credentials', 'Invalid Credentials');
  if (key.includes('logoutSuccess')) return readable.replace('Logout Success', 'Logout Success');
  if (key.includes('loginSuccess')) return readable.replace('Login Success', 'Login Success');
  if (key.includes('signupSuccess')) return readable.replace('Signup Success', 'Signup Success');
  if (key.includes('platformName')) return readable.replace('Platform Name', 'Platform Name');
  if (key.includes('welcomeTo')) return readable.replace('Welcome To', 'Welcome To');
  if (key.includes('welcomeBack')) return readable.replace('Welcome Back', 'Welcome Back');
  if (key.includes('superAdmin')) return readable.replace('Super Admin', 'Super Admin');
  if (key.includes('admin')) return readable.replace('Admin', 'Admin');
  if (key.includes('parent')) return readable.replace('Parent', 'Parent');
  if (key.includes('serviceProvider')) return readable.replace('Service Provider', 'Service Provider');
  if (key.includes('productSupplier')) return readable.replace('Product Supplier', 'Product Supplier');
  if (key.includes('educator')) return readable.replace('Educator', 'Educator');
  if (key.includes('foundation')) return readable.replace('Foundation', 'Foundation');
  if (key.includes('selectRole')) return readable.replace('Select Role', 'Select Role');
  if (key.includes('company')) return readable.replace('Company', 'Company');
  if (key.includes('organization')) return readable.replace('Organization', 'Organization');
  if (key.includes('role')) return readable.replace('Role', 'Role');
  if (key.includes('phoneNumber')) return readable.replace('Phone Number', 'Phone Number');
  if (key.includes('lastName')) return readable.replace('Last Name', 'Last Name');
  if (key.includes('firstName')) return readable.replace('First Name', 'First Name');
  if (key.includes('changePassword')) return readable.replace('Change Password', 'Change Password');
  if (key.includes('resetPassword')) return readable.replace('Reset Password', 'Reset Password');
  if (key.includes('forgotPassword')) return readable.replace('Forgot Password', 'Forgot Password');
  if (key.includes('confirmPassword')) return readable.replace('Confirm Password', 'Confirm Password');
  if (key.includes('password')) return readable.replace('Password', 'Password');
  if (key.includes('email')) return readable.replace('Email', 'Email');
  if (key.includes('logout')) return readable.replace('Logout', 'Logout');
  if (key.includes('login')) return readable.replace('Login', 'Login');
  if (key.includes('signup')) return readable.replace('Signup', 'Sign Up');
  
  return readable;
};

// Generate the complete English translation structure
const englishTranslations = generateEnglishTranslations(organizedKeys);

// Write the organized missing keys to a file
fs.writeFileSync(
  path.join(__dirname, 'final-missing-keys-organized.json'),
  JSON.stringify(organizedKeys, null, 2)
);

// Write the English translations
fs.writeFileSync(
  path.join(__dirname, 'final-missing-keys-english.json'),
  JSON.stringify(englishTranslations, null, 2)
);

console.log(`✅ Extracted ${missingKeys.size} missing translation keys from final report`);
console.log(`📁 Organized keys saved to: final-missing-keys-organized.json`);
console.log(`📁 English translations saved to: final-missing-keys-english.json`);