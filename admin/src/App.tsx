import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
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
import SettingsPage from './pages/Settings';
import AccessDeniedPage from './pages/AccessDenied';
import SupportPage from './pages/Support';
import SupportTicketPage from './pages/SupportTicket';
import SubscriptionsPage from './pages/Subscriptions';
import DiscountTerminationsPage from './pages/DiscountTerminations';
import PolicyCrawlerPage from './pages/PolicyCrawler';
import AdminUserProfileEdit from './pages/AdminUserProfileEdit';
import AdminOrganizationProfileEdit from './pages/AdminOrganizationProfileEdit';
import ResetPassword from './pages/ResetPassword';
import MailingListPage from './pages/MailingList';
import MailingCampaignDetailPage from './pages/MailingCampaignDetail';
import ELearningContentPage from './pages/content/ELearningContentPage';
import HrDocumentsPage from './pages/content/HrDocumentsPage';
import StatePoliciesPage from './pages/content/StatePoliciesPage';

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
      <Toaster richColors position="top-right" closeButton style={{ zIndex: 9999 }} />
      <Routes>
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/signup" element={<AdminSignupPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="users/:id/profile" element={<AdminUserProfileEdit />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="organizations/:id/profile" element={<AdminOrganizationProfileEdit />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="job-listings" element={<JobListingsPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="parent-leads" element={<ParentLeadsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="content" element={<ContentPage />}>
            <Route index element={<Navigate to="/content/e-learning" replace />} />
            <Route path="e-learning" element={<ELearningContentPage />} />
            <Route path="hr-documents" element={<HrDocumentsPage />} />
            <Route path="state-policies" element={<StatePoliciesPage />} />
          </Route>
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="support/tickets/:ticketId" element={<SupportTicketPage />} />
          <Route path="discount-terminations" element={<DiscountTerminationsPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />

          <Route path="mailing" element={<MailingListPage />} />
          <Route path="mailing/campaigns/:id" element={<MailingCampaignDetailPage />} />

          {/* Policy crawler (always visible; status is indicated inside) */}
          <Route path="policy-crawler/*" element={<PolicyCrawlerPage />} />

          <Route path="system" element={<Navigate to="/settings?tab=systemMonitoring" replace />} />
          <Route path="translations" element={<Navigate to="/settings?tab=translations" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="design-system" element={<Navigate to="/settings?tab=designSystem" replace />} />

          <Route index element={<Navigate to="/dashboard" />} />
        </Route>
        
        {/* Catch-all route for SPA routing */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    </QueryClientProvider>
  );
}

export default App;
