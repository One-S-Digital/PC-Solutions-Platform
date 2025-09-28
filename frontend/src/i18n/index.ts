import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enSidebar from './locales/en/sidebar.json';
import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frDashboard from './locales/fr/dashboard.json';
import frSidebar from './locales/fr/sidebar.json';
import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deDashboard from './locales/de/dashboard.json';
import deSidebar from './locales/de/sidebar.json';
import enGated from './locales/en/gated.json';
import frGated from './locales/fr/gated.json';
import deGated from './locales/de/gated.json';
import enAntivirus from './locales/en/antivirus.json';
import frAntivirus from './locales/fr/antivirus.json';
import deAntivirus from './locales/de/antivirus.json';

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    ns: ['common', 'auth', 'dashboard', 'sidebar', 'gated', 'antivirus'],
    defaultNS: 'common',
    interpolation: { 
      escapeValue: false 
    },
    saveMissing: false,
    returnEmptyString: false,
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        sidebar: enSidebar,
        gated: enGated,
        antivirus: enAntivirus,
      },
      fr: {
        common: frCommon,
        auth: frAuth,
        dashboard: frDashboard,
        sidebar: frSidebar,
        gated: frGated,
        antivirus: frAntivirus,
      },
      de: {
        common: deCommon,
        auth: deAuth,
        dashboard: deDashboard,
        sidebar: deSidebar,
        gated: deGated,
        antivirus: deAntivirus,
      },
    },
  });

export default i18n;