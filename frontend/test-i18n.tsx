import React from 'react';
import { useTranslation } from 'react-i18next';

const TestI18n = () => {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    console.log('🌍 TestI18n component mounted');
    console.log('🌍 Current language:', i18n.language);
    console.log('🌍 Is ready:', i18n.isInitialized);
    console.log('🌍 Has resource bundle:', i18n.hasResourceBundle(i18n.language, 'translation'));
    
    // Test some basic translations
    const testKeys = ['appName', 'buttons.login', 'sidebar.dashboard'];
    testKeys.forEach(key => {
      const result = t(key);
      console.log(`🌍 Test translation ${key}:`, result);
    });
  }, [i18n, t]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>i18n Test Component</h2>
      <p><strong>App Name:</strong> {t('appName')}</p>
      <p><strong>Login Button:</strong> {t('buttons.login')}</p>
      <p><strong>Dashboard Sidebar:</strong> {t('sidebar.dashboard')}</p>
      <p><strong>Current Language:</strong> {i18n.language}</p>
      <p><strong>Is Initialized:</strong> {i18n.isInitialized ? 'Yes' : 'No'}</p>
      <p><strong>Has Resource Bundle:</strong> {i18n.hasResourceBundle(i18n.language, 'translation') ? 'Yes' : 'No'}</p>
    </div>
  );
};

export default TestI18n;