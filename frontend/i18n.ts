import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next
i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next) // initReactI18next adds useSuspense: false by default
  .init({
    lng: 'en',
    fallbackLng: ['en'],
    debug: false,
    ns: ['common', 'auth', 'dashboard', 'pricing'],
    defaultNS: 'common',
    returnEmptyString: false,
    saveMissing: false, // Fixed: spec requires false
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

// Ensure i18next is properly initialized
if (!i18n.isInitialized) {
  i18n.init();
}

export default i18n;