import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FrontendLayout } from './components/FrontendLayout';
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
import AlertsMessagingDemo from './pages/AlertsMessagingDemo';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ELearningPage from './pages/ELearningPage';
import ParentLeadFormPage from './pages/ParentLeadFormPage';
import RecruitmentPage from './pages/RecruitmentPage';
import HRProceduresPage from './pages/HRProceduresPage';
import StatePoliciesPage from './pages/StatePoliciesPage';
import ContentManagementDashboardPage from './pages/admin/ContentManagementDashboardPage';
import SLATrackingPage from './pages/admin/SLATrackingPage';
import PromotionManagementPage from './pages/admin/PromotionManagementPage';
import ProfileStrengthPage from './pages/admin/ProfileStrengthPage';
import EnhancedAnalyticsPage from './pages/admin/EnhancedAnalyticsPage';
import AdvancedReportingPage from './pages/admin/AdvancedReportingPage';
import PerformanceTestingPage from './pages/admin/PerformanceTestingPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<EnhancedSignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
        <Route path="/" element={<FrontendLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="billing/success" element={<BillingSuccessPage />} />
          <Route path="billing/cancel" element={<BillingCancelPage />} />
          <Route path="billing/settings" element={<BillingSettingsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="marketplace/products" element={<ProductManagementPage />} />
          <Route path="marketplace/services" element={<ServiceManagementPage />} />
          <Route path="gated-example" element={<GatedContentExample />} />
          <Route path="alerts-messaging-demo" element={<AlertsMessagingDemo />} />
          <Route path="e-learning" element={<ELearningPage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="hr-procedures" element={<HRProceduresPage />} />
          <Route path="state-policies" element={<StatePoliciesPage />} />
          <Route path="content-management" element={<ContentManagementDashboardPage />} />
          <Route path="sla-tracking" element={<SLATrackingPage />} />
          <Route path="promotion-management" element={<PromotionManagementPage />} />
          <Route path="profile-strength" element={<ProfileStrengthPage />} />
          <Route path="enhanced-analytics" element={<EnhancedAnalyticsPage />} />
          <Route path="advanced-reporting" element={<AdvancedReportingPage />} />
          <Route path="performance-testing" element={<PerformanceTestingPage />} />
          <Route path="" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;