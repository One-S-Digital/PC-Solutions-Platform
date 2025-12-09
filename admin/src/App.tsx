import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage, AdminSignupPage, AdminProtectedRoute } from './components/auth/AdminAuthComponents';
import { useSettings } from './hooks/useSettings';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import OrganizationsPage from './pages/Organizations';
import PartnersPage from './pages/Partners';
import ProductsPage from './pages/Products';
import ServicesPage from './pages/Services';
import JobListingsPage from './pages/JobListings';
import CandidatesPage from './pages/Candidates';
import ParentLeadsPage from './pages/ParentLeads';
import OrdersPage from './pages/Orders';
import ContentPage from './pages/Content';
import MessagingPage from './pages/Messaging';
import SystemMonitorPage from './pages/SystemMonitor';
import SettingsPage from './pages/Settings';
import DesignSystemPage from './pages/DesignSystem';
import TranslationsPage from './pages/Translations';
import AccessDeniedPage from './pages/AccessDenied';
import SupportPage from './pages/Support';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const FrontendSettingsManager: React.FC = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings) {
      // Update favicon if admin favicon is present
      if (settings.adminFaviconAsset?.publicUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.adminFaviconAsset.publicUrl;
      }

      // Optionally update title - though Admin might want fixed title
      if (settings.siteName) {
        document.title = `${settings.siteName} - Admin`;
      }
    }
  }, [settings]);

  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FrontendSettingsManager />
      <Routes>
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/signup" element={<AdminSignupPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route
          path="/"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="job-listings" element={<JobListingsPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="parent-leads" element={<ParentLeadsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="system" element={<SystemMonitorPage />} />
          <Route path="translations" element={<TranslationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="design-system" element={<DesignSystemPage />} />

          <Route index element={<Navigate to="/dashboard" />} />
        </Route>
        
        {/* Catch-all route for SPA routing */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    </QueryClientProvider>
  );
}

export default App;
