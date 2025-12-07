import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ============================================================
// AUTOMATIC NAMESPACE DISCOVERY
// ============================================================
// Uses Vite's import.meta.glob to automatically discover all
// translation files. No need to manually add imports when
// creating new namespace files!
// ============================================================

// Dynamically import all translation JSON files
const translationModules = import.meta.glob(
  '../../../packages/translations/locales/*/*.json',
  { eager: true, import: 'default' }
) as Record<string, Record<string, unknown>>;

// Helper function to strip [FR], [DE], [EN] prefixes from translation values
const stripPrefixes = (obj: unknown): unknown => {
  if (typeof obj === 'string') {
    return obj.replace(/^\[(FR|DE|EN)\]\s*/i, '').trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(stripPrefixes);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = stripPrefixes(value);
    }
    return result;
  }
  return obj;
};

// Build resources object from discovered modules
// Structure: { en: { common: {...}, auth: {...} }, fr: {...}, de: {...} }
const resources: Record<string, Record<string, unknown>> = {};
const namespaces = new Set<string>();

for (const [path, module] of Object.entries(translationModules)) {
  // Extract language and namespace from path
  // Path format: ../../../packages/translations/locales/en/common.json
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;

  const [, lang, namespace] = match;
  
  // Initialize language object if needed
  if (!resources[lang]) {
    resources[lang] = {};
  }
  
  // Add namespace with prefix stripping
  resources[lang][namespace] = stripPrefixes(module);
  namespaces.add(namespace);
}

// Convert Set to Array for i18next config
const nsArray = Array.from(namespaces);

// Log discovered namespaces in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🌐 i18n: Auto-discovered namespaces:', nsArray);
  console.log('🌐 i18n: Languages:', Object.keys(resources));
}

i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV !== 'production',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources,
    ns: nsArray,
    defaultNS: 'common',
  });

export default i18n;
