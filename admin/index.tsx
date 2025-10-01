import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import i18nInstance from './i18n'; // Import the configured i18n instance
import { I18nextProvider } from 'react-i18next'; // Import I18nextProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading translations...</div>}>
      <I18nextProvider i18n={i18nInstance}>
        <HashRouter>
          <App />
        </HashRouter>
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>
);