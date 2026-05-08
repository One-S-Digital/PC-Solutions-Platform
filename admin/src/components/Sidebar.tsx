import React, { Fragment, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
  BarChart3,
  Users,
  Building2,
  Package,
  Wrench,
  Briefcase,
  UserCheck,
  Heart,
  ShoppingCart,
  FileText,
  MessageSquare,
  Settings,
  X,
  Shield,
  Handshake,
  LifeBuoy,
  CreditCard,
  Tag,
  FileSearch,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  GraduationCap,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSettings } from '../hooks/useSettings'
import { useNotificationData } from '../hooks/useNotificationData'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

interface NavItem {
  key: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  type: 'group'
  key: string
  icon: React.ElementType
  items: NavItem[]
}

interface NavSingle {
  type: 'single'
  key: string
  href: string
  icon: React.ElementType
}

type NavEntry = NavGroup | NavSingle

// Strategy-locked order per STAFFING_REMODEL_PLAN.md §2
const navStructure: NavEntry[] = [
  { type: 'single', key: 'dashboard',    href: '/dashboard',    icon: BarChart3 },
  { type: 'single', key: 'users',        href: '/users',        icon: Users },
  {
    type: 'group', key: 'recruitment', icon: Briefcase,
    items: [
      { key: 'jobListings',   href: '/job-listings', icon: Briefcase },
      { key: 'candidatePool', href: '/candidates',   icon: UserCheck },
      { key: 'replacements',  href: '/replacements', icon: RefreshCw },
      { key: 'internPool',    href: '/intern-pool',  icon: GraduationCap },
    ],
  },
  { type: 'single', key: 'eLearning', href: '/content/e-learning', icon: GraduationCap },
  {
    type: 'group', key: 'hrCompliance', icon: FileText,
    items: [
      { key: 'content',       href: '/content',        icon: FileText },
      { key: 'policyCrawler', href: '/policy-crawler', icon: FileSearch },
    ],
  },
  { type: 'single', key: 'parentLeads', href: '/parent-leads', icon: Heart },
  {
    type: 'group', key: 'suppliersServices', icon: Building2,
    items: [
      { key: 'foundations',        href: '/organizations', icon: Building2 },
      { key: 'partners',           href: '/partners',      icon: Handshake },
      { key: 'products',           href: '/products',      icon: Package },
      { key: 'services',           href: '/services',      icon: Wrench },
      { key: 'ordersAppointments', href: '/orders',        icon: ShoppingCart },
    ],
  },
  {
    type: 'group', key: 'platformOps', icon: Settings,
    items: [
      { key: 'messages',              href: '/messaging',              icon: MessageSquare },
      { key: 'subscriptions',         href: '/subscriptions',          icon: CreditCard },
      { key: 'mailingLists',          href: '/mailing',                icon: Mail },
      { key: 'support',               href: '/support',                icon: LifeBuoy },
      { key: 'discountTerminations',  href: '/discount-terminations',  icon: Tag },
      { key: 'settings',              href: '/settings',               icon: Settings },
    ],
  },
]

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  const { settings } = useSettings()
  const { t } = useTranslation(['dashboard', 'admin', 'common'])
  const notifications = useNotificationData()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    recruitment: true,
    hrCompliance: false,
    suppliersServices: false,
    platformOps: false,
  })

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  const navBadgeCounts: Record<string, number> = {
    users: notifications.users.count,
    products: notifications.products.count,
    services: notifications.services.count,
    subscriptions: notifications.subscriptions.count,
    support: notifications.support.count,
  }

  const adminLogoUrl = settings?.adminLogoAsset?.publicUrl

  const NavItemLink = ({ item }: { item: NavItem }) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== '/' && location.pathname.startsWith(`${item.href}/`))
    const badgeCount = navBadgeCounts[item.key] || 0
    return (
      <NavLink
        to={item.href}
        className={clsx(
          'group flex items-center justify-between px-4 py-2.5 text-sm rounded-button transition-colors duration-150 ease-in-out',
          isActive
            ? 'bg-swiss-mint/10 text-swiss-mint font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
        )}
      >
        <span className="flex items-center">
          <item.icon
            className={clsx(
              'w-5 h-5 mr-3',
              isActive ? 'text-swiss-mint' : 'text-gray-400 group-hover:text-swiss-mint'
            )}
          />
          {t(`admin:sidebar.${item.key}`, item.key)}
        </span>
        {badgeCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] min-w-[18px] h-5 px-1.5">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </NavLink>
    )
  }

  const NavGroupSection = ({ entry }: { entry: NavGroup }) => {
    const isOpen = openGroups[entry.key] ?? false
    const isGroupActive = entry.items.some(
      (item) =>
        location.pathname === item.href ||
        (item.href !== '/' && location.pathname.startsWith(`${item.href}/`))
    )
    return (
      <div>
        <button
          onClick={() => toggleGroup(entry.key)}
          className={clsx(
            'group flex items-center justify-between w-full px-4 py-2.5 text-sm rounded-button transition-colors duration-150 ease-in-out',
            isGroupActive
              ? 'text-swiss-mint font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
          )}
        >
          <span className="flex items-center">
            <entry.icon
              className={clsx(
                'w-5 h-5 mr-3',
                isGroupActive ? 'text-swiss-mint' : 'text-gray-400 group-hover:text-swiss-mint'
              )}
            />
            {t(`admin:sidebar.${entry.key}`, entry.key)}
          </span>
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        {isOpen && (
          <div className="mt-0.5 ml-3 space-y-0.5 border-l border-gray-100 pl-2">
            {entry.items.map((item) => (
              <NavItemLink key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <div className="w-full bg-white border-r border-gray-200/80 flex flex-col shadow-sm h-full">
      <div className="h-20 flex items-center justify-center px-6 border-b border-gray-200/80">
        {adminLogoUrl ? (
          <img
            src={adminLogoUrl}
            alt={t('admin:sidebar.adminLogo', 'Admin Logo')}
            className="h-[69px] w-auto"
          />
        ) : (
          <Shield className="h-[69px] w-[69px] text-swiss-mint" />
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navStructure.map((entry) =>
          entry.type === 'single' ? (
            <NavItemLink key={entry.key} item={{ key: entry.key, href: entry.href, icon: entry.icon }} />
          ) : (
            <NavGroupSection key={entry.key} entry={entry} />
          )
        )}
      </nav>

      <div className="p-4 border-t border-gray-200/80 text-center">
        <p className="text-xs text-gray-500">{t('admin:sidebar.version', 'Backend Management v1.0')}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white pb-2">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white pb-2 border-r border-gray-200/80 shadow-sm">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}

export default Sidebar
