import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // Load translations using http (e.g., from public/locales)
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    supportedLngs: ['en', 'fr', 'de'],
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development', // Debug only in development
    ns: ['translation'], 
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      allowMultiLoading: false,
      requestOptions: {
        cache: 'no-cache'
      }
    },
    interpolation: {
      escapeValue: false, 
    },
    react: {
      useSuspense: false, // Disable Suspense for production stability
    },
    saveMissing: false, // As per specification
    returnEmptyString: false, // As per specification
    initImmediate: false, // Ensure translations load before render
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

export default i18n; // Export the configured instance