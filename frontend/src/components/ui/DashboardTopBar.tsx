import React from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import Button from './Button';

const DashboardTopBar: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const initials = React.useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
    }

    const email = user?.primaryEmailAddress?.emailAddress;
    return email ? email.charAt(0).toUpperCase() : 'U';
  }, [user]);

  const displayName = React.useMemo(() => {
    if (user?.firstName) return user.firstName;
    if (user?.fullName) return user.fullName.split(' ')[0];

    const email = user?.primaryEmailAddress?.emailAddress;
    return email ? email.split('@')[0] : 'User';
  }, [user]);

  const roleLabel = (user?.publicMetadata?.role as string | undefined) ?? 'User';

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-swiss-mint rounded-lg p-2 w-10 h-10" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-swiss-charcoal">PC Solutions</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />

            <button
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 bg-swiss-mint rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleProfileClick}
                  className="p-2"
                  aria-label="Profile"
                >
                  <UserCircleIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSettingsClick}
                  className="p-2"
                  aria-label="Settings"
                >
                  <CogIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="p-2 text-gray-500 hover:text-red-600"
                  aria-label="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;
