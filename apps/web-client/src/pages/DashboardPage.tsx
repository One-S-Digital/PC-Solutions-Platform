import React from 'react'
import { useUser } from '@clerk/clerk-react'
import { useCurrentUser } from '../hooks/useCurrentUser'

const DashboardPage: React.FC = () => {
  const { user: clerkUser } = useUser()
  const { user: apiUser, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-swiss-mint"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          Welcome back, {apiUser?.firstName || clerkUser?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your account today.
        </p>
        {apiUser && (
          <div className="mt-2 text-sm text-gray-500">
            Role: {apiUser.role} | Organization: {apiUser.organizationName || 'N/A'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Quick Stats
          </h3>
          <p className="text-gray-600">
            Dashboard functionality will be implemented in the next phase.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Recent Activity
          </h3>
          <p className="text-gray-600">
            Activity feed will be implemented in the next phase.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Notifications
          </h3>
          <p className="text-gray-600">
            Notifications will be implemented in the next phase.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage