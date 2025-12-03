import React, { Fragment } from 'react'
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
  Monitor,
  Mail,
  X,
  Shield,
  Palette,
  Globe,
  Handshake,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: BarChart3 },
  { key: 'users', href: '/users', icon: Users },
  { key: 'foundations', href: '/organizations', icon: Building2 },
  { key: 'partners', href: '/partners', icon: Handshake },
  { key: 'products', href: '/products', icon: Package },
  { key: 'services', href: '/services', icon: Wrench },
  { key: 'jobListings', href: '/job-listings', icon: Briefcase },
  { key: 'candidatePool', href: '/candidates', icon: UserCheck },
  { key: 'parentLeads', href: '/parent-leads', icon: Heart },
  { key: 'ordersAppointments', href: '/orders', icon: ShoppingCart },
  { key: 'content', href: '/content', icon: FileText },
  { key: 'messages', href: '/messaging', icon: MessageSquare },
  { key: 'systemMonitoring', href: '/system', icon: Monitor },
  { key: 'translations', href: '/translations', icon: Globe },
  { key: 'designSystem', href: '/design-system', icon: Palette },
  { key: 'settings', href: '/settings', icon: Settings },
]


const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  const { settings } = useSettings()
  const { t } = useTranslation('dashboard')

  const getAdminLogo = () => {
    if (settings?.adminLogoAsset?.publicUrl) {
      return settings.adminLogoAsset.publicUrl
    }
    return null
  }

  const SidebarContent = () => (
    <div className="w-full bg-white border-r border-gray-200/80 flex flex-col shadow-sm h-full">
      <div className="h-20 flex items-center justify-center px-6 border-b border-gray-200/80">
        {getAdminLogo() ? (
          <img
            src={getAdminLogo()}
            alt="Admin Logo"
            className="h-[69px] w-[69px] object-contain mr-2.5"
          />
        ) : (
          <div className="h-[69px] w-[69px] bg-swiss-mint mr-2.5 flex items-center justify-center rounded">
            <Shield className="h-[38px] w-[38px] text-white" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-swiss-charcoal">Admin</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Main Navigation */}
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.key}
              to={item.href}
              className={clsx(
                'group flex items-center px-4 py-2.5 text-sm rounded-button transition-colors duration-150 ease-in-out',
                isActive
                  ? 'bg-swiss-mint/10 text-swiss-mint font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
              )}
            >
              <item.icon
                className={clsx(
                  'w-5 h-5 mr-3',
                  isActive ? 'text-swiss-mint' : 'text-gray-400 group-hover:text-swiss-mint'
                )}
              />
              {t(`sidebar.${item.key}`)}
            </NavLink>
          )
        })}

      </nav>

      <div className="p-4 border-t border-gray-200/80 text-center">
        <p className="text-xs text-gray-500">Backend Management v1.0</p>
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
