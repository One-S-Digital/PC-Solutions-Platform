import React, { Fragment, useMemo } from 'react'
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
} from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useSettings } from '../hooks/useSettings'
import { useApiClient, apiService } from '../services/api'
import { subscriptionService } from '../services/subscriptionService'
import { getEffectiveSince, getLastVisited, isNewSince } from '../utils/notificationState'
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
  { key: 'support', href: '/support', icon: LifeBuoy },
  { key: 'discountTerminations', href: '/discount-terminations', icon: Tag },
  { key: 'subscriptions', href: '/subscriptions', icon: CreditCard },
  { key: 'policyCrawler', href: '/policy-crawler', icon: FileSearch },
  { key: 'settings', href: '/settings', icon: Settings },
]


const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  const { settings } = useSettings()
  const { t } = useTranslation(['dashboard', 'admin', 'common'])
  const apiClient = useApiClient()
  const isUsersPage = location.pathname.startsWith('/users')
  const isProductsPage = location.pathname.startsWith('/products')
  const isServicesPage = location.pathname.startsWith('/services')
  const isSupportPage = location.pathname.startsWith('/support')
  const isSubscriptionsPage = location.pathname.startsWith('/subscriptions')

  const usersLastVisited = useMemo(
    () => (isUsersPage ? new Date() : getLastVisited('users')),
    [isUsersPage]
  )
  const productsLastVisited = useMemo(
    () => (isProductsPage ? new Date() : getLastVisited('products')),
    [isProductsPage]
  )
  const servicesLastVisited = useMemo(
    () => (isServicesPage ? new Date() : getLastVisited('services')),
    [isServicesPage]
  )
  const supportLastVisited = useMemo(
    () => (isSupportPage ? new Date() : getLastVisited('support')),
    [isSupportPage]
  )
  const subscriptionsLastVisited = useMemo(
    () => (isSubscriptionsPage ? new Date() : getLastVisited('subscriptions')),
    [isSubscriptionsPage]
  )

  const usersSince = useMemo(() => getEffectiveSince(usersLastVisited).toISOString(), [usersLastVisited])
  const subscriptionsSince = useMemo(
    () => getEffectiveSince(subscriptionsLastVisited).toISOString(),
    [subscriptionsLastVisited]
  )

  const { data: supportTicketsResponse } = useQuery({
    queryKey: ['support-ticket-notifications'],
    queryFn: () => apiService.getSupportTickets(apiClient, { status: 'OPEN' }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: recentUsersResponse } = useQuery({
    queryKey: ['sidebar-recent-users', usersSince],
    queryFn: () =>
      apiService.getAdminUsers(apiClient, {
        page: 1,
        limit: 1,
        dateFrom: usersSince,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: productsResponse } = useQuery({
    queryKey: ['recent-product-notifications'],
    queryFn: () => apiService.getProducts(apiClient),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: servicesResponse } = useQuery({
    queryKey: ['recent-service-notifications'],
    queryFn: () => apiService.getServices(apiClient),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: subscriptionRequestsResponse } = useQuery({
    queryKey: ['sidebar-subscription-request-badge', subscriptionsSince],
    queryFn: () =>
      subscriptionService.getSubscriptionRequests(apiClient, {
        status: 'PENDING',
        page: 1,
        limit: 1,
        dateFrom: subscriptionsSince,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: cancellationRequestsResponse } = useQuery({
    queryKey: ['sidebar-subscription-cancellation-badge', subscriptionsSince],
    queryFn: () =>
      subscriptionService.getCancellationRequests(apiClient, {
        status: 'PENDING',
        page: 1,
        limit: 1,
        dateFrom: subscriptionsSince,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const supportTickets = supportTicketsResponse?.data?.data || []
  const supportCount = supportTickets.filter((ticket: any) =>
    isNewSince(ticket.createdAt, supportLastVisited)
  ).length

  const recentUsersPayload = (recentUsersResponse as any)?.data?.data ?? (recentUsersResponse as any)?.data
  const recentUsersCount = recentUsersPayload?.total ?? 0

  const products = productsResponse?.data?.data || []
  const services = servicesResponse?.data?.data || []
  const recentProductsCount = products.filter((product: any) =>
    isNewSince(product.createdAt, productsLastVisited)
  ).length
  const recentServicesCount = services.filter((service: any) =>
    isNewSince(service.createdAt, servicesLastVisited)
  ).length

  const subscriptionRequestsData = subscriptionRequestsResponse?.data?.data
  const subscriptionCount = subscriptionRequestsData?.total ?? subscriptionRequestsData?.requests?.length ?? 0
  const cancellationRequestsData = cancellationRequestsResponse?.data?.data
  const cancellationCount = cancellationRequestsData?.total ?? cancellationRequestsData?.requests?.length ?? 0
  const subscriptionsBadgeCount = subscriptionCount + cancellationCount

  const navBadgeCounts: Record<string, number> = {
    users: recentUsersCount,
    products: recentProductsCount,
    services: recentServicesCount,
    subscriptions: subscriptionsBadgeCount,
    support: supportCount,
  }

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
            alt={t('admin:sidebar.adminLogo', 'Admin Logo')}
            className="h-[69px] w-auto"
          />
        ) : (
          <Shield className="h-[69px] w-[69px] text-swiss-mint" />
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Main Navigation */}
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const badgeCount = navBadgeCounts[item.key] || 0
          return (
            <NavLink
              key={item.key}
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
        })}

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
