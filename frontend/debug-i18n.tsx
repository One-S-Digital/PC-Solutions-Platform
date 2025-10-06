import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DebugI18n: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkI18n = () => {
      const info = {
        isInitialized: i18n.isInitialized,
        language: i18n.language,
        languages: i18n.languages,
        hasResourceBundle: i18n.hasResourceBundle(i18n.language, 'translation'),
        resourceBundle: i18n.getResourceBundle(i18n.language, 'translation'),
        testTranslation: t('appName'),
        testLoginTitle: t('loginPage.title'),
        testLoginSubtitle: t('loginPage.subtitle'),
      };
      setDebugInfo(info);
      console.log('🔍 i18n Debug Info:', info);
    };

    checkI18n();
    
    // Check again after a delay
    setTimeout(checkI18n, 1000);
    setTimeout(checkI18n, 3000);
  }, [i18n, t]);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'white', 
      padding: '20px',
      zIndex: 9999,
      overflow: 'auto'
    }}>
      <h1>i18n Debug Information</h1>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      
      <h2>Test Translations:</h2>
      <p><strong>appName:</strong> {t('appName')}</p>
      <p><strong>loginPage.title:</strong> {t('loginPage.title')}</p>
      <p><strong>loginPage.subtitle:</strong> {t('loginPage.subtitle')}</p>
      <p><strong>buttons.login:</strong> {t('buttons.login')}</p>
      
      <h2>Raw Translation Test:</h2>
      <p>Testing direct translation calls...</p>
    </div>
  );
};

export default DebugI18n;