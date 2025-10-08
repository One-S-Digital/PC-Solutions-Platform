import React, { Suspense } from 'react';
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

const AppWithProviders = () => {
  console.log('🔧 [DEBUG] AppWithProviders rendering');
  console.log('🔧 [DEBUG] i18nInstance in AppWithProviders:', i18nInstance);
  console.log('🔧 [DEBUG] i18nInstance.isInitialized in AppWithProviders:', i18nInstance?.isInitialized);
  
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

// Wait for i18n to be initialized before rendering
const initializeApp = async () => {
  console.log('🔧 [DEBUG] Waiting for i18n initialization...');
  
  // Wait for i18n to be initialized
  if (!i18nInstance.isInitialized) {
    await new Promise((resolve) => {
      if (i18nInstance.isInitialized) {
        resolve(undefined);
      } else {
        i18nInstance.on('initialized', () => {
          console.log('✅ [DEBUG] i18n initialized, proceeding with app render');
          resolve(undefined);
        });
      }
    });
  }
  
  console.log('🔧 [DEBUG] About to create root and render');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>
  );
};

// Start the app initialization
initializeApp().catch((error) => {
  console.error('❌ [DEBUG] Failed to initialize app:', error);
});