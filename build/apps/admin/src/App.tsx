import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage, AdminSignupPage, AdminProtectedRoute } from './components/auth/AdminAuthComponents';
import { AdminDashboard } from './components/AdminDashboard';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminSettingsPage from './pages/AdminSettingsPage';
// import AdminAlertsMessagingDemo from './pages/AdminAlertsMessagingDemo';
import AdminUsersPage from './pages/UserManagementPage';
import AdminAnalyticsPage from './pages/AnalyticsPage';
import AdminModerationPage from './pages/ContentModerationPage';
import AdminMonitoringPage from './pages/SystemMonitoringPage';
import AdminSubscriptionsPage from './pages/SubscriptionManagementPage';
import AdminSystemConfigurationPage from './pages/SystemConfigurationPage';

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/signup" element={<AdminSignupPage />} />
      <Route 
        path="/admin" 
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="moderation" element={<AdminModerationPage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
        <Route path="system-configuration" element={<AdminSystemConfigurationPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        {/* <Route path="alerts-messaging-demo" element={<AdminAlertsMessagingDemo />} /> */}
        <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
