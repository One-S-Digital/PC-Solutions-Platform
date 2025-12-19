import React from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Menu, Bell, User } from 'lucide-react'
import LanguageSwitcher from './design-system/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { t } = useTranslation(['dashboard','common'])

  const handleSignOut = () => {
    signOut()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 lg:ml-0">
            <h1 className="text-lg font-semibold text-swiss-charcoal">
              {t('sidebar.dashboard')}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              <p className="font-medium text-swiss-charcoal">
                {user?.fullName || 'Admin User'}
              </p>
              <p className="text-gray-500 text-xs">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
            <div className="h-8 w-8 bg-swiss-mint rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('navbar.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header