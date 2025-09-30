import React from 'react'
import { Link } from 'react-router-dom'
import { SquaresPlusIcon } from '@heroicons/react/24/outline'

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">
            Create your account
          </h1>
          <p className="text-sm text-gray-500">
            Join Pro Crèche Solutions today
          </p>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Signup functionality will be implemented in the next phase.
          </p>
          
          <Link
            to="/login"
            className="btn btn-primary w-full"
          >
            Back to Sign In
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-swiss-mint hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupPage