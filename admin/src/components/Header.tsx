import React, { useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Menu, Bell, User, Search, ArrowLeft, ChevronDown } from 'lucide-react'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const handleSignOut = () => {
    signOut()
  }

  return (
    <header className="bg-gray-50 border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Back button */}
          <button className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search platform..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language selector */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span className="text-sm font-medium text-gray-700">EN</span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </div>

          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          
          {/* User profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <div className="h-8 w-8 bg-swiss-mint rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="text-sm text-left">
                <p className="font-medium text-swiss-charcoal">PCS Super Admin</p>
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {/* Dropdown menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header