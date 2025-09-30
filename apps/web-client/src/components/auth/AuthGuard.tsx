import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../ui/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()

  if (!isLoaded) {
    return <LoadingSpinner />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // TODO: Add role-based access control when user data is available
  // For now, just check if user is signed in

  return <>{children}</>
}

export default AuthGuard