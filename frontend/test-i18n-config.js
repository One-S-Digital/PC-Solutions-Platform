// Test script to verify i18n configuration
import i18n from './i18n.js';

console.log('Testing i18n configuration...');
console.log('i18n instance:', i18n);
console.log('Is initialized:', i18n.isInitialized);
console.log('Current language:', i18n.language);
console.log('Available languages:', i18n.languages);

// Wait a bit for initialization
setTimeout(() => {
  console.log('After timeout - Is initialized:', i18n.isInitialized);
  console.log('Has resource bundle:', i18n.hasResourceBundle(i18n.language, 'translation'));
  
  // Test translations
  const testKeys = ['appName', 'buttons.login', 'sidebar.dashboard'];
  testKeys.forEach(key => {
    const result = i18n.t(key);
    console.log(`Translation for ${key}:`, result);
  });
}, 1000);