import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

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
    saveMissing: true,
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

export default i18n;