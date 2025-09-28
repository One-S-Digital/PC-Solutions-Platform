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
  Monitor,
  Mail,
  X,
  Shield,
  Palette,
  Home,
  ShoppingBag,
  List,
  GraduationCap,
  ChatBubble,
  Truck,
  Gear,
  Family,
  BookOpen,
  Document,
  FileText as DocumentLines,
  Handshake,
  Sliders,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'
import { useSettings } from '../hooks/useSettings'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

interface NavigationItem {
  name: string
  href?: string
  icon: React.ComponentType<any>
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { 
    name: 'Marketplace', 
    icon: ShoppingBag,
    children: [
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Services', href: '/services', icon: Wrench }
    ]
  },
  { 
    name: 'Recruitment', 
    icon: Briefcase,
    children: [
      { name: 'Job Listings', href: '/job-listings', icon: List },
      { name: 'Candidate Pool', href: '/candidates', icon: Users }
    ]
  },
  { name: 'E-Learning', href: '/e-learning', icon: GraduationCap },
  { name: 'Messages', href: '/messaging', icon: ChatBubble },
  { 
    name: 'Users', 
    icon: Users,
    children: [
      { name: 'All Users', href: '/users', icon: UserCheck },
      { name: 'Admins', href: '/admins', icon: Shield },
      { name: 'Foundations', href: '/organizations', icon: Building2 }
    ]
  },
  { name: 'Product Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Service Providers', href: '/providers', icon: Gear },
  { name: 'Parents', href: '/parent-leads', icon: Family },
  { 
    name: 'Content', 
    icon: BookOpen,
    children: [
      { name: 'E-Learning', href: '/content/e-learning', icon: GraduationCap },
      { name: 'HR Procedures', href: '/content/hr', icon: Document },
      { name: 'State Policies', href: '/content/policies', icon: DocumentLines }
    ]
  },
  { name: 'System Monitoring', href: '/system', icon: Monitor },
  { name: 'Partners', href: '/partners', icon: Handshake },
  { name: 'Platform Settings', href: '/platform-settings', icon: Sliders },
  { name: 'Design System', href: '/design-system', icon: Palette },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  const { settings } = useSettings()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.href && location.pathname === item.href) return true
    if (item.children) {
      return item.children.some(child => isItemActive(child))
    }
    return false
  }

  const getAdminLogo = () => {
    if (settings?.adminLogoAsset?.url) {
      return settings.adminLogoAsset.url
    }
    return null
  }

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const isActive = isItemActive(item)
    const isChildActive = hasChildren && item.children?.some(child => isItemActive(child))

    return (
      <div key={item.name}>
        <div
          className={clsx(
            'group flex items-center px-4 py-2.5 text-sm rounded-button transition-colors duration-150 ease-in-out cursor-pointer',
            level > 0 && 'ml-4',
            isActive || isChildActive
              ? 'bg-swiss-mint/10 text-swiss-mint font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.name)
            } else if (item.href) {
              // Navigation will be handled by NavLink
            }
          }}
        >
          {hasChildren ? (
            <div className="flex items-center w-full">
              <item.icon
                className={clsx(
                  'w-5 h-5 mr-3',
                  isActive || isChildActive ? 'text-swiss-mint' : 'text-gray-400 group-hover:text-swiss-mint'
                )}
              />
              <span className="flex-1">{item.name}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ) : (
            <NavLink
              to={item.href || '#'}
              className="flex items-center w-full"
            >
              <item.icon
                className={clsx(
                  'w-5 h-5 mr-3',
                  isActive ? 'text-swiss-mint' : 'text-gray-400 group-hover:text-swiss-mint'
                )}
              />
              <span>{item.name}</span>
            </NavLink>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <div className="w-full bg-white border-r border-gray-200/80 flex flex-col shadow-sm h-full">
      {/* Branding Section */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200/80">
        {getAdminLogo() ? (
          <img
            src={getAdminLogo()}
            alt="Pro Crèche Solutions"
            className="h-9 w-9 object-contain mr-2.5"
          />
        ) : (
          <div className="h-9 w-9 bg-swiss-mint mr-2.5 flex items-center justify-center rounded">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-swiss-charcoal">Pro Crèche Solutions</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => renderNavigationItem(item))}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200/80">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-swiss-mint rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-swiss-charcoal">PCS Super Admin</p>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
        </div>
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
