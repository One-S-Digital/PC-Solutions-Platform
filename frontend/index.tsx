import React, { Suspense, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import i18nInstance from './i18n'; // Import the configured i18n instance
import { I18nextProvider } from 'react-i18next'; // Import I18nextProvider
import './src/index.css'; // Import Tailwind CSS

console.log('🔧 [DEBUG] index.tsx loaded');
console.log('🔧 [DEBUG] i18nInstance:', i18nInstance);
console.log('🔧 [DEBUG] i18nInstance.isInitialized:', i18nInstance?.isInitialized);
console.log('🔧 [DEBUG] I18nextProvider:', I18nextProvider);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Loading component while i18n initializes
const LoadingScreen = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <div>Loading ProCrèche Solutions...</div>
  </div>
);

// Wrapper component that waits for i18n initialization
const AppInitializer: React.FC = () => {
  const [isI18nReady, setIsI18nReady] = useState(false);
  
  useEffect(() => {
    console.log('🔧 [DEBUG] AppInitializer useEffect running');
    console.log('🔧 [DEBUG] i18nInstance.isInitialized:', i18nInstance?.isInitialized);
    
    if (i18nInstance.isInitialized) {
      console.log('✅ [DEBUG] i18n already initialized, setting ready state');
      setIsI18nReady(true);
    } else {
      console.log('🔧 [DEBUG] i18n not initialized, waiting for initialized event');
      const handleInitialized = () => {
        console.log('✅ [DEBUG] i18n initialized event received in AppInitializer');
        setIsI18nReady(true);
      };
      
      i18nInstance.on('initialized', handleInitialized);
      
      return () => {
        i18nInstance.off('initialized', handleInitialized);
      };
    }
  }, []);
  
  if (!isI18nReady) {
    console.log('🔧 [DEBUG] AppInitializer rendering loading screen');
    return <LoadingScreen />;
  }
  
  console.log('🔧 [DEBUG] AppInitializer rendering app');
  return (
    <I18nextProvider i18n={i18nInstance}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <App />
        </Suspense>
      </BrowserRouter>
    </I18nextProvider>
  );
};

console.log('🔧 [DEBUG] About to create root and render');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppInitializer />
  </React.StrictMode>
);