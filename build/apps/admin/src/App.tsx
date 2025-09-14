import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage, AdminSignupPage, AdminProtectedRoute } from './components/auth/AdminAuthComponents';
import { AdminDashboard } from './components/AdminDashboard';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminSettingsPage from './pages/AdminSettingsPage';

function App() {
  return (
    <div className="min-h-screen admin-app">
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/signup" element={<AdminSignupPage />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/profile" 
          element={
            <AdminProtectedRoute>
              <AdminProfilePage />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            <AdminProtectedRoute>
              <AdminSettingsPage />
            </AdminProtectedRoute>
          } 
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;