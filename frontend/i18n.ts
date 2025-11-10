import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations from shared @workspace/translations package
import commonEn from '@workspace/translations/locales/en/common.json';
import authEn from '@workspace/translations/locales/en/auth.json';
import dashboardEn from '@workspace/translations/locales/en/dashboard.json';
import pricingEn from '@workspace/translations/locales/en/pricing.json';
import signupEn from '@workspace/translations/locales/en/signup.json';
import parentLeadFormEn from '@workspace/translations/locales/en/parentLeadForm.json';
import marketplaceEn from '@workspace/translations/locales/en/marketplace.json';
import recruitmentEn from '@workspace/translations/locales/en/recruitment.json';
import usersEn from '@workspace/translations/locales/en/users.json';
import contentEn from '@workspace/translations/locales/en/content.json';
import messagesEn from '@workspace/translations/locales/en/messages.json';
import adminEn from '@workspace/translations/locales/en/admin.json';
import settingsEn from '@workspace/translations/locales/en/settings.json';
import profileEn from '@workspace/translations/locales/en/profile.json';

import commonFr from '@workspace/translations/locales/fr/common.json';
import authFr from '@workspace/translations/locales/fr/auth.json';
import dashboardFr from '@workspace/translations/locales/fr/dashboard.json';
import pricingFr from '@workspace/translations/locales/fr/pricing.json';
import signupFr from '@workspace/translations/locales/fr/signup.json';
import parentLeadFormFr from '@workspace/translations/locales/fr/parentLeadForm.json';
import marketplaceFr from '@workspace/translations/locales/fr/marketplace.json';
import recruitmentFr from '@workspace/translations/locales/fr/recruitment.json';
import usersFr from '@workspace/translations/locales/fr/users.json';
import contentFr from '@workspace/translations/locales/fr/content.json';
import messagesFr from '@workspace/translations/locales/fr/messages.json';
import adminFr from '@workspace/translations/locales/fr/admin.json';
import settingsFr from '@workspace/translations/locales/fr/settings.json';
import profileFr from '@workspace/translations/locales/fr/profile.json';

import commonDe from '@workspace/translations/locales/de/common.json';
import authDe from '@workspace/translations/locales/de/auth.json';
import dashboardDe from '@workspace/translations/locales/de/dashboard.json';
import pricingDe from '@workspace/translations/locales/de/pricing.json';
import signupDe from '@workspace/translations/locales/de/signup.json';
import parentLeadFormDe from '@workspace/translations/locales/de/parentLeadForm.json';
import marketplaceDe from '@workspace/translations/locales/de/marketplace.json';
import recruitmentDe from '@workspace/translations/locales/de/recruitment.json';
import usersDe from '@workspace/translations/locales/de/users.json';
import contentDe from '@workspace/translations/locales/de/content.json';
import messagesDe from '@workspace/translations/locales/de/messages.json';
import adminDe from '@workspace/translations/locales/de/admin.json';
import settingsDe from '@workspace/translations/locales/de/settings.json';
import profileDe from '@workspace/translations/locales/de/profile.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: ['en'],
    debug: false,
    ns: ['common', 'auth', 'dashboard', 'pricing', 'signup', 'parentLeadForm', 'marketplace', 'recruitment', 'users', 'content', 'messages', 'admin', 'settings', 'profile'],
    defaultNS: 'common',
    returnEmptyString: false,
    nsSeparator: ':',
    keySeparator: '.',
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
        pricing: pricingEn,
        signup: signupEn,
        parentLeadForm: parentLeadFormEn,
        marketplace: marketplaceEn,
        recruitment: recruitmentEn,
        users: usersEn,
        content: contentEn,
        messages: messagesEn,
        admin: adminEn,
        settings: settingsEn,
        profile: profileEn,
      },
      fr: {
        common: commonFr,
        auth: authFr,
        dashboard: dashboardFr,
        pricing: pricingFr,
        signup: signupFr,
        parentLeadForm: parentLeadFormFr,
        marketplace: marketplaceFr,
        recruitment: recruitmentFr,
        users: usersFr,
        content: contentFr,
        messages: messagesFr,
        admin: adminFr,
        settings: settingsFr,
        profile: profileFr,
      },
      de: {
        common: commonDe,
        auth: authDe,
        dashboard: dashboardDe,
        pricing: pricingDe,
        signup: signupDe,
        parentLeadForm: parentLeadFormDe,
        marketplace: marketplaceDe,
        recruitment: recruitmentDe,
        users: usersDe,
        content: contentDe,
        messages: messagesDe,
        admin: adminDe,
        settings: settingsDe,
        profile: profileDe,
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