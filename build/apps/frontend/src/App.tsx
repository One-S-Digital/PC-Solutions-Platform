import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
  useEffect(() => {
    console.log('📱 App Component Mounted:', {
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });

    // Simple network health check
    const checkNetworkHealth = async () => {
      console.log('🔍 Checking network health...', {
        timestamp: new Date().toISOString(),
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      });

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      try {
        const response = await fetch(`${apiUrl}/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ API Health check:', {
          status: response.status,
          ok: response.ok,
        });
      } catch (error) {
        console.error('❌ API Health check failed:', {
          error: error instanceof Error ? error.message : error,
        });
      }
    };

    checkNetworkHealth();

    // Log route changes
    const handleRouteChange = () => {
      console.log('🛣️ Route Change:', {
        timestamp: new Date().toISOString(),
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      console.log('📱 App Component Unmounted:', {
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  console.log('📱 App Component Rendering:', {
    timestamp: new Date().toISOString(),
    currentPath: window.location.pathname,
  });

  return (
    <div className="min-h-screen frontend-page">
      <AuthProvider>
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
        
        {/* Theme toggle and language switcher for frontend */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </AuthProvider>
    </div>
  );
}

export default App;