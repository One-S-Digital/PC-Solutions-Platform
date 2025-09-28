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
          
          {/* Marketplace routes */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="services" element={<ServicesPage />} />
          
          {/* Recruitment routes */}
          <Route path="job-listings" element={<JobListingsPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          
          {/* E-Learning route */}
          <Route path="e-learning" element={<ContentPage />} />
          
          {/* Messages route */}
          <Route path="messaging" element={<MessagingPage />} />
          
          {/* Users routes */}
          <Route path="users" element={<UsersPage />} />
          <Route path="admins" element={<UsersPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          
          {/* Suppliers and Providers routes */}
          <Route path="suppliers" element={<ProductsPage />} />
          <Route path="providers" element={<ServicesPage />} />
          
          {/* Parents route */}
          <Route path="parent-leads" element={<ParentLeadsPage />} />
          
          {/* Content routes */}
          <Route path="content" element={<ContentPage />} />
          <Route path="content/e-learning" element={<ContentPage />} />
          <Route path="content/hr" element={<ContentPage />} />
          <Route path="content/policies" element={<ContentPage />} />
          
          {/* System Monitoring route */}
          <Route path="system" element={<SystemMonitorPage />} />
          
          {/* Partners route */}
          <Route path="partners" element={<OrganizationsPage />} />
          
          {/* Platform Settings route */}
          <Route path="platform-settings" element={<SettingsPage />} />
          
          {/* Design System route */}
          <Route path="design-system" element={<DesignSystemPage />} />
          
          {/* Settings route */}
          <Route path="settings" element={<SettingsPage />} />

          <Route index element={<Navigate to="/dashboard" />} />
        </Route>
        
        {/* Catch-all route for SPA routing */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    </QueryClientProvider>
  );
}

export default App;
