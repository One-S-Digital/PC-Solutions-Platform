import React from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { SquaresPlusIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'

const Navbar: React.FC = () => {
  const { signOut } = useAuth()
  const { user } = useUser()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <SquaresPlusIcon className="h-8 w-8 text-swiss-mint" />
            <span className="ml-2 text-xl font-bold text-swiss-charcoal">
              Pro Crèche Solutions
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <BellIcon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {user?.firstName || 'User'}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar