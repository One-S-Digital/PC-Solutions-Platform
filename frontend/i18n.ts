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
    
    // Test a translation
    const testTranslation = i18n.t('appName');
    console.log('🌍 Test translation (appName):', testTranslation);
    
    if (testTranslation === 'appName') {
      console.warn('⚠️ Translation key returned as-is, translations may not be loading properly');
    }
  })
  .catch((error) => {
    console.error('❌ i18n initialization failed:', error);
  });

export default i18n; // Export the configured instance