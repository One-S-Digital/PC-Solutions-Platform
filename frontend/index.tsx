import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import i18nInstance from './i18n'; // Import the configured i18n instance
import { I18nextProvider } from 'react-i18next'; // Import I18nextProvider
import './src/index.css'; // Import Tailwind CSS

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const AppWithProviders = () => {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nextProvider>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);