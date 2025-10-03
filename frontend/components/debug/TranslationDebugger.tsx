import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface TranslationDebuggerProps {
  enabled?: boolean;
}

const TranslationDebugger: React.FC<TranslationDebuggerProps> = ({ enabled = true }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateDebugInfo = () => {
      const info = {
        // i18n instance info
        isInitialized: i18nInstance.isInitialized,
        language: i18nInstance.language,
        languages: i18nInstance.languages,
        hasResourceBundle: i18nInstance.hasResourceBundle(i18nInstance.language, 'translation'),
        
        // Resource bundle info
        resourceBundle: i18nInstance.getResourceBundle(i18nInstance.language, 'translation'),
        
        // Translation test
        testTranslation: t('appName'),
        testTranslationKey: t('appName', 'FALLBACK'),
        
        // Missing keys test
        missingKeys: [],
        
        // Store info
        store: i18nInstance.store,
        
        // Services info
        services: {
          backend: i18nInstance.services?.backend,
          languageDetector: i18nInstance.services?.languageDetector,
        },
        
        // Events
        events: i18nInstance.events,
        
        // Options
        options: i18nInstance.options,
      };

      // Check for missing keys by testing common ones
      const commonKeys = [
        'appName',
        'languageSwitcher.enShort',
        'languageSwitcher.selectLanguage',
        'buttons.login',
        'navbar.login',
        'sidebar.dashboard',
        'stockStatus.instock'
      ];

      commonKeys.forEach(key => {
        const translation = t(key);
        if (translation === key) {
          info.missingKeys.push(key);
        }
      });

      setDebugInfo(info);
    };

    // Initial update
    updateDebugInfo();

    // Listen for language changes
    const handleLanguageChanged = () => {
      setTimeout(updateDebugInfo, 100); // Small delay to ensure resources are loaded
    };

    i18nInstance.on('languageChanged', handleLanguageChanged);
    i18nInstance.on('loaded', handleLanguageChanged);
    i18nInstance.on('initialized', handleLanguageChanged);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChanged);
      i18nInstance.off('loaded', handleLanguageChanged);
      i18nInstance.off('initialized', handleLanguageChanged);
    };
  }, [enabled, t, i18nInstance]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-500 text-white px-3 py-2 rounded text-sm font-mono"
      >
        🐛 Debug ({isVisible ? 'Hide' : 'Show'})
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto">
          <div className="text-xs font-mono space-y-2">
            <div className="font-bold text-red-600">Translation Debug Info</div>
            
            <div>
              <strong>Status:</strong>
              <div className="ml-2">
                <div>Initialized: {debugInfo.isInitialized ? '✅' : '❌'}</div>
                <div>Language: {debugInfo.language}</div>
                <div>Languages: {debugInfo.languages?.join(', ')}</div>
                <div>Has Bundle: {debugInfo.hasResourceBundle ? '✅' : '❌'}</div>
              </div>
            </div>

            <div>
              <strong>Test Translation:</strong>
              <div className="ml-2">
                <div>appName: "{debugInfo.testTranslation}"</div>
                <div>Fallback: "{debugInfo.testTranslationKey}"</div>
              </div>
            </div>

            {debugInfo.missingKeys && debugInfo.missingKeys.length > 0 && (
              <div>
                <strong className="text-red-600">Missing Keys:</strong>
                <div className="ml-2">
                  {debugInfo.missingKeys.map((key: string) => (
                    <div key={key} className="text-red-600">❌ {key}</div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <strong>Resource Bundle Keys:</strong>
              <div className="ml-2 text-xs">
                {debugInfo.resourceBundle ? 
                  Object.keys(debugInfo.resourceBundle).slice(0, 10).join(', ') + 
                  (Object.keys(debugInfo.resourceBundle).length > 10 ? '...' : '') :
                  'No bundle'
                }
              </div>
            </div>

            <div>
              <strong>Backend Status:</strong>
              <div className="ml-2">
                <div>Backend: {debugInfo.services?.backend ? '✅' : '❌'}</div>
                <div>Detector: {debugInfo.services?.languageDetector ? '✅' : '❌'}</div>
              </div>
            </div>

            <div>
              <strong>Options:</strong>
              <div className="ml-2 text-xs">
                <div>Debug: {debugInfo.options?.debug ? 'ON' : 'OFF'}</div>
                <div>Suspense: {debugInfo.options?.react?.useSuspense ? 'ON' : 'OFF'}</div>
                <div>Fallback: {debugInfo.options?.fallbackLng}</div>
              </div>
            </div>

            <button
              onClick={() => {
                console.log('Full Debug Info:', debugInfo);
                console.log('i18n Instance:', i18nInstance);
                console.log('Translation Files:', debugInfo.resourceBundle);
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs mt-2"
            >
              Log to Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationDebugger;