import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface TranslationDiagnosticsProps {
  enabled?: boolean;
}

interface DiagnosticInfo {
  // Basic i18n status
  isInitialized: boolean;
  currentLanguage: string;
  availableLanguages: string[];
  hasResourceBundle: boolean;
  
  // Translation file loading
  translationFiles: {
    en: { loaded: boolean; url: string; status: string; content?: any };
    fr: { loaded: boolean; url: string; status: string; content?: any };
    de: { loaded: boolean; url: string; status: string; content?: any };
  };
  
  // Missing keys detection
  missingKeys: string[];
  problematicKeys: Array<{ key: string; returned: string; expected: string }>;
  
  // Network and loading issues
  networkErrors: string[];
  loadingErrors: string[];
  
  // Configuration
  config: any;
  
  // Test translations
  testTranslations: Array<{ key: string; result: string; isWorking: boolean }>;
}

const TranslationDiagnostics: React.FC<TranslationDiagnosticsProps> = ({ enabled = true }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkTranslationFiles = async () => {
    const files = {
      en: { loaded: false, url: '/locales/en/translation.json', status: 'unknown', content: null },
      fr: { loaded: false, url: '/locales/fr/translation.json', status: 'unknown', content: null },
      de: { loaded: false, url: '/locales/de/translation.json', status: 'unknown', content: null },
    };

    for (const [lang, file] of Object.entries(files)) {
      try {
        const response = await fetch(file.url);
        if (response.ok) {
          const content = await response.json();
          file.loaded = true;
          file.status = 'loaded';
          file.content = content;
        } else {
          file.status = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        file.status = `Error: ${error.message}`;
      }
    }

    return files;
  };

  const detectMissingKeys = () => {
    const missingKeys: string[] = [];
    const problematicKeys: Array<{ key: string; returned: string; expected: string }> = [];
    
    // Common keys that should exist
    const commonKeys = [
      'appName',
      'buttons.login',
      'buttons.signup',
      'sidebar.dashboard',
      'sidebar.marketplace',
      'dashboardPage.welcome',
      'dashboardPage.activeUsers',
      'settingsPage.title',
      'notifications.successTitle',
      'loginPage.title',
      'loginPage.subtitle',
      'errors.unknown'
    ];

    commonKeys.forEach(key => {
      const result = t(key);
      if (result === key) {
        missingKeys.push(key);
      } else if (result.includes('translation')) {
        problematicKeys.push({
          key,
          returned: result,
          expected: 'Actual translated text'
        });
      }
    });

    return { missingKeys, problematicKeys };
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    
    try {
      // Wait a bit for i18n to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const translationFiles = await checkTranslationFiles();
      const { missingKeys, problematicKeys } = detectMissingKeys();
      
      // Test specific translations
      const testTranslations = [
        { key: 'appName', result: t('appName'), isWorking: t('appName') !== 'appName' },
        { key: 'buttons.login', result: t('buttons.login'), isWorking: t('buttons.login') !== 'buttons.login' },
        { key: 'dashboardPage.welcome', result: t('dashboardPage.welcome'), isWorking: t('dashboardPage.welcome') !== 'dashboardPage.welcome' },
        { key: 'sidebar.dashboard', result: t('sidebar.dashboard'), isWorking: t('sidebar.dashboard') !== 'sidebar.dashboard' },
        { key: 'settingsPage.title', result: t('settingsPage.title'), isWorking: t('settingsPage.title') !== 'settingsPage.title' },
      ];

      const diagnostics: DiagnosticInfo = {
        isInitialized: i18nInstance.isInitialized,
        currentLanguage: i18nInstance.language,
        availableLanguages: i18nInstance.languages,
        hasResourceBundle: i18nInstance.hasResourceBundle(i18nInstance.language, 'translation'),
        translationFiles,
        missingKeys,
        problematicKeys,
        networkErrors: [],
        loadingErrors: [],
        config: {
          debug: i18nInstance.options?.debug,
          fallbackLng: i18nInstance.options?.fallbackLng,
          loadPath: i18nInstance.options?.backend?.loadPath,
          useSuspense: i18nInstance.options?.react?.useSuspense,
          initImmediate: i18nInstance.options?.initImmediate,
        },
        testTranslations,
      };

      setDiagnostics(diagnostics);
    } catch (error) {
      console.error('Diagnostics error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      runDiagnostics();
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-mono shadow-lg"
      >
        🔍 Translation Debug {isVisible ? '▼' : '▶'}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 left-0 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-2xl max-h-96 overflow-auto">
          <div className="text-xs font-mono space-y-4">
            <div className="flex justify-between items-center">
              <div className="font-bold text-purple-600 text-lg">Translation Diagnostics</div>
              <button
                onClick={runDiagnostics}
                disabled={isLoading}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
              >
                {isLoading ? 'Running...' : 'Refresh'}
              </button>
            </div>

            {diagnostics && (
              <>
                {/* Basic Status */}
                <div>
                  <strong className="text-green-600">📊 Basic Status:</strong>
                  <div className="ml-2 space-y-1">
                    <div>Initialized: {diagnostics.isInitialized ? '✅' : '❌'}</div>
                    <div>Language: {diagnostics.currentLanguage}</div>
                    <div>Available: {diagnostics.availableLanguages.join(', ')}</div>
                    <div>Has Bundle: {diagnostics.hasResourceBundle ? '✅' : '❌'}</div>
                  </div>
                </div>

                {/* Translation Files */}
                <div>
                  <strong className="text-blue-600">📁 Translation Files:</strong>
                  <div className="ml-2 space-y-1">
                    {Object.entries(diagnostics.translationFiles).map(([lang, file]) => (
                      <div key={lang} className="flex items-center space-x-2">
                        <span className="w-8">{lang.toUpperCase()}:</span>
                        <span className={file.loaded ? 'text-green-600' : 'text-red-600'}>
                          {file.loaded ? '✅' : '❌'}
                        </span>
                        <span className="text-xs text-gray-600">{file.status}</span>
                        {file.content && (
                          <span className="text-xs text-gray-500">
                            ({Object.keys(file.content).length} keys)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Keys */}
                {diagnostics.missingKeys.length > 0 && (
                  <div>
                    <strong className="text-red-600">❌ Missing Keys ({diagnostics.missingKeys.length}):</strong>
                    <div className="ml-2 max-h-20 overflow-y-auto">
                      {diagnostics.missingKeys.map(key => (
                        <div key={key} className="text-red-600 text-xs">• {key}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Problematic Keys */}
                {diagnostics.problematicKeys.length > 0 && (
                  <div>
                    <strong className="text-orange-600">⚠️ Problematic Keys ({diagnostics.problematicKeys.length}):</strong>
                    <div className="ml-2 max-h-20 overflow-y-auto">
                      {diagnostics.problematicKeys.map(({ key, returned }) => (
                        <div key={key} className="text-orange-600 text-xs">• {key}: "{returned}"</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Translations */}
                <div>
                  <strong className="text-indigo-600">🧪 Test Translations:</strong>
                  <div className="ml-2 space-y-1">
                    {diagnostics.testTranslations.map(({ key, result, isWorking }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <span className={isWorking ? 'text-green-600' : 'text-red-600'}>
                          {isWorking ? '✅' : '❌'}
                        </span>
                        <span className="text-xs">{key}: "{result}"</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <strong className="text-gray-600">⚙️ Configuration:</strong>
                  <div className="ml-2 space-y-1 text-xs">
                    <div>Debug: {diagnostics.config.debug ? 'ON' : 'OFF'}</div>
                    <div>Fallback: {diagnostics.config.fallbackLng}</div>
                    <div>Load Path: {diagnostics.config.loadPath}</div>
                    <div>Suspense: {diagnostics.config.useSuspense ? 'ON' : 'OFF'}</div>
                    <div>Init Immediate: {diagnostics.config.initImmediate ? 'ON' : 'OFF'}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2 border-t">
                  <button
                    onClick={() => {
                      console.log('Full Diagnostics:', diagnostics);
                      console.log('i18n Instance:', i18nInstance);
                      console.log('Resource Bundle:', i18nInstance.getResourceBundle(i18nInstance.language, 'translation'));
                    }}
                    className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Log to Console
                  </button>
                  <button
                    onClick={() => {
                      const missingKeysList = diagnostics.missingKeys.join('\n');
                      navigator.clipboard.writeText(missingKeysList);
                      alert('Missing keys copied to clipboard!');
                    }}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Copy Missing Keys
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationDiagnostics;