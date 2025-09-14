import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProviderWrapper } from './providers/ClerkProvider';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import EnhancedSignupPage from './pages/EnhancedSignupPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import BillingSuccessPage from './pages/BillingSuccessPage';
import BillingCancelPage from './pages/BillingCancelPage';
import BillingSettingsPage from './pages/BillingSettingsPage';
import MarketplacePage from './pages/MarketplacePage';
import ProductManagementPage from './pages/ProductManagementPage';
import ServiceManagementPage from './pages/ServiceManagementPage';
import GatedContentExample from './components/GatedContentExample';
import { ThemeToggle, LanguageSwitcher } from '@repo/ui';

function App() {
  return (
    <div className="min-h-screen frontend-page">
      <ClerkProviderWrapper>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<EnhancedSignupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/billing/success" element={<BillingSuccessPage />} />
              <Route path="/billing/cancel" element={<BillingCancelPage />} />
              <Route path="/billing/settings" element={<BillingSettingsPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/products" element={<ProductManagementPage />} />
              <Route path="/marketplace/services" element={<ServiceManagementPage />} />
              <Route path="/gated-example" element={<GatedContentExample />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ClerkProviderWrapper>
      
              {/* Theme toggle and language switcher for frontend */}
              <div className="fixed bottom-4 right-4 flex flex-col gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
    </div>
  );
}

export default App;