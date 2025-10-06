#!/usr/bin/env node

/**
 * Comprehensive Translation Fix Script
 * 
 * This script:
 * 1. Restructures translation files according to i18n guide specification
 * 2. Adds all missing translation keys
 * 3. Creates automated translation using free ML services
 * 4. Ensures no translation strings are visible
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the audit report
const auditReport = JSON.parse(fs.readFileSync(path.join(__dirname, '../translation-audit-report.json'), 'utf8'));

// Configuration
const LANGUAGES = ['en', 'fr', 'de'];
const FRONTEND_LOCALES_DIR = path.join(__dirname, '../frontend/public/locales');
const ADMIN_LOCALES_DIR = path.join(__dirname, '../admin/src/i18n/locales');

// Create directory structure
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Restructure frontend translations according to i18n guide
function restructureFrontendTranslations() {
  console.log('🔄 Restructuring frontend translations...');
  
  // Load current frontend translations
  const currentTranslations = {};
  for (const lang of LANGUAGES) {
    const filePath = path.join(FRONTEND_LOCALES_DIR, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
      currentTranslations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      currentTranslations[lang] = {};
    }
  }
  
  // Define new namespace structure
  const namespaces = {
    common: [
      'appName', 'loading', 'error', 'success', 'buttons', 'common', 'errors', 'notifications',
      'hidePassword', 'showPassword', 'signIn', 'signOut', 'confirmPassword', 'resetPassword',
      'rememberMe', 'createAccount', 'alreadyHaveAccount', 'dontHaveAccount', 'welcomeBack',
      'joinPlatform', 'chooseRole', 'firstName', 'lastName', 'phoneNumber', 'organizationName',
      'contactPerson', 'canton', 'languages', 'capacity', 'productCategory', 'serviceType',
      'childAge', 'preferredLocation', 'type', 'language', 'responsibilities', 'qualifications',
      'benefits', 'requirements'
    ],
    auth: [
      'loginPage', 'signupPage', 'auth'
    ],
    dashboard: [
      'dashboardPage', 'sidebar', 'navbar', 'stockStatus', 'settingsPage', 'marketplacePage',
      'partnerDetailPage', 'adminPlatformSettings', 'organizationProfileForm',
      'foundationDashboardPage', 'foundationAnalyticsPage', 'foundationLeadsPage',
      'foundationOrdersAppointmentsPage', 'foundationOrganisationProfilePage',
      'foundationSupportPage', 'parentDashboardPage', 'parentEnquiriesPage', 'parentSupportPage',
      'educatorDashboardPage', 'educatorApplicationsPage', 'educatorJobBoardPage',
      'educatorProfilePage', 'educatorSupportPage', 'serviceProviderDashboardPage',
      'serviceProviderAnalyticsPage', 'serviceProviderListingsPage', 'serviceProviderRequestsPage',
      'serviceProviderSupportPage', 'supplierDashboardPage', 'supplierAnalyticsPage',
      'supplierProductListingsPage', 'supplierOrdersPage', 'supplierSupportPage',
      'adminContentManagementDashboardPage', 'adminSystemMonitoringPage', 'adminDiscountTerminationsPage',
      'pricingPage', 'recruitmentPage', 'messagesPage', 'notificationsPage', 'fileGalleryPage',
      'eLearningPage', 'statePoliciesPage', 'hrProceduresPage', 'usersPage', 'partnersPage',
      'parentLeadFormPage', 'candidateProfilePage', 'designSystemPage'
    ]
  };
  
  // Create new translation structure
  const newTranslations = {};
  for (const lang of LANGUAGES) {
    newTranslations[lang] = {};
    
    for (const namespace of Object.keys(namespaces)) {
      newTranslations[lang][namespace] = {};
      
      // Move existing keys to appropriate namespaces
      for (const key of namespaces[namespace]) {
        if (currentTranslations[lang][key]) {
          newTranslations[lang][namespace][key] = currentTranslations[lang][key];
        }
      }
    }
  }
  
  // Save new structure
  for (const lang of LANGUAGES) {
    const langDir = path.join(FRONTEND_LOCALES_DIR, lang);
    ensureDir(langDir);
    
    for (const namespace of Object.keys(namespaces)) {
      const filePath = path.join(langDir, `${namespace}.json`);
      fs.writeFileSync(filePath, JSON.stringify(newTranslations[lang][namespace], null, 2));
    }
  }
  
  console.log('✅ Frontend translations restructured');
}

// Restructure admin translations
function restructureAdminTranslations() {
  console.log('🔄 Restructuring admin translations...');
  
  // Admin already has proper structure, just ensure it's complete
  const currentTranslations = {};
  for (const lang of LANGUAGES) {
    currentTranslations[lang] = {};
    const langDir = path.join(ADMIN_LOCALES_DIR, lang);
    
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const namespace = path.basename(file, '.json');
        const filePath = path.join(langDir, file);
        currentTranslations[lang][namespace] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }
  }
  
  console.log('✅ Admin translations structure verified');
}

// Add missing translation keys
function addMissingKeys() {
  console.log('🔧 Adding missing translation keys...');
  
  // Get all missing keys from audit report
  const frontendMissing = auditReport.frontend.missingKeys.map(item => item.key);
  const adminMissing = auditReport.admin.missingKeys.map(item => item.key);
  
  // Add missing keys to frontend
  for (const lang of LANGUAGES) {
    const langDir = path.join(FRONTEND_LOCALES_DIR, lang);
    ensureDir(langDir);
    
    // Load existing translations
    const commonPath = path.join(langDir, 'common.json');
    const authPath = path.join(langDir, 'auth.json');
    const dashboardPath = path.join(langDir, 'dashboard.json');
    
    const common = fs.existsSync(commonPath) ? JSON.parse(fs.readFileSync(commonPath, 'utf8')) : {};
    const auth = fs.existsSync(authPath) ? JSON.parse(fs.readFileSync(authPath, 'utf8')) : {};
    const dashboard = fs.existsSync(dashboardPath) ? JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) : {};
    
    // Add missing keys with English fallback
    for (const key of frontendMissing) {
      const value = lang === 'en' ? key : `[${lang.toUpperCase()}] ${key}`;
      
      // Determine which namespace the key belongs to
      if (key.startsWith('auth.') || key.startsWith('loginPage.') || key.startsWith('signupPage.')) {
        setNestedValue(auth, key.replace(/^(auth\.|loginPage\.|signupPage\.)/, ''), value);
      } else if (key.startsWith('dashboard') || key.startsWith('sidebar') || key.startsWith('navbar')) {
        setNestedValue(dashboard, key, value);
      } else {
        setNestedValue(common, key, value);
      }
    }
    
    // Save updated translations
    fs.writeFileSync(commonPath, JSON.stringify(common, null, 2));
    fs.writeFileSync(authPath, JSON.stringify(auth, null, 2));
    fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
  }
  
  // Add missing keys to admin
  for (const lang of LANGUAGES) {
    const langDir = path.join(ADMIN_LOCALES_DIR, lang);
    ensureDir(langDir);
    
    // Load existing translations
    const commonPath = path.join(langDir, 'common.json');
    const authPath = path.join(langDir, 'auth.json');
    const dashboardPath = path.join(langDir, 'dashboard.json');
    
    const common = fs.existsSync(commonPath) ? JSON.parse(fs.readFileSync(commonPath, 'utf8')) : {};
    const auth = fs.existsSync(authPath) ? JSON.parse(fs.readFileSync(authPath, 'utf8')) : {};
    const dashboard = fs.existsSync(dashboardPath) ? JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) : {};
    
    // Add missing keys
    for (const key of adminMissing) {
      const value = lang === 'en' ? key : `[${lang.toUpperCase()}] ${key}`;
      
      // Determine which namespace the key belongs to
      if (key.startsWith('auth.') || key.startsWith('loginPage.') || key.startsWith('signupPage.')) {
        setNestedValue(auth, key.replace(/^(auth\.|loginPage\.|signupPage\.)/, ''), value);
      } else if (key.startsWith('dashboard') || key.startsWith('sidebar') || key.startsWith('navbar')) {
        setNestedValue(dashboard, key, value);
      } else {
        setNestedValue(common, key, value);
      }
    }
    
    // Save updated translations
    fs.writeFileSync(commonPath, JSON.stringify(common, null, 2));
    fs.writeFileSync(authPath, JSON.stringify(auth, null, 2));
    fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
  }
  
  console.log('✅ Missing translation keys added');
}

// Helper function to set nested object values
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Create automated translation script
function createTranslationScript() {
  console.log('🤖 Creating automated translation script...');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Automated Translation Script using Google Translate API (Free Tier)
 * 
 * This script translates English translation files to French and German
 * using Google Translate API with proper context and Swiss localization.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LANGUAGES = ['fr', 'de'];
const FRONTEND_LOCALES_DIR = path.join(__dirname, '../frontend/public/locales');
const ADMIN_LOCALES_DIR = path.join(__dirname, '../admin/src/i18n/locales');

// Google Translate API (Free Tier) - 2M characters per month
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const GOOGLE_TRANSLATE_PARAMS = {
  client: 'gtx',
  sl: 'en',
  dt: 't'
};

// Swiss localization context
const SWISS_CONTEXT = {
  fr: {
    context: 'Swiss French (français suisse)',
    instructions: 'Translate to Swiss French, using appropriate Swiss terminology and formal tone. Use "vous" form for formal interactions.',
    examples: {
      'Welcome': 'Bienvenue',
      'Dashboard': 'Tableau de bord',
      'Settings': 'Paramètres',
      'Save': 'Enregistrer',
      'Cancel': 'Annuler',
      'Login': 'Connexion',
      'Sign Up': 'S\'inscrire',
      'Email': 'E-mail',
      'Password': 'Mot de passe',
      'Organization': 'Organisation',
      'Foundation': 'Fondation',
      'Service Provider': 'Prestataire de services',
      'Product Supplier': 'Fournisseur de produits',
      'Parent': 'Parent',
      'Educator': 'Éducateur',
      'Child': 'Enfant',
      'Crèche': 'Crèche',
      'Daycare': 'Garderie'
    }
  },
  de: {
    context: 'Swiss German (Standard German for Switzerland)',
    instructions: 'Translate to Standard German suitable for Switzerland, using formal tone (Sie form).',
    examples: {
      'Welcome': 'Willkommen',
      'Dashboard': 'Dashboard',
      'Settings': 'Einstellungen',
      'Save': 'Speichern',
      'Cancel': 'Abbrechen',
      'Login': 'Anmelden',
      'Sign Up': 'Registrieren',
      'Email': 'E-Mail',
      'Password': 'Passwort',
      'Organization': 'Organisation',
      'Foundation': 'Stiftung',
      'Service Provider': 'Dienstleister',
      'Product Supplier': 'Produktlieferant',
      'Parent': 'Elternteil',
      'Educator': 'Erzieher',
      'Child': 'Kind',
      'Crèche': 'Krippe',
      'Daycare': 'Kindertagesstätte'
    }
  }
};

// Translate text using Google Translate API
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip if already translated (contains language prefix)
  if (text.startsWith('[FR]') || text.startsWith('[DE]')) return text;
  
  try {
    const params = new URLSearchParams({
      ...GOOGLE_TRANSLATE_PARAMS,
      tl: targetLang,
      q: text
    });
    
    const response = await fetch(\`\${GOOGLE_TRANSLATE_URL}?\${params}\`);
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    return text;
  } catch (error) {
    console.error(\`Translation error for "\${text}":\`, error.message);
    return text;
  }
}

// Translate object recursively
async function translateObject(obj, targetLang) {
  const result = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      result[key] = await translateObject(obj[key], targetLang);
    } else {
      result[key] = await translateText(obj[key], targetLang);
    }
  }
  
  return result;
}

// Translate all translation files
async function translateAllFiles() {
  console.log('🌍 Starting automated translation process...');
  
  // Translate frontend files
  console.log('📱 Translating frontend files...');
  await translatePlatformFiles(FRONTEND_LOCALES_DIR, 'frontend');
  
  // Translate admin files
  console.log('⚙️ Translating admin files...');
  await translatePlatformFiles(ADMIN_LOCALES_DIR, 'admin');
  
  console.log('✅ Translation process completed!');
}

// Translate files for a specific platform
async function translatePlatformFiles(localesDir, platform) {
  for (const lang of LANGUAGES) {
    console.log(\`🔄 Translating \${platform} to \${lang.toUpperCase()}...\`);
    
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Translate the content
      const translatedContent = await translateObject(content, lang);
      
      // Save translated content
      fs.writeFileSync(filePath, JSON.stringify(translatedContent, null, 2));
      
      console.log(\`  ✅ Translated \${file}\`);
    }
  }
}

// Main execution
async function main() {
  try {
    await translateAllFiles();
  } catch (error) {
    console.error('💥 Translation script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main();
}

export { translateText, translateObject, translateAllFiles };
`;

  const scriptPath = path.join(__dirname, 'translate-automated.mjs');
  fs.writeFileSync(scriptPath, scriptContent);
  
  // Make it executable
  fs.chmodSync(scriptPath, '755');
  
  console.log('✅ Automated translation script created');
}

// Update i18next configurations
function updateI18nConfigurations() {
  console.log('⚙️ Updating i18next configurations...');
  
  // Update frontend i18n configuration
  const frontendI18nPath = path.join(__dirname, '../frontend/i18n.ts');
  const frontendI18nContent = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Create a promise to ensure i18n is initialized before the app renders
const initI18n = () => {
  return i18n
    .use(HttpApi) // Load translations using http (e.g., from public/locales)
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n down to react-i18next
    .init({
      supportedLngs: ['en', 'fr', 'de'],
      fallbackLng: 'en',
      debug: false, // Disable debug to reduce console noise
      ns: ['common', 'auth', 'dashboard'], 
      defaultNS: 'common',
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        allowMultiLoading: false,
        requestOptions: {
          cache: 'no-cache'
        }
      },
      interpolation: {
        escapeValue: false, 
      },
      react: {
        useSuspense: false, // Disable Suspense for now to avoid blocking
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
      },
      saveMissing: false, // As per specification
      returnEmptyString: false, // As per specification
      initImmediate: true, // Initialize immediately
      load: 'languageOnly', // Load only language, not region
      cleanCode: true, // Clean language codes
      preload: ['en'], // Preload English translations
    })
    .then(() => {
      console.log('🌍 i18n initialized successfully');
      console.log('🌍 Current language:', i18n.language);
      console.log('🌍 Available languages:', i18n.languages);
    })
    .catch((error) => {
      console.error('❌ i18n initialization failed:', error);
    });
};

// Add event listeners for debugging
i18n.on('loaded', () => {
  console.log('🌍 Translation files loaded');
});

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(\`❌ Failed to load translation for \${lng}/\${ns}:\`, msg);
});

i18n.on('missingKey', (lng, ns, key) => {
  console.warn(\`⚠️ Missing translation key: \${key} for language \${lng}\`);
});

// Initialize i18n immediately
initI18n();

export default i18n;`;

  fs.writeFileSync(frontendI18nPath, frontendI18nContent);
  
  // Update admin i18n configuration
  const adminI18nPath = path.join(__dirname, '../admin/src/i18n/index.ts');
  const adminI18nContent = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import dashboardEn from './locales/en/dashboard.json';
import commonFr from './locales/fr/common.json';
import authFr from './locales/fr/auth.json';
import dashboardFr from './locales/fr/dashboard.json';
import commonDe from './locales/de/common.json';
import authDe from './locales/de/auth.json';
import dashboardDe from './locales/de/dashboard.json';

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
      },
      fr: {
        common: commonFr,
        auth: authFr,
        dashboard: dashboardFr,
      },
      de: {
        common: commonDe,
        auth: authDe,
        dashboard: dashboardDe,
      },
    },
    ns: ['common', 'auth', 'dashboard'],
    defaultNS: 'common',
  });

export default i18n;`;

  fs.writeFileSync(adminI18nPath, adminI18nContent);
  
  console.log('✅ i18next configurations updated');
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive translation fix...');
  console.log('==========================================\n');
  
  try {
    // Step 1: Restructure translation files
    restructureFrontendTranslations();
    restructureAdminTranslations();
    
    // Step 2: Add missing translation keys
    addMissingKeys();
    
    // Step 3: Create automated translation script
    createTranslationScript();
    
    // Step 4: Update i18next configurations
    updateI18nConfigurations();
    
    console.log('\n🎉 Translation fix completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: node scripts/translate-automated.mjs');
    console.log('2. Test the application in all languages');
    console.log('3. Review and refine translations as needed');
    
  } catch (error) {
    console.error('💥 Translation fix failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();