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
      top: '10px', 
      right: '10px', 
      width: '400px',
      maxHeight: '500px',
      background: 'white', 
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 9999,
      overflow: 'auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      fontSize: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>🔍 i18n Debug</h3>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Refresh
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {debugInfo.isInitialized ? '✅ Ready' : '⏳ Loading...'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Language:</strong> {debugInfo.language}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Resource Bundle:</strong> {debugInfo.hasResourceBundle ? '✅ Loaded' : '❌ Missing'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Test Translations:</strong>
        <div style={{ marginLeft: '10px', fontSize: '11px' }}>
          <div>appName: <span style={{ color: debugInfo.testTranslation === 'appName' ? 'red' : 'green' }}>{debugInfo.testTranslation}</span></div>
          <div>loginPage.title: <span style={{ color: debugInfo.testLoginTitle === 'loginPage.title' ? 'red' : 'green' }}>{debugInfo.testLoginTitle}</span></div>
          <div>loginPage.subtitle: <span style={{ color: debugInfo.testLoginSubtitle === 'loginPage.subtitle' ? 'red' : 'green' }}>{debugInfo.testLoginSubtitle}</span></div>
        </div>
      </div>
      
      <details style={{ marginTop: '10px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full Debug Info</summary>
        <pre style={{ fontSize: '10px', marginTop: '5px', background: '#f5f5f5', padding: '5px', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default DebugI18n;