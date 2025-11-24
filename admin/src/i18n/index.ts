import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations from shared @workspace/translations package
import commonEn from '@workspace/translations/locales/en/common.json';
import authEn from '@workspace/translations/locales/en/auth.json';
import dashboardEn from '@workspace/translations/locales/en/dashboard.json';
import adminEn from '@workspace/translations/locales/en/admin.json';
import commonFr from '@workspace/translations/locales/fr/common.json';
import authFr from '@workspace/translations/locales/fr/auth.json';
import dashboardFr from '@workspace/translations/locales/fr/dashboard.json';
import adminFr from '@workspace/translations/locales/fr/admin.json';
import commonDe from '@workspace/translations/locales/de/common.json';
import authDe from '@workspace/translations/locales/de/auth.json';
import dashboardDe from '@workspace/translations/locales/de/dashboard.json';
import adminDe from '@workspace/translations/locales/de/admin.json';

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
        admin: adminEn,
      },
      fr: {
        common: commonFr,
        auth: authFr,
        dashboard: dashboardFr,
        admin: adminFr,
      },
      de: {
        common: commonDe,
        auth: authDe,
        dashboard: dashboardDe,
        admin: adminDe,
      },
    },
    ns: ['common', 'auth', 'dashboard', 'admin'],
    defaultNS: 'common',
  });

export default i18n;