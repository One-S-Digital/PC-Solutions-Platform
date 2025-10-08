import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations from shared @workspace/translations package
import commonEn from '@workspace/translations/locales/en/common.json';
import authEn from '@workspace/translations/locales/en/auth.json';
import dashboardEn from '@workspace/translations/locales/en/dashboard.json';
import pricingEn from '@workspace/translations/locales/en/pricing.json';

import commonFr from '@workspace/translations/locales/fr/common.json';
import authFr from '@workspace/translations/locales/fr/auth.json';
import dashboardFr from '@workspace/translations/locales/fr/dashboard.json';
import pricingFr from '@workspace/translations/locales/fr/pricing.json';

import commonDe from '@workspace/translations/locales/de/common.json';
import authDe from '@workspace/translations/locales/de/auth.json';
import dashboardDe from '@workspace/translations/locales/de/dashboard.json';
import pricingDe from '@workspace/translations/locales/de/pricing.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: ['en'],
    debug: false,
    ns: ['common', 'auth', 'dashboard', 'pricing'],
    defaultNS: 'common',
    returnEmptyString: false,
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
        pricing: pricingEn,
      },
      fr: {
        common: commonFr,
        auth: authFr,
        dashboard: dashboardFr,
        pricing: pricingFr,
      },
      de: {
        common: commonDe,
        auth: authDe,
        dashboard: dashboardDe,
        pricing: pricingDe,
      },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;