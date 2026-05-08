

import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HomeIcon, ShoppingBagIcon, BriefcaseIcon, DocumentTextIcon, AcademicCapIcon, UsersIcon, CogIcon, BookOpenIcon, BuildingStorefrontIcon, UserGroupIcon, NewspaperIcon, PresentationChartLineIcon, BuildingOfficeIcon, TruckIcon, UserCircleIcon, ChevronDownIcon, ChevronUpIcon, PuzzlePieceIcon, InboxArrowDownIcon, ClipboardDocumentListIcon, SquaresPlusIcon, QuestionMarkCircleIcon, TagIcon, ListBulletIcon, ChatBubbleLeftEllipsisIcon, ChartBarIcon, WrenchScrewdriverIcon, IdentificationIcon, CalendarDaysIcon, XMarkIcon, PaperClipIcon, AdjustmentsHorizontalIcon, SwatchIcon, WalletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useFrontendSettings } from '../../hooks/useFrontendSettings';
import { UserRole } from '../../types';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { TFunction } from 'i18next'; // Import TFunction for typing
import { getHomePath } from '../../utils/navigation';

interface NavItem {
  path: string;
  nameKey: string; // Changed from name to nameKey for translation
  icon: React.ElementType;
  roles?: UserRole[];
  subItems?: NavItem[];
  isContentDashboardLink?: boolean; 
  exact?: boolean;
}

interface SidebarProps {
  onLinkClick?: () => void; // For mobile: close sidebar on link click
  isMobileView?: boolean; // To show close button on mobile
}

// Helper function to translate user roles
const translateUserRole = (role: UserRole, t: TFunction): string => {
  const roleKey = `userRoles.${role}`; // Matches keys like userRoles["Super Admin"]
  return t(roleKey, role); // Fallback to the enum value if key not found
};

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick, isMobileView }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { settings, loading, error } = useFrontendSettings();
  const navigate = useNavigate();
  
  // Compute sidebar logo URL once - prefer sidebar logo, fall back to main logo
  const sidebarLogoUrl = settings?.sidebarLogoAsset?.publicUrl || settings?.logoAsset?.publicUrl;
  const homePath = getHomePath(currentUser);
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'sidebar.content': true,
    'sidebar.marketplace': true,
    'sidebar.users': true,
    'sidebar.recruitment': true,
    'sidebar.hrCompliance': true,
    'sidebar.suppliersServices': false,
  });

  React.useEffect(() => {
    // Only log non-abort errors (abort errors are expected when component unmounts)
    if (error && !(typeof error === 'string' ? error : error.message).toLowerCase().includes('aborted')) {
      console.warn('Failed to load frontend settings:', error);
    }
  }, [error]);

  const toggleMenu = (nameKey: string) => { 
    setOpenMenus(prev => ({ ...prev, [nameKey]: !prev[nameKey] }));
  };
  
  const navItems: NavItem[] = [
    { path: '/dashboard', nameKey: 'sidebar.dashboard', icon: HomeIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN], exact: true },
    { path: '/supplier/dashboard', nameKey: 'sidebar.dashboard', icon: HomeIcon, roles: [UserRole.PRODUCT_SUPPLIER], exact: true },
    { path: '/supplier/orders', nameKey: 'sidebar.orders', icon: ShoppingBagIcon, roles: [UserRole.PRODUCT_SUPPLIER] },
    { path: '/supplier/product-listings', nameKey: 'sidebar.productMarketplace', icon: ListBulletIcon, roles: [UserRole.PRODUCT_SUPPLIER] },
    { path: '/supplier/analytics', nameKey: 'sidebar.analytics', icon: ChartBarIcon, roles: [UserRole.PRODUCT_SUPPLIER] },
    { path: '/messages', nameKey: 'sidebar.messages', icon: ChatBubbleLeftEllipsisIcon, roles: [UserRole.PRODUCT_SUPPLIER]},
    { path: '/supplier/organisation-profile', nameKey: 'sidebar.organisationProfile', icon: BuildingOfficeIcon, roles: [UserRole.PRODUCT_SUPPLIER] },
    { path: '/supplier/support', nameKey: 'sidebar.support', icon: QuestionMarkCircleIcon, roles: [UserRole.PRODUCT_SUPPLIER] },
    { path: '/service-provider/dashboard', nameKey: 'sidebar.dashboard', icon: HomeIcon, roles: [UserRole.SERVICE_PROVIDER], exact: true },
    { path: '/service-provider/requests', nameKey: 'sidebar.myRequests', icon: InboxArrowDownIcon, roles: [UserRole.SERVICE_PROVIDER] },
    { path: '/service-provider/service-listings', nameKey: 'sidebar.serviceMarketplace', icon: WrenchScrewdriverIcon, roles: [UserRole.SERVICE_PROVIDER] },
    { path: '/service-provider/analytics', nameKey: 'sidebar.analytics', icon: ChartBarIcon, roles: [UserRole.SERVICE_PROVIDER] },
    { path: '/messages', nameKey: 'sidebar.messages', icon: ChatBubbleLeftEllipsisIcon, roles: [UserRole.SERVICE_PROVIDER]},
    { path: '/service-provider/organisation-profile', nameKey: 'sidebar.organisationProfile', icon: BuildingOfficeIcon, roles: [UserRole.SERVICE_PROVIDER] },
    { path: '/service-provider/support', nameKey: 'sidebar.support', icon: QuestionMarkCircleIcon, roles: [UserRole.SERVICE_PROVIDER] },
    // Foundation — strategy-locked order per STAFFING_REMODEL_PLAN.md §2
    { path: '/foundation/dashboard', nameKey: 'sidebar.dashboard', icon: HomeIcon, roles: [UserRole.FOUNDATION], exact: true },
    {
      path: '/recruitment', nameKey: 'sidebar.recruitment', icon: BriefcaseIcon, roles: [UserRole.FOUNDATION],
      subItems: [
        { path: '/staffing/jobs',            nameKey: 'sidebar.postJob',            icon: ListBulletIcon,            roles: [UserRole.FOUNDATION] },
        { path: '/staffing/candidates',      nameKey: 'sidebar.findCandidates',     icon: UserGroupIcon,             roles: [UserRole.FOUNDATION] },
        { path: '/staffing/applications',    nameKey: 'sidebar.reviewApplications', icon: ClipboardDocumentListIcon, roles: [UserRole.FOUNDATION] },
        { path: '/foundation/replacements',  nameKey: 'sidebar.replacements',       icon: ArrowPathIcon,             roles: [UserRole.FOUNDATION] },
        { path: '/foundation/intern-pool',   nameKey: 'sidebar.internPool',         icon: AcademicCapIcon,           roles: [UserRole.FOUNDATION] },
      ],
    },
    { path: '/e-learning', nameKey: 'sidebar.eLearning', icon: AcademicCapIcon, roles: [UserRole.FOUNDATION] },
    {
      path: '/hr-procedures', nameKey: 'sidebar.hrCompliance', icon: DocumentTextIcon, roles: [UserRole.FOUNDATION],
      subItems: [
        { path: '/hr-procedures',  nameKey: 'sidebar.hrProcedures',  icon: DocumentTextIcon, roles: [UserRole.FOUNDATION] },
        { path: '/state-policies', nameKey: 'sidebar.statePolicies', icon: NewspaperIcon,    roles: [UserRole.FOUNDATION] },
      ],
    },
    { path: '/foundation/leads', nameKey: 'sidebar.parentLeads', icon: InboxArrowDownIcon, roles: [UserRole.FOUNDATION] },
    {
      path: '/marketplace', nameKey: 'sidebar.suppliersServices', icon: ShoppingBagIcon, roles: [UserRole.FOUNDATION],
      subItems: [
        { path: '/marketplace/products', nameKey: 'sidebar.products', icon: PuzzlePieceIcon, roles: [UserRole.FOUNDATION] },
        { path: '/marketplace/services', nameKey: 'sidebar.services', icon: BriefcaseIcon,   roles: [UserRole.FOUNDATION] },
      ],
    },
    { path: '/foundation/orders-appointments', nameKey: 'sidebar.ordersAppointments',  icon: CalendarDaysIcon,          roles: [UserRole.FOUNDATION] },
    { path: '/foundation/analytics',           nameKey: 'sidebar.analytics',            icon: PresentationChartLineIcon, roles: [UserRole.FOUNDATION] },
    { path: '/messages',                       nameKey: 'sidebar.messages',             icon: ChatBubbleLeftEllipsisIcon, roles: [UserRole.FOUNDATION] },
    { path: '/foundation/organisation-profile',nameKey: 'sidebar.organisationProfile',  icon: BuildingOfficeIcon,        roles: [UserRole.FOUNDATION] },
    { path: '/foundation/support',             nameKey: 'sidebar.support',              icon: QuestionMarkCircleIcon,    roles: [UserRole.FOUNDATION] },
    {
      path: '/recruitment', nameKey: 'sidebar.recruitment', icon: BriefcaseIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      subItems: [
        { path: '/recruitment/job-listings',   nameKey: 'sidebar.jobListings',   icon: ListBulletIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        { path: '/recruitment/candidate-pool', nameKey: 'sidebar.candidatePool', icon: UserGroupIcon,  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      ],
    },
    { path: '/e-learning', nameKey: 'sidebar.eLearning', icon: AcademicCapIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/messages',    nameKey: 'sidebar.messages',    icon: ChatBubbleLeftEllipsisIcon,  roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/marketplace', nameKey: 'sidebar.marketplace', icon: ShoppingBagIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      subItems: [
        { path: '/marketplace/products', nameKey: 'sidebar.products', icon: PuzzlePieceIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        { path: '/marketplace/services', nameKey: 'sidebar.services', icon: BriefcaseIcon,   roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      ],
    },
    { path: '/educator/dashboard', nameKey: 'sidebar.dashboard', icon: HomeIcon, roles: [UserRole.EDUCATOR], exact: true },
    { path: '/educator/job-board', nameKey: 'sidebar.jobBoard', icon: BriefcaseIcon, roles: [UserRole.EDUCATOR] },
    { path: '/educator/profile', nameKey: 'sidebar.myProfile', icon: IdentificationIcon, roles: [UserRole.EDUCATOR] },
    { path: '/educator/applications', nameKey: 'sidebar.applications', icon: ClipboardDocumentListIcon, roles: [UserRole.EDUCATOR] },
    { path: '/educator/intern-pool', nameKey: 'sidebar.internPool', icon: AcademicCapIcon, roles: [UserRole.EDUCATOR] },
    { path: '/file-gallery', nameKey: 'sidebar.fileGallery', icon: PaperClipIcon, roles: [UserRole.EDUCATOR] },
    { path: '/messages', nameKey: 'sidebar.messages', icon: ChatBubbleLeftEllipsisIcon, roles: [UserRole.EDUCATOR]},
    { path: '/educator/support', nameKey: 'sidebar.support', icon: QuestionMarkCircleIcon, roles: [UserRole.EDUCATOR] },
    { path: '/parent/dashboard', nameKey: 'sidebar.dashboardHome', icon: HomeIcon, roles: [UserRole.PARENT], exact: true },
    { path: '/parent/foundations', nameKey: 'sidebar.browseFoundations', icon: BuildingOfficeIcon, roles: [UserRole.PARENT] },
    { path: '/parent-lead-form', nameKey: 'sidebar.homeFindCreche', icon: PuzzlePieceIcon, roles: [UserRole.PARENT] },
    { path: '/parent/enquiries', nameKey: 'sidebar.myRequests', icon: ClipboardDocumentListIcon, roles: [UserRole.PARENT] },
    { path: '/messages', nameKey: 'sidebar.messages', icon: ChatBubbleLeftEllipsisIcon, roles: [UserRole.PARENT]},
    { path: '/parent/support', nameKey: 'sidebar.supportFAQ', icon: QuestionMarkCircleIcon, roles: [UserRole.PARENT] },
    { 
      path: '/users', nameKey: 'sidebar.users', icon: UsersIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      subItems: [
        { path: '/users/all', nameKey: 'sidebar.allUsers', icon: UserGroupIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        { path: '/users/admins', nameKey: 'sidebar.admins', icon: UserCircleIcon, roles: [UserRole.SUPER_ADMIN] },
        { path: '/users/foundations', nameKey: 'sidebar.foundations', icon: BuildingOfficeIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        { path: '/users/suppliers', nameKey: 'sidebar.productSuppliers', icon: TruckIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, 
        { path: '/users/service-providers', nameKey: 'sidebar.serviceProviders', icon: WrenchScrewdriverIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, 
        { path: '/users/parents', nameKey: 'sidebar.parents', icon: UserGroupIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      ]
    },
    {
      path: '/content', nameKey: 'sidebar.content', icon: BookOpenIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      isContentDashboardLink: true,
      subItems: [
        { path: '/hr-procedures', nameKey: 'sidebar.hrProcedures', icon: DocumentTextIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        { path: '/state-policies', nameKey: 'sidebar.statePolicies', icon: NewspaperIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      ]
    },
    { path: '/admin/discount-terminations', nameKey: 'sidebar.discountTerminations', icon: TagIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/partners', nameKey: 'sidebar.partners', icon: BuildingStorefrontIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/admin/support', nameKey: 'sidebar.support', icon: QuestionMarkCircleIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/design-system', nameKey: 'sidebar.designSystem', icon: SwatchIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { path: '/settings', nameKey: 'sidebar.settings', icon: CogIcon, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION, UserRole.PARENT, UserRole.EDUCATOR, UserRole.PRODUCT_SUPPLIER] },
    { path: '/settings/service-provider', nameKey: 'sidebar.settings', icon: CogIcon, roles: [UserRole.SERVICE_PROVIDER] },
  ];

  const userSpecificNavItems = navItems.filter(item => 
    !item.roles || (currentUser && item.roles.includes(currentUser.role))
  ).map(item => ({
    ...item,
    subItems: item.subItems?.filter(subItem => !subItem.roles || (currentUser && subItem.roles.includes(currentUser.role)))
  }));

  const NavLinkItem: React.FC<{ item: NavItem, isSubItem?: boolean }> = ({ item, isSubItem = false }) => (
     <NavLink
      to={item.path}
      end={item.exact} 
      onClick={() => {
        if (onLinkClick) {
          onLinkClick();
        }
      }}
      className={({ isActive }) =>
        `flex items-center px-2 md:px-3 lg:px-4 py-2 lg:py-2.5 text-xs md:text-sm rounded-button transition-colors duration-150 ease-in-out group ${
          isSubItem ? 'pl-7 md:pl-8 lg:pl-10' : 'pl-2 md:pl-3 lg:pl-4' 
        } ${isActive ? 'bg-swiss-mint/10 text-swiss-mint font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'}`
      }
    >
      <item.icon className={`w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3 flex-shrink-0 ${isSubItem ? 'group-hover:text-swiss-mint' : 'group-hover:text-swiss-mint'}`} />
      <span className="truncate">{t(item.nameKey)}</span>
    </NavLink>
  );

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const isFoundationUser = currentUser?.role === UserRole.FOUNDATION;
  const hasSubscription = currentUser && [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER].includes(currentUser.role);

  const renderLogo = (imageClassName: string, placeholderClassName: string) => {
    if (sidebarLogoUrl) {
      return (
        <img
          src={sidebarLogoUrl}
          alt={settings?.siteName || t('appName')}
          className={imageClassName}
        />
      );
    }

    if (loading) {
      return <span className={placeholderClassName} aria-hidden="true" />;
    }

    return <SquaresPlusIcon className={placeholderClassName} />;
  };


  return (
    <div className="w-full md:w-56 lg:w-64 bg-white border-r border-gray-200/80 flex flex-col shadow-sm h-full"> {/* Responsive width for desktop sidebar */}
      {isMobileView && (
        <div className="flex justify-between items-center h-16 sm:h-20 px-3 sm:px-4 border-b border-gray-200/80">
            <div className="flex items-center">
                <Link to={homePath} aria-label={t('common:buttons.goHome', 'Go to home')}>
                  {renderLogo('h-12 sm:h-[63px] w-auto mr-2', 'h-12 w-12 sm:h-[63px] sm:w-[63px] text-swiss-mint mr-2')}
                </Link>
            </div>
          {/* Close button for mobile view - managed by MainLayout now */}
        </div>
      )}
      {!isMobileView && (
        <div className="h-16 lg:h-20 flex items-center justify-center px-3 lg:px-6 border-b border-gray-200/80"> 
            <Link to={homePath} aria-label={t('common:buttons.goHome', 'Go to home')}>
              {renderLogo('h-12 lg:h-[69px] w-auto mr-2 lg:mr-2.5', 'h-12 w-12 lg:h-[69px] lg:w-[69px] text-swiss-mint mr-2 lg:mr-2.5')}
            </Link>
        </div>
      )}
      <nav className="flex-1 p-2 md:p-3 lg:p-4 space-y-1 lg:space-y-1.5 overflow-y-auto"> 
        {userSpecificNavItems.map((item) => {
          // Hide "Organisation Profile" if user is Admin or Super Admin but not Foundation
          if (item.path === '/foundation/organisation-profile' && (isAdminOrSuperAdmin && !isFoundationUser)) {
            return null;
          }

          const roleSpecificDashboardPaths = [
            '/supplier/dashboard', 
            '/service-provider/dashboard',
            '/foundation/dashboard',
            '/educator/dashboard',
          ];
          if (item.path === '/dashboard' && currentUser && roleSpecificDashboardPaths.some(p => p.startsWith(`/${currentUser.role.toLowerCase().replace(/[\s()]+/g, '-')}/dashboard`))) {
             if (currentUser.role === UserRole.PRODUCT_SUPPLIER && item.path === '/dashboard') return null;
             if (currentUser.role === UserRole.SERVICE_PROVIDER && item.path === '/dashboard') return null;
             if (currentUser.role === UserRole.FOUNDATION && item.path === '/dashboard') return null;
             if (currentUser.role === UserRole.EDUCATOR && item.path === '/dashboard') return null;
          }

          const isContentMenuForAdmin = item.isContentDashboardLink && isAdminOrSuperAdmin;
          let pathForTopLevel = isContentMenuForAdmin ? '/admin/content-dashboard' : item.path;

          if (item.path === '/settings' && currentUser?.role === UserRole.SERVICE_PROVIDER) {
            pathForTopLevel = '/settings/service-provider';
          }

          return (
            <div key={item.nameKey + item.path}>
              {item.subItems && item.subItems.length > 0 ? (
                <>
                  <button
                    onClick={() => {
                      if (isContentMenuForAdmin) {
                        navigate(pathForTopLevel);
                         if (onLinkClick) onLinkClick(); // Close mobile sidebar if it navigates
                      }
                      // Always toggle if it has subItems, regardless of navigation behavior above
                      // This ensures the chevron works for items like "Content" that also navigate
                      toggleMenu(item.nameKey);
                    }}
                    className="flex items-center justify-between w-full px-2 md:px-3 lg:px-4 py-2 lg:py-2.5 text-xs md:text-sm text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal rounded-button transition-colors duration-150 ease-in-out group"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <item.icon className="w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3 text-gray-500 group-hover:text-swiss-mint flex-shrink-0" />
                      <span className="font-medium truncate">{t(item.nameKey)}</span>
                    </div>
                    {openMenus[item.nameKey] ? <ChevronUpIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0 ml-1" /> : <ChevronDownIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0 ml-1" />}
                  </button>
                  {openMenus[item.nameKey] && (
                    <div className="mt-0.5 lg:mt-1 ml-1 lg:ml-2 space-y-0.5 lg:space-y-1"> 
                      {item.subItems.map((subItem) => (
                        <NavLinkItem key={subItem.nameKey + subItem.path} item={subItem} isSubItem={true} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLinkItem item={{...item, path: pathForTopLevel}} /> 
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 lg:p-5 border-t border-gray-200/80 mt-auto">
        {currentUser && (
           <div className="flex items-center mb-3 lg:mb-4">
            <img src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name.replace(' ', '+')}&background=48CFAE&color=fff&rounded=true&size=128`} alt={currentUser.name} className="w-9 lg:w-11 h-9 lg:h-11 rounded-full mr-2 lg:mr-3 border-2 border-swiss-mint/30" />
            <div className="min-w-0 flex-1">
              <p className="text-sm lg:text-base font-semibold text-swiss-charcoal truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{translateUserRole(currentUser.role, t)}</p>
            </div>
          </div>
        )}
        {hasSubscription && (
          <div className="bg-swiss-sand/20 p-3 lg:p-4 rounded-card text-center">
              <p className="text-xs lg:text-sm text-swiss-charcoal font-semibold">{t('dashboard:sidebar.currentPlan', { plan: currentUser.plan })}</p>
              <p className="text-xs text-gray-600 mb-2 lg:mb-2.5 hidden lg:block">{t('dashboard:sidebar.manageSubscriptionDesc')}</p>
              <button 
                onClick={() => {
                    const targetPath = currentUser?.role === UserRole.SERVICE_PROVIDER ? '/settings/service-provider' : '/settings';
                    // Deep-link directly to Billing & Subscription (and the manage section)
                    navigate(`${targetPath}?focus=manage-subscription#billingSubscription`);
                    if (onLinkClick) onLinkClick();
                }}
                className="w-full bg-swiss-coral text-white text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2 rounded-button hover:bg-opacity-90 transition-colors shadow-soft flex items-center justify-center"
              >
                  <WalletIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5 lg:mr-2"/>
                  {t('dashboard:sidebar.billingSubscription')}
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
