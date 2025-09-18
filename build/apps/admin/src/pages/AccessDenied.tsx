import React from 'react'
import { Shield, ArrowLeft, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this area
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Insufficient Permissions
              </h3>
              <p className="text-sm text-gray-600">
                This area is restricted to administrators only. Please contact your system administrator if you believe this is an error.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact support at admin@procreche.com
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 Pro Crèche Solutions. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default AccessDeniedPage