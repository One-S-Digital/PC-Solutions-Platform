import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DebugI18n: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [visibleStrings, setVisibleStrings] = useState<string[]>([]);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [hardcodedText, setHardcodedText] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanVisibleStrings = () => {
    setIsScanning(true);
    const strings: string[] = [];
    const missing: string[] = [];
    const hardcoded: string[] = [];

    // Get all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim();
          if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
          // Skip script and style content
          if (node.parentElement?.tagName === 'SCRIPT' || 
              node.parentElement?.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip debug component content
          if (node.parentElement?.closest('[data-debug-component]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2 && text.length < 100) {
        strings.push(text);
        
        // Check if this looks like a translation key (contains dots or is camelCase)
        if (text.includes('.') || /^[a-z][a-zA-Z]*$/.test(text)) {
          // Test if it's a missing translation key
          const testResult = t(text);
          if (testResult === text) {
            missing.push(text);
          }
        } else if (!text.includes(' ') && text.length > 3 && text.length < 50) {
          // Check if it might be a hardcoded string that should be translated
          const testResult = t(text);
          if (testResult === text && !text.match(/^[A-Z][a-z]+[A-Z][a-z]+/)) {
            hardcoded.push(text);
          }
        }
      }
    }

    setVisibleStrings(strings);
    setMissingKeys(missing);
    setHardcodedText(hardcoded);
    setIsScanning(false);
  };

  const copyMissingKeys = () => {
    const allMissing = [...missingKeys, ...hardcodedText];
    navigator.clipboard.writeText(allMissing.join('\n'));
    alert('Missing keys copied to clipboard!');
  };

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

  useEffect(() => {
    // Scan for visible strings when component mounts and periodically
    scanVisibleStrings();
    
    const interval = setInterval(scanVisibleStrings, 3000);
    return () => clearInterval(interval);
  }, [t]);

  return (
    <div 
      data-debug-component
      style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        width: '450px',
        maxHeight: '600px',
        background: 'white', 
        border: '2px solid #ccc',
        borderRadius: '8px',
        padding: '15px',
        zIndex: 9999,
        overflow: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>🔍 Translation Scanner</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={scanVisibleStrings}
            disabled={isScanning}
            style={{ 
              background: isScanning ? '#ccc' : '#007bff', 
              color: 'white', 
              border: 'none', 
              padding: '5px 10px', 
              borderRadius: '4px',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              fontSize: '11px'
            }}
          >
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              background: '#28a745', 
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
        <strong>Missing Translation Keys:</strong> 
        <span style={{ color: 'red', fontWeight: 'bold' }}> {missingKeys.length}</span>
        {missingKeys.length > 0 && (
          <button 
            onClick={copyMissingKeys}
            style={{ 
              background: '#dc3545', 
              color: 'white', 
              border: 'none', 
              padding: '2px 6px', 
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
              marginLeft: '5px'
            }}
          >
            Copy All
          </button>
        )}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Hardcoded Text:</strong> 
        <span style={{ color: 'orange', fontWeight: 'bold' }}> {hardcodedText.length}</span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Total Visible Strings:</strong> 
        <span style={{ color: 'blue', fontWeight: 'bold' }}> {visibleStrings.length}</span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Test Translations:</strong>
        <div style={{ marginLeft: '10px', fontSize: '11px' }}>
          <div>appName: <span style={{ color: debugInfo.testTranslation === 'appName' ? 'red' : 'green' }}>{debugInfo.testTranslation}</span></div>
          <div>loginPage.title: <span style={{ color: debugInfo.testLoginTitle === 'loginPage.title' ? 'red' : 'green' }}>{debugInfo.testLoginTitle}</span></div>
          <div>loginPage.subtitle: <span style={{ color: debugInfo.testLoginSubtitle === 'loginPage.subtitle' ? 'red' : 'green' }}>{debugInfo.testLoginSubtitle}</span></div>
        </div>
      </div>

      {missingKeys.length > 0 && (
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'red' }}>
            Missing Keys ({missingKeys.length})
          </summary>
          <div style={{ fontSize: '10px', marginTop: '5px', background: '#ffe6e6', padding: '5px', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
            {missingKeys.map((key, index) => (
              <div key={index} style={{ marginBottom: '2px', fontFamily: 'monospace' }}>{key}</div>
            ))}
          </div>
        </details>
      )}

      {hardcodedText.length > 0 && (
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'orange' }}>
            Hardcoded Text ({hardcodedText.length})
          </summary>
          <div style={{ fontSize: '10px', marginTop: '5px', background: '#fff3cd', padding: '5px', borderRadius: '4px', maxHeight: '150px', overflow: 'auto' }}>
            {hardcodedText.map((text, index) => (
              <div key={index} style={{ marginBottom: '2px', fontFamily: 'monospace' }}>{text}</div>
            ))}
          </div>
        </details>
      )}
      
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