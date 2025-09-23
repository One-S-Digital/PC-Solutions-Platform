import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/AuthComponents';
import { 
  CogIcon, 
  UserGroupIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';
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
// import AlertsMessagingDemo from './pages/AlertsMessagingDemo';
import ELearningPage from './pages/ELearningPage';
import ParentLeadFormPage from './pages/ParentLeadFormPage';
import RecruitmentPage from './pages/RecruitmentPage';
import HRProceduresPage from './pages/HRProceduresPage';
import StatePoliciesPage from './pages/StatePoliciesPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<EnhancedSignupPage />} />
        <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<React.Fragment />}>
          {/* General Dashboard */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          {/* User Profile & Settings */}
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Billing Routes */}
          <Route path="billing/success" element={
            <ProtectedRoute>
              <BillingSuccessPage />
            </ProtectedRoute>
          } />
          <Route path="billing/cancel" element={
            <ProtectedRoute>
              <BillingCancelPage />
            </ProtectedRoute>
          } />
          <Route path="billing/settings" element={
            <ProtectedRoute>
              <BillingSettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Marketplace Routes */}
          <Route path="marketplace" element={
            <ProtectedRoute>
              <MarketplacePage />
            </ProtectedRoute>
          } />
          <Route path="marketplace/products" element={
            <ProtectedRoute>
              <ProductManagementPage />
            </ProtectedRoute>
          } />
          <Route path="marketplace/services" element={
            <ProtectedRoute>
              <ServiceManagementPage />
            </ProtectedRoute>
          } />
          
          {/* Foundation Routes */}
          <Route path="foundation/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="foundation/leads" element={
            <ProtectedRoute>
              <div>Foundation Leads Page</div>
            </ProtectedRoute>
          } />
          <Route path="foundation/orders-appointments" element={
            <ProtectedRoute>
              <div>Foundation Orders and Appointments Page</div>
            </ProtectedRoute>
          } />
          <Route path="foundation/analytics" element={
            <ProtectedRoute>
              <div>Foundation Analytics Page</div>
            </ProtectedRoute>
          } />
          <Route path="foundation/organisation-profile" element={
            <ProtectedRoute>
              <div>Foundation Organisation Profile Page</div>
            </ProtectedRoute>
          } />
          <Route path="foundation/support" element={
            <ProtectedRoute>
              <div>Foundation Support Page</div>
            </ProtectedRoute>
          } />
          
          {/* Supplier Routes */}
          <Route path="supplier/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="supplier/orders" element={
            <ProtectedRoute>
              <div>Supplier Orders Page</div>
            </ProtectedRoute>
          } />
          <Route path="supplier/product-listings" element={
            <ProtectedRoute>
              <div>Supplier Product Listings Page</div>
            </ProtectedRoute>
          } />
          <Route path="supplier/analytics" element={
            <ProtectedRoute>
              <div>Supplier Analytics Page</div>
            </ProtectedRoute>
          } />
          <Route path="supplier/support" element={
            <ProtectedRoute>
              <div>Supplier Support Page</div>
            </ProtectedRoute>
          } />
          
          {/* Service Provider Routes */}
          <Route path="service-provider/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="service-provider/requests" element={
            <ProtectedRoute>
              <div>Service Provider Requests Page</div>
            </ProtectedRoute>
          } />
          <Route path="service-provider/service-listings" element={
            <ProtectedRoute>
              <div>Service Provider Service Listings Page</div>
            </ProtectedRoute>
          } />
          <Route path="service-provider/analytics" element={
            <ProtectedRoute>
              <div>Service Provider Analytics Page</div>
            </ProtectedRoute>
          } />
          <Route path="service-provider/support" element={
            <ProtectedRoute>
              <div>Service Provider Support Page</div>
            </ProtectedRoute>
          } />
          
          {/* Educator Routes */}
          <Route path="educator/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="educator/job-board" element={
            <ProtectedRoute>
              <div>Educator Job Board Page</div>
            </ProtectedRoute>
          } />
          <Route path="educator/profile" element={
            <ProtectedRoute>
              <div>Educator Profile Page</div>
            </ProtectedRoute>
          } />
          <Route path="educator/applications" element={
            <ProtectedRoute>
              <div>Educator Applications Page</div>
            </ProtectedRoute>
          } />
          <Route path="educator/support" element={
            <ProtectedRoute>
              <div>Educator Support Page</div>
            </ProtectedRoute>
          } />
          
          {/* Parent Routes */}
          <Route path="parent/enquiries" element={
            <ProtectedRoute>
              <div>Parent Enquiries Page</div>
            </ProtectedRoute>
          } />
          <Route path="parent/support" element={
            <ProtectedRoute>
              <div>Parent Support Page</div>
            </ProtectedRoute>
          } />
          
          {/* Shared Content Routes */}
          <Route path="e-learning" element={
            <ProtectedRoute>
              <ELearningPage />
            </ProtectedRoute>
          } />
          <Route path="recruitment" element={
            <ProtectedRoute>
              <RecruitmentPage />
            </ProtectedRoute>
          } />
          <Route path="hr-procedures" element={
            <ProtectedRoute>
              <HRProceduresPage />
            </ProtectedRoute>
          } />
          <Route path="state-policies" element={
            <ProtectedRoute>
              <StatePoliciesPage />
            </ProtectedRoute>
          } />
          <Route path="file-gallery" element={
            <ProtectedRoute>
              <div>File Gallery Page</div>
            </ProtectedRoute>
          } />
          
          {/* Admin Access Routes - Full Platform Access */}
          <Route path="admin/*" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
                <div className="max-w-md w-full">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                  <p className="text-gray-600 mb-6">
                    Access the full admin dashboard for comprehensive platform management.
                  </p>
                  <div
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white cursor-pointer"
                    onClick={() => (window.location.href = '/admin')}
                  >
                    Go to Admin Dashboard
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Admin-Only Features - Full Access */}
          <Route path="users" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
                <div className="max-w-md w-full">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
                  <p className="text-gray-600 mb-6">
                    Access comprehensive user management in the admin dashboard.
                  </p>
                  <div
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white cursor-pointer"
                    onClick={() => (window.location.href = '/admin/users')}
                  >
                    Manage Users
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="analytics" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
                <div className="max-w-md w-full">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
                  <p className="text-gray-600 mb-6">
                    Access detailed analytics and reporting in the admin dashboard.
                  </p>
                  <div
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white cursor-pointer"
                    onClick={() => (window.location.href = '/admin/analytics')}
                  >
                    View Analytics
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="system" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
                <div className="max-w-md w-full">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">System Management</h1>
                  <p className="text-gray-600 mb-6">
                    Access system monitoring and configuration in the admin dashboard.
                  </p>
                  <div
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white cursor-pointer"
                    onClick={() => (window.location.href = '/admin/system')}
                  >
                    System Settings
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Demo Routes */}
          <Route path="gated-example" element={
            <ProtectedRoute>
              <GatedContentExample />
            </ProtectedRoute>
          } />
          <Route path="alerts-messaging-demo" element={
            <ProtectedRoute>
              <div>Alerts & Messaging demo coming soon.</div>
            </ProtectedRoute>
          } />
          
          {/* Messages Route - Available to all authenticated users */}
          <Route path="messages" element={
            <ProtectedRoute>
              <div>Messages Page</div>
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Catch-all route for SPA routing */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
