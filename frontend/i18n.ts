import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Create a promise to ensure i18n is initialized before the app renders
const initI18n = () => {
  return i18n
    .use(HttpApi) // Load translations using http (e.g., from public/locales)
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n down to react-i18next
    .init({
      supportedLngs: ['en', 'fr', 'de'],
      fallbackLng: 'en',
      debug: false, // Disable debug to reduce console noise
      ns: ['common', 'auth', 'dashboard'], 
      defaultNS: 'common',
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
        useSuspense: false, // Disable Suspense for now to avoid blocking
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
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

export default i18n;