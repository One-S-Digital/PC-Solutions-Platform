import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  HomeIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  HeartIcon,
  UserIcon,
  DocumentIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  BellIcon,
  UsersIcon,
  GlobeAltIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  children?: SidebarItem[];
  requiredRole?: string[];
  requiredSubscription?: string[];
  featureKey?: string;
}

interface RoleBasedSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function RoleBasedSidebar({ isCollapsed = false, onToggle }: RoleBasedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { t } = useTranslation();
  const { featureAccess, isFeatureLocked } = useFeatureAccess();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);

  const userRole = user?.publicMetadata?.role as string || 'PARENT';
  const userSubscription = featureAccess.userPlan;

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: t('sidebar.dashboard'),
      icon: HomeIcon,
      path: '/dashboard',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT']
    },
    {
      id: 'marketplace',
      label: t('sidebar.marketplace'),
      icon: ShoppingCartIcon,
      path: '/marketplace',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER'],
      requiredSubscription: ['Basic', 'Essential', 'Professional', 'Supplier Plan', 'Service Provider Plan']
    },
    {
      id: 'orders-appointments',
      label: t('sidebar.orders_appointments'),
      icon: ClipboardDocumentListIcon,
      path: '/orders-appointments',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER'],
      requiredSubscription: ['Basic', 'Essential', 'Professional', 'Supplier Plan', 'Service Provider Plan']
    },
    {
      id: 'parent-leads',
      label: t('sidebar.parent_leads'),
      icon: UserGroupIcon,
      path: '/parent-leads',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION'],
      requiredSubscription: ['Essential', 'Professional'],
      featureKey: 'parent_enquiries'
    },
    {
      id: 'recruitment',
      label: t('sidebar.recruitment'),
      icon: BriefcaseIcon,
      children: [
        {
          id: 'job-listings',
          label: t('sidebar.job_listings'),
          icon: DocumentTextIcon,
          path: '/recruitment/job-listings',
          requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION'],
          requiredSubscription: ['Professional']
        },
        {
          id: 'candidate-pool',
          label: t('sidebar.candidate_pool'),
          icon: UsersIcon,
          path: '/recruitment/candidate-pool',
          requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION'],
          requiredSubscription: ['Professional']
        }
      ],
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION'],
      requiredSubscription: ['Professional']
    },
    {
      id: 'hr-procedures',
      label: t('sidebar.hr_procedures'),
      icon: DocumentTextIcon,
      path: '/hr-procedures',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION'],
      requiredSubscription: ['Essential', 'Professional']
    },
    {
      id: 'e-learning',
      label: t('sidebar.e_learning'),
      icon: AcademicCapIcon,
      path: '/e-learning',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'EDUCATOR'],
      requiredSubscription: ['Professional']
    },
    {
      id: 'state-policies',
      label: t('sidebar.state_policies'),
      icon: ShieldCheckIcon,
      path: '/state-policies',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT']
    },
    {
      id: 'analytics',
      label: t('sidebar.analytics'),
      icon: ChartBarIcon,
      path: '/analytics',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER'],
      requiredSubscription: ['Professional', 'Supplier Plan', 'Service Provider Plan']
    },
    {
      id: 'messages',
      label: t('sidebar.messages'),
      icon: ChatBubbleLeftRightIcon,
      path: '/messages',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT']
    },
    {
      id: 'organisation-profile',
      label: t('sidebar.organisation_profile'),
      icon: BuildingOfficeIcon,
      path: '/organisation-profile',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER']
    },
    {
      id: 'support',
      label: t('sidebar.support'),
      icon: QuestionMarkCircleIcon,
      path: '/support',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT']
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: CogIcon,
      path: '/settings',
      requiredRole: ['SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT']
    }
  ];

  // Role-specific items
  const roleSpecificItems: Record<string, SidebarItem[]> = {
    SUPER_ADMIN: [
      {
        id: 'user-management',
        label: t('sidebar.user_management'),
        icon: UsersIcon,
        children: [
          {
            id: 'users',
            label: t('sidebar.users'),
            icon: UserIcon,
            path: '/admin/users',
            requiredRole: ['SUPER_ADMIN', 'ADMIN']
          },
          {
            id: 'admins',
            label: t('sidebar.admins'),
            icon: ShieldCheckIcon,
            path: '/admin/admins',
            requiredRole: ['SUPER_ADMIN']
          }
        ],
        requiredRole: ['SUPER_ADMIN', 'ADMIN']
      },
      {
        id: 'content-management',
        label: t('sidebar.content_management'),
        icon: DocumentIcon,
        children: [
          {
            id: 'e-learning-content',
            label: t('sidebar.e_learning_content'),
            icon: BookOpenIcon,
            path: '/admin/e-learning',
            requiredRole: ['SUPER_ADMIN', 'ADMIN']
          },
          {
            id: 'hr-documents',
            label: t('sidebar.hr_documents'),
            icon: ClipboardDocumentCheckIcon,
            path: '/admin/hr-documents',
            requiredRole: ['SUPER_ADMIN', 'ADMIN']
          }
        ],
        requiredRole: ['SUPER_ADMIN', 'ADMIN']
      },
      {
        id: 'partner-management',
        label: t('sidebar.partner_management'),
        icon: BuildingOfficeIcon,
        path: '/admin/partners',
        requiredRole: ['SUPER_ADMIN', 'ADMIN']
      },
      {
        id: 'global-settings',
        label: t('sidebar.global_settings'),
        icon: CogIcon,
        path: '/admin/global-settings',
        requiredRole: ['SUPER_ADMIN']
      }
    ],
    PRODUCT_SUPPLIER: [
      {
        id: 'product-listings',
        label: t('sidebar.product_listings'),
        icon: TruckIcon,
        path: '/supplier/product-listings',
        requiredRole: ['PRODUCT_SUPPLIER']
      },
      {
        id: 'orders',
        label: t('sidebar.orders'),
        icon: ClipboardDocumentListIcon,
        path: '/supplier/orders',
        requiredRole: ['PRODUCT_SUPPLIER']
      }
    ],
    SERVICE_PROVIDER: [
      {
        id: 'service-listings',
        label: t('sidebar.service_listings'),
        icon: WrenchScrewdriverIcon,
        path: '/service-provider/service-listings',
        requiredRole: ['SERVICE_PROVIDER']
      },
      {
        id: 'requests',
        label: t('sidebar.requests'),
        icon: ClipboardDocumentListIcon,
        path: '/service-provider/requests',
        requiredRole: ['SERVICE_PROVIDER']
      }
    ],
    EDUCATOR: [
      {
        id: 'job-board',
        label: t('sidebar.job_board'),
        icon: BriefcaseIcon,
        path: '/educator/job-board',
        requiredRole: ['EDUCATOR']
      },
      {
        id: 'profile',
        label: t('sidebar.profile'),
        icon: UserIcon,
        path: '/educator/profile',
        requiredRole: ['EDUCATOR']
      },
      {
        id: 'applications',
        label: t('sidebar.applications'),
        icon: ClipboardDocumentCheckIcon,
        path: '/educator/applications',
        requiredRole: ['EDUCATOR']
      }
    ],
    PARENT: [
      {
        id: 'enquiries',
        label: t('sidebar.enquiries'),
        icon: HeartIcon,
        path: '/parent/enquiries',
        requiredRole: ['PARENT']
      }
    ]
  };

  const hasAccess = (item: SidebarItem): boolean => {
    // Check role access
    if (item.requiredRole && !item.requiredRole.includes(userRole)) {
      return false;
    }

    // Check subscription access
    if (item.requiredSubscription && !item.requiredSubscription.includes(userSubscription)) {
      return false;
    }

    // Check feature access
    if (item.featureKey && isFeatureLocked(item.featureKey)) {
      return false;
    }

    return true;
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    if (!hasAccess(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.path);

    return (
      <div key={item.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isItemActive 
              ? 'bg-teal-100 text-teal-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.path) {
              navigate(item.path);
            }
          }}
        >
          <div className="flex items-center space-x-3">
            <item.icon className="h-5 w-5" />
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </div>
          {hasChildren && !isCollapsed && (
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getRoleSpecificItems = (): SidebarItem[] => {
    return roleSpecificItems[userRole] || [];
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500">
                {userRole} • {userSubscription}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="p-4 space-y-2">
        {sidebarItems.map(item => renderSidebarItem(item))}
        
        {/* Role-specific items */}
        {getRoleSpecificItems().map(item => renderSidebarItem(item))}
      </div>

      {/* Premium Plan Section */}
      {!isCollapsed && userRole === 'FOUNDATION' && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Premium Plan</span>
            </div>
            <p className="text-xs text-red-600 mb-2">Access to all features</p>
            <button className="w-full bg-red-600 text-white text-xs py-1 px-2 rounded hover:bg-red-700 transition-colors">
              Manage Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}