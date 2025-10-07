import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly instead of using HttpApi
import commonEn from './public/locales/en/common.json';
import authEn from './public/locales/en/auth.json';
import dashboardEn from './public/locales/en/dashboard.json';
import commonFr from './public/locales/fr/common.json';
import authFr from './public/locales/fr/auth.json';
import dashboardFr from './public/locales/fr/dashboard.json';
import commonDe from './public/locales/de/common.json';
import authDe from './public/locales/de/auth.json';
import dashboardDe from './public/locales/de/dashboard.json';

// Create a promise to ensure i18n is initialized before the app renders
const initI18n = () => {
  return i18n
    .use(initReactI18next) // Pass i18n down to react-i18next
    .init({
      lng: 'en', // default language
      fallbackLng: 'en',
      debug: process.env.NODE_ENV !== 'production',
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
      resources: {
        en: {
          common: commonEn,
          auth: authEn,
          dashboard: dashboardEn,
        },
        fr: {
          common: commonFr,
          auth: authFr,
          dashboard: dashboardFr,
        },
        de: {
          common: commonDe,
          auth: authDe,
          dashboard: dashboardDe,
        },
      },
      ns: ['common', 'auth', 'dashboard'],
      defaultNS: 'common',
      react: {
        useSuspense: false, // Disable Suspense to avoid blocking
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
      },
      saveMissing: false,
      returnEmptyString: false,
      initImmediate: true,
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