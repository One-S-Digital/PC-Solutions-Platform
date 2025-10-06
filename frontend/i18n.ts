import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly to ensure they're available
import enTranslation from './public/locales/en/translation.json';
import frTranslation from './public/locales/fr/translation.json';
import deTranslation from './public/locales/de/translation.json';

// Create a promise to ensure i18n is initialized before the app renders
const initI18n = () => {
  return i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n down to react-i18next
    .init({
      supportedLngs: ['en', 'fr', 'de'],
      fallbackLng: 'en',
      debug: true, // Enable debug for translation troubleshooting
      ns: ['translation'], 
      defaultNS: 'translation',
      resources: {
        en: {
          translation: enTranslation
        },
        fr: {
          translation: frTranslation
        },
        de: {
          translation: deTranslation
        }
      },
      interpolation: {
        escapeValue: false, 
      },
      react: {
        useSuspense: true, // Enable Suspense to wait for translations
      },
      saveMissing: false, // As per specification
      returnEmptyString: false, // As per specification
      initImmediate: true, // Initialize immediately
      load: 'languageOnly', // Load only language, not region
      cleanCode: true, // Clean language codes
      preload: ['en'], // Preload English translations
    })
    .then(() => {
      console.log('🌍 i18n initialized successfully');
      console.log('🌍 Current language:', i18n.language);
      console.log('🌍 Available languages:', i18n.languages);
      console.log('🌍 Has resource bundle:', i18n.hasResourceBundle(i18n.language, 'translation'));
      
      // Test multiple translations
      const testKeys = ['appName', 'buttons.login', 'sidebar.dashboard', 'dashboardPage.welcome'];
      console.log('🌍 Testing translations:');
      testKeys.forEach(key => {
        const result = i18n.t(key);
        const isWorking = result !== key;
        console.log(`  ${isWorking ? '✅' : '❌'} ${key}: "${result}"`);
      });
      
      // Check if resource bundle is loaded
      const resourceBundle = i18n.getResourceBundle(i18n.language, 'translation');
      console.log('🌍 Resource bundle keys:', Object.keys(resourceBundle || {}).length);
      
      if (!i18n.hasResourceBundle(i18n.language, 'translation')) {
        console.error('❌ Resource bundle not loaded! This will cause translation keys to show instead of text.');
      }
    })
    .catch((error) => {
      console.error('❌ i18n initialization failed:', error);
    });
};

// Add event listeners for debugging
i18n.on('loaded', () => {
  console.log('🌍 Translation files loaded');
});

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`❌ Failed to load translation for ${lng}/${ns}:`, msg);
});

i18n.on('missingKey', (lng, ns, key) => {
  console.warn(`⚠️ Missing translation key: ${key} for language ${lng}`);
});

// Initialize i18n immediately
initI18n();

export default i18n; // Export the configured instance