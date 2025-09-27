import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  InboxIcon,
  Cog6ToothIcon,
  LifebuoyIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  external?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const foundationNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
      { label: 'Participants', path: '/leads', icon: UsersIcon },
      { label: 'Appointments', path: '/orders-appointments', icon: CalendarDaysIcon },
      { label: 'Analytics', path: '/analytics', icon: ChartBarIcon },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Marketplace', path: '/marketplace', icon: BuildingStorefrontIcon },
      { label: 'Recruitment', path: '/recruitment', icon: BriefcaseIcon },
      { label: 'E-Learning', path: '/e-learning', icon: AcademicCapIcon },
      { label: 'Resources', path: '/file-gallery', icon: DocumentDuplicateIcon },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messages', path: '/messages', icon: ChatBubbleLeftRightIcon },
      { label: 'Marketplace Inbox', path: '/marketplace', icon: InboxIcon },
      { label: 'Support', path: '/support', icon: LifebuoyIcon },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Billing', path: '/billing/settings', icon: ShoppingBagIcon },
      { label: 'Organisation Profile', path: '/organisation-profile', icon: Cog6ToothIcon },
      { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

const supplierNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
      { label: 'Orders', path: '/orders', icon: ShoppingBagIcon },
      { label: 'Product Listings', path: '/product-listings', icon: BuildingStorefrontIcon },
      { label: 'Analytics', path: '/analytics', icon: ChartBarIcon },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Support', path: '/support', icon: LifebuoyIcon },
      { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

const serviceProviderNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
      { label: 'Requests', path: '/requests', icon: InboxIcon },
      { label: 'Service Listings', path: '/service-listings', icon: BriefcaseIcon },
      { label: 'Analytics', path: '/analytics', icon: ChartBarIcon },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Support', path: '/support', icon: LifebuoyIcon },
      { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

const educatorNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
      { label: 'Job Board', path: '/job-board', icon: BriefcaseIcon },
      { label: 'Applications', path: '/applications', icon: DocumentDuplicateIcon },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Support', path: '/support', icon: LifebuoyIcon },
      { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

const navByRole: Record<string, NavSection[]> = {
  foundation: foundationNav,
  supplier: supplierNav,
  'service-provider': serviceProviderNav,
  educator: educatorNav,
};

const roleDisplayName: Record<string, string> = {
  foundation: 'Foundation',
  supplier: 'Supplier',
  'service-provider': 'Service Provider',
  educator: 'Educator',
  parent: 'Parent',
  admin: 'Administrator',
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const userRole = (user?.publicMetadata?.role as string | undefined)?.toLowerCase();
  const sections = userRole && navByRole[userRole] ? navByRole[userRole] : foundationNav;
  const workspaceLabel =
    (user?.publicMetadata?.workspaceName as string | undefined) ||
    (userRole && roleDisplayName[userRole]) ||
    'Workspace';

  const handleNavigation = (item: NavItem) => {
    if (item.external) {
      window.open(item.path, '_blank');
      return;
    }

    setMobileNavOpen(false);
    navigate(item.path);
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
    : user?.emailAddresses?.[0]?.emailAddress?.charAt(0) ?? 'U';

  const activePath = location.pathname;

  const renderNavItems = () => (
    <nav className="flex-1 space-y-6 overflow-y-auto">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {section.title}
          </p>
          <ul className="mt-2 space-y-1">
            {section.items.map((item) => {
              const isActive = activePath === item.path || activePath.startsWith(`${item.path}/`);
              const ItemIcon = item.icon;

              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => handleNavigation(item)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint/70 ${
                      isActive
                        ? 'bg-swiss-mint/10 text-swiss-teal'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-swiss-teal'
                    }`}
                  >
                    <ItemIcon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const signOutUser = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-page-bg text-swiss-charcoal">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 flex-col border-r border-gray-200 bg-white p-6 lg:flex">
          <div className="flex items-center gap-3 pb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-swiss-mint text-white font-semibold">
              PC
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Pro Crèche Solutions</p>
              <p className="text-lg font-bold text-swiss-charcoal">{workspaceLabel}</p>
            </div>
          </div>

          {renderNavItems()}

          <div className="mt-6">
            <Card className="p-4 bg-gradient-to-br from-swiss-mint/10 via-white to-swiss-mint/5 border border-swiss-mint/20">
              <p className="text-sm font-medium text-swiss-charcoal">Astrid, you're on</p>
              <p className="mt-1 text-lg font-semibold text-swiss-teal">Premium Plan</p>
              <p className="mt-2 text-xs text-gray-500">Manage billing and usage</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate('/billing/settings')}
              >
                Manage Plan
              </Button>
            </Card>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 p-4 text-sm">
            <div>
              <p className="font-semibold">{user?.fullName || user?.emailAddresses?.[0]?.emailAddress}</p>
              <p className="text-xs text-gray-500">{user?.publicMetadata?.role || 'Member'}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-gray-500 hover:text-swiss-coral"
              onClick={signOutUser}
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </Button>
          </div>
        </aside>

        {/* Mobile sidebar */}
        <div className="lg:hidden">
          <div
            className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity ${
              mobileNavOpen ? 'opacity-100 visible' : 'invisible opacity-0'
            }`}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white p-6 shadow-xl transition-transform duration-200 ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pro Crèche Solutions</p>
                <p className="text-lg font-bold text-swiss-charcoal">{workspaceLabel}</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                onClick={() => setMobileNavOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {renderNavItems()}
            <div className="mt-6 space-y-4 text-sm">
              <Button className="w-full" onClick={() => navigate('/billing/settings')}>
                Manage Plan
              </Button>
              <button
                type="button"
                onClick={signOutUser}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-red-600"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </aside>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:border-swiss-mint hover:text-swiss-teal lg:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center justify-end gap-2">
                <button
                  type="button"
                  className="hidden rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 sm:inline-flex"
                  disabled
                >
                  {workspaceLabel}
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-swiss-teal"
                  onClick={() => navigate('/support')}
                  aria-label="Support"
                >
                  <LifebuoyIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-swiss-teal"
                  onClick={() => navigate('/messages')}
                  aria-label="Messages"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-swiss-mint text-white text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="hidden text-left text-xs sm:block">
                    <p className="font-semibold text-swiss-charcoal">{user?.fullName || 'Team Member'}</p>
                    <p className="text-gray-500">{user?.publicMetadata?.role || 'Member'}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 bg-page-bg px-4 pb-10 pt-8 sm:px-6 lg:px-10">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-swiss-teal">{title}</p>
                <h1 className="mt-1 text-3xl font-bold text-swiss-charcoal">{subtitle}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor operations, track engagement, and manage your organisation from one place.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigate('/parent-lead-form')} className="hidden sm:inline-flex">
                  Invite Parent
                </Button>
                <Button
                  variant="outline"
                  className="border-swiss-mint text-swiss-teal hover:bg-swiss-mint/10"
                  onClick={() => navigate('/recruitment')}
                >
                  Add Educator
                </Button>
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
