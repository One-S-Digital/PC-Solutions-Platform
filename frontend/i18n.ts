import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // Load translations using http (e.g., from public/locales)
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    supportedLngs: ['en', 'fr', 'de'],
    fallbackLng: 'en',
    debug: true, 
    ns: ['translation'], 
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', 
    },
    interpolation: {
      escapeValue: false, 
    },
    react: {
      useSuspense: true, 
    },
  });

export default i18n; // Export the configured instance