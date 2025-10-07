import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly for build-time bundling
import commonEn from './public/locales/en/common.json';
import authEn from './public/locales/en/auth.json';
import dashboardEn from './public/locales/en/dashboard.json';
import commonFr from './public/locales/fr/common.json';
import authFr from './public/locales/fr/auth.json';
import dashboardFr from './public/locales/fr/dashboard.json';
import commonDe from './public/locales/de/common.json';
import authDe from './public/locales/de/auth.json';
import dashboardDe from './public/locales/de/dashboard.json';

// Initialize i18n synchronously for immediate availability
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
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
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },
    saveMissing: false,
    returnEmptyString: false,
    initImmediate: true,
  });

export default i18n;