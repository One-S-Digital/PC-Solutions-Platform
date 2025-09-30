import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Suspense } from 'react'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PricingPage from './pages/PricingPage'
import ParentLeadFormPage from './pages/ParentLeadFormPage'
import DashboardPage from './pages/DashboardPage'
import MarketplacePage from './pages/MarketplacePage'
import RecruitmentPage from './pages/RecruitmentPage'
import MessagesPage from './pages/MessagesPage'
import SettingsPage from './pages/SettingsPage'
import LoadingSpinner from './components/ui/LoadingSpinner'
// import AuthGuard from './components/auth/AuthGuard'

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useAuth()
  
  if (!isLoaded) {
    return <LoadingSpinner />
  }
  
  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Public route wrapper
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useAuth()
  
  if (!isLoaded) {
    return <LoadingSpinner />
  }
  
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/parent-lead-form" element={<ParentLeadFormPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Navigate to="/dashboard" replace />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/marketplace/*" element={
          <ProtectedRoute>
            <MainLayout>
              <MarketplacePage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/recruitment/*" element={
          <ProtectedRoute>
            <MainLayout>
              <RecruitmentPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/messages/*" element={
          <ProtectedRoute>
            <MainLayout>
              <MessagesPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings/*" element={
          <ProtectedRoute>
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App