import React, { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, BellIcon, ChevronDownIcon, ArrowLeftIcon, ShoppingCartIcon, UserCircleIcon, CogIcon, Bars3Icon } from '@heroicons/react/24/outline'; // Added Bars3Icon
import { useAppContext } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { ICON_INPUT_FIELD } from '../../constants';
import { useNavigate, Link } from 'react-router-dom';
import OrderSummaryDrawer from '../cart/OrderSummaryDrawer';
import { UserRole, AppNotification } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface NavbarProps {
  onMobileMenuToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { t } = useTranslation(['dashboard', 'common']); // Initialize useTranslation
  const { currentUser, logout } = useAppContext();
  const { getCartItemCount } = useCart();
  const { conversations, getUnreadCountForConversation } = useMessaging();
  const { notifications, removeNotification } = useNotifications();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();

  const cartItemCount = getCartItemCount();

  const totalUnreadMessages = useMemo(() => {
    if (!currentUser) return 0;
    return conversations.reduce((acc, conv) => acc + getUnreadCountForConversation(conv.id), 0);
  }, [conversations, getUnreadCountForConversation, currentUser]);

  const totalNotificationsCount = notifications.length + totalUnreadMessages;

  const handleLogout = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
      // Navigate to login even if logout fails
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <header className="h-20 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 sm:px-8 shadow-minimal"> {/* Adjusted padding for mobile */}
        <div className="flex items-center">
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            type="button"
            className="md:hidden p-2 -ml-2 mr-2 rounded-md text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-swiss-mint"
            onClick={onMobileMenuToggle}
            aria-label={t('navbar.toggleNavigation')}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-swiss-mint/50 transition-colors mr-0 sm:mr-4"
            aria-label={t('navbar.goBackPreviousPage')}
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="relative hidden sm:block"> {/* Hide search on very small screens if needed or adjust width */}
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('navbar.searchPlaceholder')}
              className={`${ICON_INPUT_FIELD} w-48 sm:w-64 md:w-80 leading-5 sm:text-sm transition-colors`}
              aria-label={t('navbar.searchPlaceholder')}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-5">
          <LanguageSwitcher />

          {currentUser?.role === UserRole.FOUNDATION && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none transition-colors"
              aria-label={t('navbar.viewShoppingCart')}
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-swiss-coral text-white text-xs font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          <div className="relative">
              <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none transition-colors"
                  aria-label={t('navbar.notifications')}
              >
                <BellIcon className="h-6 w-6" />
                {totalNotificationsCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-swiss-coral ring-2 ring-white"></span>
                )}
              </button>
               {notificationsOpen && (
                <div 
                  onMouseLeave={() => setNotificationsOpen(false)}
                  className="origin-top-right absolute right-0 mt-2 w-80 rounded-card shadow-soft bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-2"
                >
                  <div className="px-4 py-2 text-sm font-medium text-swiss-charcoal border-b border-gray-200">
                    {t('navbar.notificationsCount', { count: totalNotificationsCount })}
                  </div>
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                      {notifications.map(notif => (
                           <div key={notif.id} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                              <Link to={notif.link || '#'} className="block" onClick={() => { setNotificationsOpen(false); if(!notif.link) removeNotification(notif.id); }}>
                                <p className={`font-medium ${notif.type === 'error' ? 'text-red-600' : notif.type === 'warning' ? 'text-yellow-600' : 'text-swiss-charcoal'}`}>{notif.title}</p>
                                <p className="text-xs text-gray-500">{notif.message}</p>
                              </Link>
                                <button onClick={() => removeNotification(notif.id)} className="text-xs text-gray-400 hover:text-red-500 mt-1 float-right">
                                  {t('common:buttons.dismiss')}
                                </button>
                          </div>
                      ))}
                      {totalUnreadMessages > 0 && (
                         <Link to="/messages" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setNotificationsOpen(false)}>
                            <p className="font-medium text-swiss-teal">{t('navbar.newMessages')}</p>
                            <p className="text-xs text-gray-500">{t('navbar.unreadMessages', { count: totalUnreadMessages })}</p>
                        </Link>
                      )}
                      {notifications.length === 0 && totalUnreadMessages === 0 && (
                         <p className="px-4 py-3 text-sm text-gray-500 text-center">{t('navbar.noNewNotifications')}</p>
                      )}
                  </div>
                   {(notifications.length > 0 || totalUnreadMessages > 0) &&
                        <Link to="/notifications" className="block px-4 py-2 text-center text-sm font-medium text-swiss-mint hover:underline" onClick={() => setNotificationsOpen(false)}>
                          {t('navbar.viewAll')}
                        </Link>
                   }
                </div>
              )}
          </div>
          
          {currentUser && (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint/50 p-0.5"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label={t('navbar.userMenu')}
              >
                <img 
                  className="h-10 w-10 rounded-full border-2 border-transparent hover:border-swiss-mint/30" 
                  src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name.replace(' ', '+')}&background=48CFAE&color=fff&rounded=true&size=128`}
                  alt={currentUser.name} 
                />
                <span className="ml-2.5 hidden md:block text-swiss-charcoal font-medium">{currentUser.name}</span>
                <ChevronDownIcon className="ml-1.5 h-5 w-5 text-gray-400 hidden md:block" />
              </button>
              {dropdownOpen && (
                <div 
                  onMouseLeave={() => setDropdownOpen(false)}
                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-card shadow-soft bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-1"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-swiss-charcoal truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                  <Link to="/settings" role="menuitem" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-swiss-mint transition-colors" onClick={() => setDropdownOpen(false)}>
                    {t('dashboard:sidebar.settings')}
                  </Link>
                  <button 
                    role="menuitem"
                    onClick={handleLogout} 
                    className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border-t border-gray-100"
                  >
                    {t('navbar.signOut')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <OrderSummaryDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Navbar;