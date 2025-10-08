import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations from shared @workspace/translations package
import commonEn from '@workspace/translations/locales/en/common.json';
import authEn from '@workspace/translations/locales/en/auth.json';
import dashboardEn from '@workspace/translations/locales/en/dashboard.json';
import commonFr from '@workspace/translations/locales/fr/common.json';
import authFr from '@workspace/translations/locales/fr/auth.json';
import dashboardFr from '@workspace/translations/locales/fr/dashboard.json';
import commonDe from '@workspace/translations/locales/de/common.json';
import authDe from '@workspace/translations/locales/de/auth.json';
import dashboardDe from '@workspace/translations/locales/de/dashboard.json';

i18n
  .use(initReactI18next)
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
  });

export default i18n;