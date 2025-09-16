import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@repo/ui/styles/swiss-theme.css'
import './index.css'
import './i18n'
import App from './App'
import { AppProvider } from './providers/AppProvider'

// Enhanced error logging for main entry point
console.log('🚀 Frontend Application Starting...', {
  timestamp: new Date().toISOString(),
  environment: {
    NODE_ENV: import.meta.env.MODE,
    VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'SET' : 'MISSING',
    VITE_API_URL: import.meta.env.VITE_API_URL || 'NOT_SET',
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'NOT_SET',
  },
  userAgent: navigator.userAgent,
  url: window.location.href,
  rootElement: document.getElementById('root') ? 'FOUND' : 'MISSING',
});

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error Handler:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    timestamp: new Date().toISOString(),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString(),
  });
});

// Check for critical dependencies
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found in DOM');
  }
  
  console.log('✅ Root element found, attempting to render...');
  
  createRoot(rootElement).render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  );
  
  console.log('✅ React application rendered successfully');
} catch (error) {
  console.error('🚨 Critical Error in main.tsx:', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    timestamp: new Date().toISOString(),
  });
  
  // Fallback error display
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>🚨 Critical Application Error</h2>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p>Check console for detailed error information.</p>
      </div>
    `;
  }
}
