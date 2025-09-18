import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FrontendLayout } from './components/FrontendLayout';
import { 
  ProtectedRoute, 
  AdminRoute, 
  SuperAdminRoute, 
  FoundationRoute, 
  SupplierRoute, 
  ServiceProviderRoute, 
  EducatorRoute, 
  ParentRoute,
  PermissionRoute,
  ProfileCompleteRoute
} from './components/auth/ProtectedRoute';
import { RootRedirect } from './components/auth/RootRedirect';
import { Card, Button } from '@repo/ui';
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
import AlertsMessagingDemo from './pages/AlertsMessagingDemo';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<FrontendLayout />}>
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
            <PermissionRoute permissions={['orders.place', 'products.manage', 'services.manage']}>
              <MarketplacePage />
            </PermissionRoute>
          } />
          <Route path="marketplace/products" element={
            <PermissionRoute permissions={['products.manage']}>
              <ProductManagementPage />
            </PermissionRoute>
          } />
          <Route path="marketplace/services" element={
            <PermissionRoute permissions={['services.manage']}>
              <ServiceManagementPage />
            </PermissionRoute>
          } />
          
          {/* Foundation Routes */}
          <Route path="foundation/dashboard" element={
            <FoundationRoute>
              <DashboardPage />
            </FoundationRoute>
          } />
          <Route path="foundation/leads" element={
            <FoundationRoute>
              <div>Foundation Leads Page</div>
            </FoundationRoute>
          } />
          <Route path="foundation/orders-appointments" element={
            <FoundationRoute>
              <div>Foundation Orders & Appointments Page</div>
            </FoundationRoute>
          } />
          <Route path="foundation/analytics" element={
            <FoundationRoute>
              <div>Foundation Analytics Page</div>
            </FoundationRoute>
          } />
          <Route path="foundation/organisation-profile" element={
            <FoundationRoute>
              <div>Foundation Organisation Profile Page</div>
            </FoundationRoute>
          } />
          <Route path="foundation/support" element={
            <FoundationRoute>
              <div>Foundation Support Page</div>
            </FoundationRoute>
          } />
          
          {/* Supplier Routes */}
          <Route path="supplier/dashboard" element={
            <SupplierRoute>
              <DashboardPage />
            </SupplierRoute>
          } />
          <Route path="supplier/orders" element={
            <SupplierRoute>
              <div>Supplier Orders Page</div>
            </SupplierRoute>
          } />
          <Route path="supplier/product-listings" element={
            <SupplierRoute>
              <div>Supplier Product Listings Page</div>
            </SupplierRoute>
          } />
          <Route path="supplier/analytics" element={
            <SupplierRoute>
              <div>Supplier Analytics Page</div>
            </SupplierRoute>
          } />
          <Route path="supplier/support" element={
            <SupplierRoute>
              <div>Supplier Support Page</div>
            </SupplierRoute>
          } />
          
          {/* Service Provider Routes */}
          <Route path="service-provider/dashboard" element={
            <ServiceProviderRoute>
              <DashboardPage />
            </ServiceProviderRoute>
          } />
          <Route path="service-provider/requests" element={
            <ServiceProviderRoute>
              <div>Service Provider Requests Page</div>
            </ServiceProviderRoute>
          } />
          <Route path="service-provider/service-listings" element={
            <ServiceProviderRoute>
              <div>Service Provider Service Listings Page</div>
            </ServiceProviderRoute>
          } />
          <Route path="service-provider/analytics" element={
            <ServiceProviderRoute>
              <div>Service Provider Analytics Page</div>
            </ServiceProviderRoute>
          } />
          <Route path="service-provider/support" element={
            <ServiceProviderRoute>
              <div>Service Provider Support Page</div>
            </ServiceProviderRoute>
          } />
          
          {/* Educator Routes */}
          <Route path="educator/dashboard" element={
            <EducatorRoute>
              <DashboardPage />
            </EducatorRoute>
          } />
          <Route path="educator/job-board" element={
            <EducatorRoute>
              <div>Educator Job Board Page</div>
            </EducatorRoute>
          } />
          <Route path="educator/profile" element={
            <EducatorRoute>
              <div>Educator Profile Page</div>
            </EducatorRoute>
          } />
          <Route path="educator/applications" element={
            <EducatorRoute>
              <div>Educator Applications Page</div>
            </EducatorRoute>
          } />
          <Route path="educator/support" element={
            <EducatorRoute>
              <div>Educator Support Page</div>
            </EducatorRoute>
          } />
          
          {/* Parent Routes */}
          <Route path="parent/enquiries" element={
            <ParentRoute>
              <div>Parent Enquiries Page</div>
            </ParentRoute>
          } />
          <Route path="parent/support" element={
            <ParentRoute>
              <div>Parent Support Page</div>
            </ParentRoute>
          } />
          
          {/* Shared Content Routes */}
          <Route path="e-learning" element={
            <PermissionRoute permissions={['content.view']}>
              <ELearningPage />
            </PermissionRoute>
          } />
          <Route path="recruitment" element={
            <PermissionRoute permissions={['educators.recruit', 'jobs.apply']}>
              <RecruitmentPage />
            </PermissionRoute>
          } />
          <Route path="hr-procedures" element={
            <PermissionRoute permissions={['content.view']}>
              <HRProceduresPage />
            </PermissionRoute>
          } />
          <Route path="state-policies" element={
            <PermissionRoute permissions={['content.view']}>
              <StatePoliciesPage />
            </PermissionRoute>
          } />
          <Route path="file-gallery" element={
            <PermissionRoute permissions={['files.upload', 'files.view']}>
              <div>File Gallery Page</div>
            </PermissionRoute>
          } />
          
          {/* Admin Access Routes - Full Platform Access */}
          <Route path="admin/*" element={
            <AdminRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4 p-8 text-center">
                  <div className="w-16 h-16 bg-swiss-mint rounded-full flex items-center justify-center mx-auto mb-4">
                    <CogIcon className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                  <p className="text-gray-600 mb-6">
                    Access the full admin dashboard for comprehensive platform management.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/admin'}
                  >
                    Go to Admin Dashboard
                  </Button>
                </Card>
              </div>
            </AdminRoute>
          } />
          
          {/* Admin-Only Features - Full Access */}
          <Route path="users" element={
            <AdminRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4 p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
                  <p className="text-gray-600 mb-6">
                    Access comprehensive user management in the admin dashboard.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/admin/users'}
                  >
                    Manage Users
                  </Button>
                </Card>
              </div>
            </AdminRoute>
          } />
          
          <Route path="analytics" element={
            <AdminRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4 p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ChartBarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
                  <p className="text-gray-600 mb-6">
                    Access detailed analytics and reporting in the admin dashboard.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/admin/analytics'}
                  >
                    View Analytics
                  </Button>
                </Card>
              </div>
            </AdminRoute>
          } />
          
          <Route path="system" element={
            <AdminRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4 p-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CogIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">System Management</h1>
                  <p className="text-gray-600 mb-6">
                    Access system monitoring and configuration in the admin dashboard.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/admin/system'}
                  >
                    System Settings
                  </Button>
                </Card>
              </div>
            </AdminRoute>
          } />
          
          {/* Demo Routes */}
          <Route path="gated-example" element={
            <ProtectedRoute>
              <GatedContentExample />
            </ProtectedRoute>
          } />
          <Route path="alerts-messaging-demo" element={
            <ProtectedRoute>
              <AlertsMessagingDemo />
            </ProtectedRoute>
          } />
          
          {/* Messages Route - Available to all authenticated users */}
          <Route path="messages" element={
            <ProtectedRoute>
              <div>Messages Page</div>
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;