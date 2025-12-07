import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { IndexedDBBackend } from './i18n/indexeddb-backend';

// ============================================================
// AUTOMATIC NAMESPACE DISCOVERY
// ============================================================
// Uses Vite's import.meta.glob to automatically discover all
// translation files. No need to manually add imports when
// creating new namespace files!
// ============================================================

// Dynamically import all translation JSON files
const translationModules = import.meta.glob(
  '../packages/translations/locales/*/*.json',
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

// Build fallback resources from discovered modules
// Structure: { en: { common: {...}, auth: {...} }, fr: {...}, de: {...} }
const fallbackResources: Record<string, Record<string, unknown>> = {};
const discoveredNamespaces = new Set<string>();

for (const [path, module] of Object.entries(translationModules)) {
  // Extract language and namespace from path
  // Path format: ../packages/translations/locales/en/common.json
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;

  const [, lang, namespace] = match;
  
  // Initialize language object if needed
  if (!fallbackResources[lang]) {
    fallbackResources[lang] = {};
  }
  
  // Add namespace with prefix stripping
  fallbackResources[lang][namespace] = stripPrefixes(module);
  discoveredNamespaces.add(namespace);
}

// Convert Set to Array for i18next config
const nsArray = Array.from(discoveredNamespaces);

// Log discovered namespaces in development
if (import.meta.env.DEV) {
  console.log('🌐 i18n: Auto-discovered namespaces:', nsArray);
  console.log('🌐 i18n: Languages:', Object.keys(fallbackResources));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Ensure BASE_API_URL includes /api prefix since NestJS uses global prefix
const BASE_API_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

// Production mode: Use bundled translations, skip API calls
// Set VITE_USE_BUNDLED_TRANSLATIONS=true in production .env
const USE_BUNDLED_TRANSLATIONS = import.meta.env.VITE_USE_BUNDLED_TRANSLATIONS === 'true' || 
  import.meta.env.PROD; // Default to bundled in production builds

// Initialize IndexedDB before i18n
IndexedDBBackend.init()
  .then(() => {
    // Clear cache on app start to ensure fresh translations without prefixes
    // This is a one-time clear to remove any old cached data with prefixes
    const cacheVersion = localStorage.getItem('i18n-cache-version');
    const currentVersion = '4.0'; // Increment this when translations structure changes - AUTO DISCOVERY
    
    if (cacheVersion !== currentVersion) {
      IndexedDBBackend.clearAll()
        .then(() => {
          localStorage.setItem('i18n-cache-version', currentVersion);
          console.log('Translation cache cleared and updated to version', currentVersion);
        })
        .catch((err) => {
          console.warn('Failed to clear translation cache:', err);
        });
    }
  })
  .catch((err) => {
    console.warn('Failed to initialize IndexedDB cache:', err);
  });

// Cache version for loadPath
let cachedVersion: string | null = null;
const getVersion = async (): Promise<string> => {
  if (cachedVersion) return cachedVersion;
  try {
    const response = await fetch(`${BASE_API_URL}/static-translations/system/version`);
    const { version } = await response.json();
    cachedVersion = version;
    return version;
  } catch (error) {
    console.warn('Failed to fetch translation version:', error);
    return Date.now().toString();
  }
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'fr', // Default to French for Swiss market
    fallbackLng: {
      'fr-CH': ['fr', 'en'],
      'de-CH': ['de', 'en'],
      default: ['en'],
    },
    supportedLngs: ['en', 'fr', 'de'],
    ns: nsArray, // Auto-discovered namespaces
    defaultNS: 'common',
    backend: {
      loadPath: `${BASE_API_URL}/static-translations/{{lng}}/{{ns}}`,
      // Custom request function with production/development modes
      // Production: Use bundled JSON files (fast, no API dependency)
      // Development: Fetch from API (always get latest from database)
      request: async (options: unknown, url: string, payload: unknown, callback: (err: unknown, result: { status: number; data: unknown }) => void) => {
        const match = url.match(/\/static-translations\/([^/]+)\/([^/]+)/);
        const [, lng, ns] = match || [];
        
        if (!lng || !ns) {
          return callback(null, { status: 404, data: {} });
        }

        // Helper to get bundled translations
        const getBundledTranslations = () => {
          const bundled = fallbackResources[lng]?.[ns];
          return bundled ? stripPrefixes(bundled) : null;
        };

        // PRODUCTION MODE: Use bundled translations directly (faster, no API calls)
        if (USE_BUNDLED_TRANSLATIONS) {
          const bundled = getBundledTranslations();
          if (bundled) {
            callback(null, { status: 200, data: bundled });
            return;
          }
          // If not in bundle, try dynamic import
          try {
            const module = await import(`../packages/translations/locales/${lng}/${ns}.json`);
            const data = stripPrefixes(module.default || module);
            callback(null, { status: 200, data });
          } catch (e) {
            console.warn(`No bundled translation for ${lng}/${ns}`);
            callback(null, { status: 200, data: {} });
          }
          return;
        }

        // DEVELOPMENT MODE: Fetch from API to get latest translations
        try {
          const version = await getVersion();
          const urlWithVersion = url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;

          const response = await fetch(urlWithVersion, {
            headers: { Accept: 'application/json' },
            cache: 'force-cache',
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          let data = await response.json();
          data = stripPrefixes(data);

          // Cache in IndexedDB for offline use
          const etag = response.headers.get('ETag');
          await IndexedDBBackend.save(lng, ns, data, etag || '');

          callback(null, { status: 200, data });
        } catch (error) {
          console.warn(`Failed to load translation ${lng}/${ns}:`, error);

          // Fallback to bundled translations
          const bundled = getBundledTranslations();
          if (bundled) {
            callback(null, { status: 200, data: bundled });
          } else {
            try {
              const module = await import(`../packages/translations/locales/${lng}/${ns}.json`);
              const data = stripPrefixes(module.default || module);
              callback(null, { status: 200, data });
            } catch (e) {
              callback(null, { status: 200, data: {} });
            }
          }
        }
      },
    },
    interpolation: {
      escapeValue: false,
      format: (value: unknown, format: string | undefined, lng: string | undefined) => {
        // ICU formatting for dates, numbers, currency
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'CHF',
          }).format(value as number);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value as string));
        }
        if (format === 'number') {
          return new Intl.NumberFormat(lng).format(value as number);
        }
        return value as string;
      },
    },
    react: {
      useSuspense: false, // Disable suspense to allow immediate rendering with fallback resources
    },
    // Performance optimizations
    updateMissing: false,
    saveMissing: false, // Disabled in production - use admin UI instead
    // Log missing keys in development
    missingKeyHandler: import.meta.env.DEV 
      ? (lngs, ns, key) => {
          console.warn(`⚠️ Missing translation key: ${ns}:${key} [${lngs.join(', ')}]`);
        }
      : undefined,
  });

// Preload critical namespaces for all languages on app init
export const preloadCriticalNamespaces = async () => {
  const languages = ['en', 'fr', 'de'];
  
  try {
    // Preload default namespaces for all supported languages
    await i18n.loadLanguages(languages);
  } catch (err) {
    console.warn('Failed to preload languages:', err);
  }
};

// Preload all namespaces for a specific language (for immediate switching)
export const preloadLanguage = async (lng: string) => {
  try {
    await i18n.loadLanguages(lng);
  } catch (err) {
    console.warn(`Failed to preload language ${lng}:`, err);
  }
};

export default i18n;
