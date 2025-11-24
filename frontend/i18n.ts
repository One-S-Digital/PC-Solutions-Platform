import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { IndexedDBBackend } from './i18n/indexeddb-backend';

// Helper function to strip [FR], [DE], [EN] prefixes from translation values
const stripPrefixes = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj.replace(/^\[(FR|DE|EN)\]\s*/i, '').trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(stripPrefixes);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = stripPrefixes(value);
    }
    return result;
  }
  return obj;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Ensure BASE_API_URL includes /api prefix since NestJS uses global prefix
const BASE_API_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

// Fallback translations (for offline support)
// These are still imported from the JSON files as fallback
import commonEn from '@workspace/translations/locales/en/common.json';
import authEn from '@workspace/translations/locales/en/auth.json';
import dashboardEn from '@workspace/translations/locales/en/dashboard.json';
import contentEn from '@workspace/translations/locales/en/content.json';
import recruitmentEn from '@workspace/translations/locales/en/recruitment.json';
import marketplaceEn from '@workspace/translations/locales/en/marketplace.json';
import usersEn from '@workspace/translations/locales/en/users.json';
import adminEn from '@workspace/translations/locales/en/admin.json';
import signupEn from '@workspace/translations/locales/en/signup.json';
import settingsEn from '@workspace/translations/locales/en/settings.json';

import commonFr from '@workspace/translations/locales/fr/common.json';
import authFr from '@workspace/translations/locales/fr/auth.json';
import dashboardFr from '@workspace/translations/locales/fr/dashboard.json';
import contentFr from '@workspace/translations/locales/fr/content.json';
import recruitmentFr from '@workspace/translations/locales/fr/recruitment.json';
import marketplaceFr from '@workspace/translations/locales/fr/marketplace.json';
import usersFr from '@workspace/translations/locales/fr/users.json';
import adminFr from '@workspace/translations/locales/fr/admin.json';
import signupFr from '@workspace/translations/locales/fr/signup.json';
import settingsFr from '@workspace/translations/locales/fr/settings.json';

import commonDe from '@workspace/translations/locales/de/common.json';
import authDe from '@workspace/translations/locales/de/auth.json';
import dashboardDe from '@workspace/translations/locales/de/dashboard.json';
import contentDe from '@workspace/translations/locales/de/content.json';
import recruitmentDe from '@workspace/translations/locales/de/recruitment.json';
import marketplaceDe from '@workspace/translations/locales/de/marketplace.json';
import usersDe from '@workspace/translations/locales/de/users.json';
import adminDe from '@workspace/translations/locales/de/admin.json';
import signupDe from '@workspace/translations/locales/de/signup.json';
import settingsDe from '@workspace/translations/locales/de/settings.json';

// Fallback resources (used when API is unavailable)
// Strip prefixes from all fallback resources before using them
const fallbackResources = {
  en: {
    common: stripPrefixes(commonEn),
    auth: stripPrefixes(authEn),
    dashboard: stripPrefixes(dashboardEn),
    content: stripPrefixes(contentEn),
    recruitment: stripPrefixes(recruitmentEn),
    marketplace: stripPrefixes(marketplaceEn),
    users: stripPrefixes(usersEn),
    admin: stripPrefixes(adminEn),
    signup: stripPrefixes(signupEn),
    settings: stripPrefixes(settingsEn),
  },
  fr: {
    common: stripPrefixes(commonFr),
    auth: stripPrefixes(authFr),
    dashboard: stripPrefixes(dashboardFr),
    content: stripPrefixes(contentFr),
    recruitment: stripPrefixes(recruitmentFr),
    marketplace: stripPrefixes(marketplaceFr),
    users: stripPrefixes(usersFr),
    admin: stripPrefixes(adminFr),
    signup: stripPrefixes(signupFr),
    settings: stripPrefixes(settingsFr),
  },
  de: {
    common: stripPrefixes(commonDe),
    auth: stripPrefixes(authDe),
    dashboard: stripPrefixes(dashboardDe),
    content: stripPrefixes(contentDe),
    recruitment: stripPrefixes(recruitmentDe),
    marketplace: stripPrefixes(marketplaceDe),
    users: stripPrefixes(usersDe),
    admin: stripPrefixes(adminDe),
    signup: stripPrefixes(signupDe),
    settings: stripPrefixes(settingsDe),
  },
};

// Initialize IndexedDB before i18n
IndexedDBBackend.init()
  .then(() => {
    // Clear cache on app start to ensure fresh translations without prefixes
    // This is a one-time clear to remove any old cached data with prefixes
    const cacheVersion = localStorage.getItem('i18n-cache-version');
    const currentVersion = '2.0'; // Increment this when translations structure changes
    
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
    ns: [
      'common',
      'auth',
      'dashboard',
      'settings',
      'billing',
      'elearning',
      'supplier',
      'hr',
      'emails',
      'marketplace',
      'recruitment',
      'users',
      'content',
      'messages',
      'admin',
      'profile',
      'signup',
      'pricing',
      'parentLeadForm',
    ],
    defaultNS: 'common',
    // Add fallback resources immediately so they're available for instant switching
    resources: fallbackResources,
    backend: {
      loadPath: `${BASE_API_URL}/static-translations/{{lng}}/{{ns}}`,
      // Custom request function to add IndexedDB caching and ETag support
      request: async (options: any, url: string, payload: any, callback: any) => {
        const [lng, ns] = url.match(/\/static-translations\/([^/]+)\/([^/]+)/)?.slice(1) || [];
        
        if (!lng || !ns) {
          // Fallback to default HttpBackend behavior
          return callback(null, { status: 404, data: {} });
        }

        try {
          // Try IndexedDB cache first
          const cached = await IndexedDBBackend.read(lng, ns);
          if (cached && !IndexedDBBackend.isStale(cached)) {
            // Data is already cleaned by IndexedDBBackend.read()
            callback(null, { status: 200, data: cached.data });
            return;
          }

          // Add version to URL for cache-busting
          const version = await getVersion();
          const urlWithVersion = url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;

          // Fetch from API with ETag if cached
          const headers: HeadersInit = {
            Accept: 'application/json',
          };
          if (cached?.etag) {
            headers['If-None-Match'] = cached.etag;
          }

          const response = await fetch(urlWithVersion, {
            headers,
            cache: 'force-cache',
          });

          if (response.status === 304) {
            // Not modified, use cached data
            if (cached) {
              await IndexedDBBackend.save(lng, ns, cached.data, cached.etag);
              callback(null, { status: 200, data: cached.data });
            } else {
              callback(null, { status: 304, data: {} });
            }
            return;
          }

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          let data = await response.json();
          const etag = response.headers.get('ETag');

          // Strip prefixes from API data in case database still has some
          data = stripPrefixes(data);

          // Cache in IndexedDB
          await IndexedDBBackend.save(lng, ns, data, etag || '');

          callback(null, { status: 200, data });
        } catch (error) {
          console.warn(`Failed to load translation ${lng}/${ns}:`, error);

          // Fallback to bundled translations
          try {
            let fallback = fallbackResources[lng as keyof typeof fallbackResources]?.[ns as keyof typeof fallbackResources['en']];
            if (!fallback) {
              // Try to import from packages/translations
              try {
                const module = await import(
                  `@workspace/translations/locales/${lng}/${ns}.json`
                );
                fallback = module.default || module;
              } catch (importError) {
                callback(importError, { status: 500, data: {} });
                return;
              }
            }
            
            // Strip prefixes from fallback translations
            if (fallback) {
              const cleanedFallback = stripPrefixes(fallback);
              callback(null, { status: 200, data: cleanedFallback });
            } else {
              callback(null, { status: 200, data: {} });
            }
          } catch (fallbackError) {
            callback(fallbackError, { status: 500, data: {} });
          }
        }
      },
    },
    interpolation: {
      escapeValue: false,
      format: (value: any, format: string, lng: string) => {
        // ICU formatting for dates, numbers, currency
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'CHF',
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value));
        }
        if (format === 'number') {
          return new Intl.NumberFormat(lng).format(value);
        }
        return value;
      },
    },
    react: {
      useSuspense: false, // Disable suspense to allow immediate rendering with fallback resources
    },
    // Performance optimizations
    updateMissing: false,
    saveMissing: false, // Disabled in production - use admin UI instead
    cache: {
      enabled: true,
    },
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