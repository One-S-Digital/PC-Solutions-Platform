import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@repo/ui/styles/swiss-theme.css'
import './index.css'
import './i18n'
import App from './App'
import { AppProvider } from './providers/AppProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
