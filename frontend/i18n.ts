import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

console.log('🔧 [DEBUG] Starting i18n initialization...');

// Initialize i18n with proper error handling
const initI18n = async () => {
  try {
    console.log('🔧 [DEBUG] Starting i18n initialization...');
    
    await i18n
      .use(HttpApi)
      .use(LanguageDetector)
      .use(initReactI18next) // initReactI18next adds useSuspense: false by default
      .init({
        lng: 'en',
        fallbackLng: ['en'],
        debug: true, // Enable debug mode
        ns: ['common', 'auth', 'dashboard', 'pricing'],
        defaultNS: 'common',
        returnEmptyString: false,
        saveMissing: false,
        backend: {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    
    console.log('✅ [DEBUG] i18n initialization completed successfully');
    console.log('🔧 [DEBUG] i18n.isInitialized:', i18n.isInitialized);
    console.log('🔧 [DEBUG] i18n.language:', i18n.language);
    console.log('🔧 [DEBUG] i18n.hasResourceBundle(en, common):', i18n.hasResourceBundle('en', 'common'));
    
    return i18n;
  } catch (error) {
    console.error('❌ [DEBUG] i18n initialization failed:', error);
    throw error;
  }
};

// Start initialization immediately
initI18n();

console.log('🔧 [DEBUG] i18n instance created, isInitialized:', i18n.isInitialized);

export default i18n;