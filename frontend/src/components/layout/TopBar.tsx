import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon, 
  BellIcon, 
  ChevronDownIcon,
  GlobeAltIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface TopBarProps {
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onLanguageChange?: (language: string) => void;
  currentLanguage?: string;
  notificationCount?: number;
}

export function TopBar({ 
  onSearch, 
  onNotificationClick, 
  onLanguageChange, 
  currentLanguage = 'EN',
  notificationCount = 0 
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const languages = [
    { code: 'EN', name: 'English', flag: '🇺🇸' },
    { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'FR', name: 'Français', flag: '🇫🇷' },
  ];

  const handleBackClick = () => {
    if (location.pathname !== '/dashboard') {
      navigate(-1);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    if (onLanguageChange) {
      onLanguageChange(languageCode);
    }
    setShowLanguageDropdown(false);
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search_platform')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Shopping Cart */}
          <button
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors relative"
            aria-label="Shopping cart"
          >
            <ShoppingCartIcon className="h-5 w-5 text-gray-600" />
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Select language"
            >
              <GlobeAltIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{currentLang.code}</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>

            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageSelect(language.code)}
                    className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      language.code === currentLanguage ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                    {language.code === currentLanguage && (
                      <span className="ml-auto text-teal-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors relative"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    {user?.firstName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName?.charAt(0)}.
                </div>
                <div className="text-xs text-gray-500">
                  {user?.publicMetadata?.role as string || 'User'}
                </div>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.emailAddresses[0]?.emailAddress}
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.profile')}
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.settings')}
                  </button>
                  <button
                    onClick={() => {
                      // Handle sign out
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    {t('common.sign_out')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}