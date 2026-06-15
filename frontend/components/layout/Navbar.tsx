import React, { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, BellIcon, ChevronDownIcon, ArrowLeftIcon, ShoppingCartIcon, UserCircleIcon, CogIcon, Bars3Icon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { ICON_INPUT_FIELD } from '../../constants';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import OrderSummaryDrawer from '../cart/OrderSummaryDrawer';
import HelpModal from '../help/HelpModal';
import { UserRole, AppNotification } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { useInAppNotifications } from '../../contexts/InAppNotificationContext';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '../../hooks/useFeatureFlags';
import { AssistantToggle } from '../assistant-workspace';

interface NavbarProps {
  onMobileMenuToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'assistant']); // Initialize useTranslation
  const { currentUser, logout } = useAppContext();
  const { enabled: assistantKillSwitch } = useFeatureFlag('ai_assistant_enabled');
  const { getCartItemCount } = useCart();
  const { conversations, getUnreadCountForConversation } = useMessaging();
  const { notifications, removeNotification } = useNotifications();
  const { unreadCount: inAppUnreadCount } = useInAppNotifications();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Hybrid bar: Foundation users see the toggle when the assistant is enabled.
  // The search field swaps for the greeting on the workspace.
  const assistantEligible = currentUser?.role === UserRole.FOUNDATION && assistantKillSwitch;
  const onAssistantPage = location.pathname.startsWith('/foundation/assistant');
  const greetingHour = new Date().getHours();
  const greetingKey =
    greetingHour < 12
      ? 'assistant:workspace.greetingMorning'
      : greetingHour < 18
        ? 'assistant:workspace.greetingAfternoon'
        : 'assistant:workspace.greetingEvening';
  const greetingFallback =
    greetingHour < 12
      ? 'Good morning, {{name}} 👋'
      : greetingHour < 18
        ? 'Good afternoon, {{name}} 👋'
        : 'Good evening, {{name}} 👋';
  const greetingName = currentUser?.firstName || currentUser?.name?.split(' ')[0] || '';
  const greetingOrg = currentUser?.orgName || currentUser?.primaryOrganization?.name;
  const greetingDate = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const helpArticleId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('help') || '';
  }, [location.search]);

  const effectiveHelpOpen = isHelpModalOpen || !!helpArticleId;

  const handleCloseHelpModal = () => {
    setIsHelpModalOpen(false);

    if (helpArticleId) {
      const params = new URLSearchParams(location.search);
      params.delete('help');
      const nextSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true },
      );
    }
  };

  const cartItemCount = getCartItemCount();

  const totalUnreadMessages = useMemo(() => {
    if (!currentUser) return 0;
    return conversations.reduce((acc, conv) => acc + getUnreadCountForConversation(conv.id), 0);
  }, [conversations, getUnreadCountForConversation, currentUser]);

  const totalNotificationsCount = notifications.length + totalUnreadMessages + inAppUnreadCount;

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
      <header className="h-14 sm:h-16 lg:h-20 bg-white border-b border-gray-200/80 flex items-center justify-between px-2 sm:px-4 lg:px-8 shadow-minimal">
        <div className="flex items-center">
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            type="button"
            className="md:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 mr-1 sm:mr-2 rounded-md text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-swiss-mint"
            onClick={onMobileMenuToggle}
            aria-label={t('navbar.toggleNavigation')}
          >
            <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-swiss-mint/50 transition-colors mr-0 sm:mr-2 lg:mr-4"
            aria-label={t('navbar.goBackPreviousPage')}
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          {onAssistantPage && assistantEligible ? (
            <div className="hidden md:block">
              <h1 className="text-base lg:text-lg font-bold leading-tight text-swiss-charcoal">
                {t(greetingKey, greetingFallback, { name: greetingName })}
              </h1>
              <p className="text-xs text-gray-500">
                {greetingDate}
                {greetingOrg ? ` · ${greetingOrg}` : ''}
              </p>
            </div>
          ) : (
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 lg:pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('navbar.searchPlaceholder')}
                className={`${ICON_INPUT_FIELD} w-40 md:w-56 lg:w-80 leading-5 text-xs md:text-sm transition-colors`}
                aria-label={t('navbar.searchPlaceholder')}
              />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 xl:space-x-4">
          {assistantEligible && onAssistantPage && (
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {t('assistant:workspace.activePill', 'Assistant active')}
            </span>
          )}
          {assistantEligible && (
            <div className="hidden sm:block">
              <AssistantToggle active={onAssistantPage ? 'assistant' : 'dashboard'} />
            </div>
          )}
          <LanguageSwitcher />

          {/* Help Button */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="relative flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none transition-colors"
            aria-label={t('navbar.help')}
            title={t('navbar.help')}
          >
            <QuestionMarkCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-xs sm:text-sm font-medium">
              {t('navbar.helpShort', 'Help')}
            </span>
          </button>

          {currentUser?.role === UserRole.FOUNDATION && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none transition-colors"
              aria-label={t('navbar.viewShoppingCart')}
            >
              <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 sm:-top-1 -right-1 sm:-right-1.5 flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-swiss-coral text-white text-[10px] sm:text-xs font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          <div className="relative">
              <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-1.5 sm:p-2 rounded-full text-gray-500 hover:text-swiss-teal hover:bg-gray-100 focus:outline-none transition-colors"
                  aria-label={t('navbar.notifications')}
              >
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {totalNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 sm:-top-1 -right-1 sm:-right-1.5 flex items-center justify-center min-w-[1.1rem] h-4 px-0.5 text-[10px] font-bold rounded-full bg-swiss-coral text-white ring-2 ring-white">
                    {totalNotificationsCount > 99 ? '99+' : totalNotificationsCount}
                  </span>
                )}
              </button>
               {notificationsOpen && (
                <div 
                  onMouseLeave={() => setNotificationsOpen(false)}
                  className="origin-top-right absolute right-0 mt-2 w-64 sm:w-80 rounded-card shadow-soft bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-2"
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
                      {notifications.length === 0 && totalUnreadMessages === 0 && inAppUnreadCount === 0 && (
                         <p className="px-4 py-3 text-sm text-gray-500 text-center">{t('navbar.noNewNotifications')}</p>
                      )}
                  </div>
                   {(notifications.length > 0 || totalUnreadMessages > 0 || inAppUnreadCount > 0) &&
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
                  className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full border-2 border-transparent hover:border-swiss-mint/30" 
                  src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name.replace(' ', '+')}&background=48CFAE&color=fff&rounded=true&size=128`}
                  alt={currentUser.name} 
                />
                <span className="ml-2 lg:ml-2.5 hidden lg:block text-swiss-charcoal font-medium text-sm">{currentUser.name}</span>
                <ChevronDownIcon className="ml-1 lg:ml-1.5 h-4 w-4 lg:h-5 lg:w-5 text-gray-400 hidden lg:block" />
              </button>
              {dropdownOpen && (
                <div 
                  onMouseLeave={() => setDropdownOpen(false)}
                  className="origin-top-right absolute right-0 mt-2 w-48 sm:w-56 rounded-card shadow-soft bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-1"
                  role="menu"
                >
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
                      <p className="text-xs sm:text-sm font-medium text-swiss-charcoal truncate">{currentUser.name}</p>
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
      <HelpModal
        isOpen={effectiveHelpOpen}
        onClose={handleCloseHelpModal}
        initialArticleId={helpArticleId || undefined}
      />
    </>
  );
};

export default Navbar;