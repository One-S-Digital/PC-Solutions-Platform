import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage, AdminSignupPage, AdminProtectedRoute } from './components/auth/AdminAuthComponents';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import OrganizationsPage from './pages/Organizations';
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
import AccessDeniedPage from './pages/AccessDenied';
import ContentManagementDashboard from './pages/ContentManagementDashboard';
import AdvancedSystemMonitoring from './pages/AdvancedSystemMonitoring';
import PlatformSettingsManagement from './pages/PlatformSettingsManagement';
import AuditAndCompliance from './pages/AuditAndCompliance';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <Route path="products" element={<ProductsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="job-listings" element={<JobListingsPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="parent-leads" element={<ParentLeadsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="system" element={<SystemMonitorPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="design-system" element={<DesignSystemPage />} />
          
          {/* Super Admin Routes */}
          <Route path="content-management" element={<ContentManagementDashboard />} />
          <Route path="advanced-monitoring" element={<AdvancedSystemMonitoring />} />
          <Route path="platform-settings" element={<PlatformSettingsManagement />} />
          <Route path="audit-compliance" element={<AuditAndCompliance />} />

          <Route index element={<Navigate to="/dashboard" />} />
        </Route>
        
        {/* Catch-all route for SPA routing */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    </QueryClientProvider>
  );
}

export default App;
