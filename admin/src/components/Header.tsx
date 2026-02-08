import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Menu, Bell, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from './design-system/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useApiClient, apiService } from '../services/api'
import { subscriptionService } from '../services/subscriptionService'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { t } = useTranslation(['dashboard','common','admin'])
  const apiClient = useApiClient()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null)
  const recentWindowDays = 7
  const recentFrom = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - recentWindowDays)
    return date.toISOString()
  }, [])

  const handleSignOut = () => {
    signOut()
  }

  const { data: supportTicketsResponse, isLoading: supportLoading } = useQuery({
    queryKey: ['support-ticket-notifications'],
    queryFn: () => apiService.getSupportTickets(apiClient, { status: 'OPEN' }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: userStatsResponse, isLoading: userStatsLoading } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: () => apiService.getAdminUserStats(apiClient),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: recentUsersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['recent-user-notifications', recentFrom],
    queryFn: () =>
      apiService.getAdminUsers(apiClient, {
        page: 1,
        limit: 5,
        dateFrom: recentFrom,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['recent-product-notifications'],
    queryFn: () => apiService.getProducts(apiClient),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: servicesResponse, isLoading: servicesLoading } = useQuery({
    queryKey: ['recent-service-notifications'],
    queryFn: () => apiService.getServices(apiClient),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: subscriptionRequestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['subscription-request-notifications'],
    queryFn: () => subscriptionService.getSubscriptionRequests(apiClient, { status: 'PENDING', page: 1, limit: 5 }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const { data: cancellationRequestsResponse, isLoading: cancellationsLoading } = useQuery({
    queryKey: ['subscription-cancellation-request-notifications'],
    queryFn: () => subscriptionService.getCancellationRequests(apiClient, { status: 'PENDING', page: 1, limit: 5 }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const supportTickets = useMemo(() => supportTicketsResponse?.data?.data || [], [supportTicketsResponse])
  const supportCount = supportTickets.length
  const supportItems = supportTickets.slice(0, 5)

  const userStats = (userStatsResponse as any)?.data?.data ?? (userStatsResponse as any)?.data ?? null
  const recentUsersPayload = (recentUsersResponse as any)?.data?.data ?? (recentUsersResponse as any)?.data
  const recentUsers = Array.isArray(recentUsersPayload?.users) ? recentUsersPayload.users : []
  const recentUsersCount = userStats?.recentRegistrations ?? recentUsers.length

  const products = useMemo(() => productsResponse?.data?.data || [], [productsResponse])
  const services = useMemo(() => servicesResponse?.data?.data || [], [servicesResponse])
  const recentCutoff = useMemo(() => new Date(recentFrom).getTime(), [recentFrom])
  const recentProducts = useMemo(
    () => products.filter((product: any) => new Date(product.createdAt).getTime() >= recentCutoff),
    [products, recentCutoff]
  )
  const recentServices = useMemo(
    () => services.filter((service: any) => new Date(service.createdAt).getTime() >= recentCutoff),
    [services, recentCutoff]
  )
  const recentProductsCount = recentProducts.length
  const recentServicesCount = recentServices.length
  const recentProductItems = recentProducts.slice(0, 5)
  const recentServiceItems = recentServices.slice(0, 5)

  const subscriptionRequestsData = subscriptionRequestsResponse?.data?.data
  const subscriptionRequests = subscriptionRequestsData?.requests || []
  const subscriptionCount = subscriptionRequestsData?.total ?? subscriptionRequests.length
  const subscriptionItems = subscriptionRequests.slice(0, 5)

  const cancellationRequestsData = cancellationRequestsResponse?.data?.data
  const cancellationRequests = cancellationRequestsData?.requests || []
  const cancellationCount = cancellationRequestsData?.total ?? cancellationRequests.length
  const cancellationItems = cancellationRequests.slice(0, 5)

  const totalNotifications =
    supportCount +
    subscriptionCount +
    cancellationCount +
    recentUsersCount +
    recentProductsCount +
    recentServicesCount
  const isLoadingNotifications =
    supportLoading ||
    userStatsLoading ||
    usersLoading ||
    productsLoading ||
    servicesLoading ||
    requestsLoading ||
    cancellationsLoading

  useEffect(() => {
    if (!isNotificationsOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        notificationsRef.current?.contains(target) ||
        notificationsButtonRef.current?.contains(target)
      ) {
        return
      }
      setIsNotificationsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen])

  const formatTimestamp = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString()
  }

  const formatRequestContact = (request: any) => {
    if (request?.contactName) return request.contactName
    const fullName = `${request?.user?.firstName || ''} ${request?.user?.lastName || ''}`.trim()
    if (fullName) return fullName
    return request?.contactEmail || request?.user?.email || t('common:unknown', 'Unknown')
  }

  const formatCancellationContact = (request: any) => {
    if (request?.organization?.name) return request.organization.name
    const fullName = `${request?.user?.firstName || ''} ${request?.user?.lastName || ''}`.trim()
    if (fullName) return fullName
    return request?.user?.email || t('common:unknown', 'Unknown')
  }

  const formatUserName = (userData: any) => {
    const fullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim()
    return fullName || userData?.email || t('common:unknown', 'Unknown')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 lg:ml-0">
            <h1 className="text-lg font-semibold text-swiss-charcoal">
              {t('sidebar.dashboard')}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          <div className="relative">
            <button
              ref={notificationsButtonRef}
              type="button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative p-2 text-gray-400 hover:text-gray-500"
              aria-haspopup="true"
              aria-expanded={isNotificationsOpen}
              aria-label={t('admin:notifications.toggle', { defaultValue: 'Toggle notifications' })}
            >
              <Bell className="h-5 w-5" />
              {totalNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-[16px] px-1">
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div
                ref={notificationsRef}
                className="absolute right-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {t('admin:notifications.title', { defaultValue: 'Notifications' })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {isLoadingNotifications
                      ? t('common:loading', 'Loading...')
                      : t('admin:notifications.count', {
                          defaultValue: '{{count}} new',
                          count: totalNotifications,
                        })}
                  </span>
                </div>

                <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('admin:notifications.sections.support', { defaultValue: 'Support' })}
                      </h3>
                      {supportCount > 0 && (
                        <span className="text-xs text-gray-400">{supportCount}</span>
                      )}
                    </div>
                    {supportItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.supportEmpty', { defaultValue: 'No new support tickets.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {supportItems.map((ticket: any) => (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => {
                              navigate(`/support?ticket=${ticket.id}`)
                              setIsNotificationsOpen(false)
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ticket.subject}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ticket.user
                                ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() ||
                                  ticket.user.email
                                : t('common:unknown', 'Unknown')}
                              {ticket.createdAt ? ` • ${formatTimestamp(ticket.createdAt)}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {supportCount > supportItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/support')
                          setIsNotificationsOpen(false)
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {t('admin:notifications.viewAllSupport', { defaultValue: 'View all support tickets' })}
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('admin:notifications.sections.users', { defaultValue: 'Users' })}
                      </h3>
                      {recentUsersCount > 0 && (
                        <span className="text-xs text-gray-400">{recentUsersCount}</span>
                      )}
                    </div>
                    {recentUsers.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.usersEmpty', { defaultValue: 'No new users.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {recentUsers.map((recentUser: any) => (
                          <button
                            key={recentUser.id}
                            type="button"
                            onClick={() => {
                              navigate('/users')
                              setIsNotificationsOpen(false)
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {formatUserName(recentUser)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {recentUser.email || t('common:unknown', 'Unknown')}
                              {recentUser.createdAt ? ` • ${formatTimestamp(recentUser.createdAt)}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {recentUsersCount > recentUsers.length && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/users')
                          setIsNotificationsOpen(false)
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {t('admin:notifications.viewAllUsers', { defaultValue: 'View all users' })}
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('admin:notifications.sections.products', { defaultValue: 'Products' })}
                      </h3>
                      {recentProductsCount > 0 && (
                        <span className="text-xs text-gray-400">{recentProductsCount}</span>
                      )}
                    </div>
                    {recentProductItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.productsEmpty', { defaultValue: 'No new products.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {recentProductItems.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              navigate('/products')
                              setIsNotificationsOpen(false)
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {product.title || t('common:unknown', 'Unknown')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.supplierName || t('common:notAvailable', 'N/A')}
                              {product.createdAt ? ` • ${formatTimestamp(product.createdAt)}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {recentProductsCount > recentProductItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/products')
                          setIsNotificationsOpen(false)
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {t('admin:notifications.viewAllProducts', { defaultValue: 'View all products' })}
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('admin:notifications.sections.services', { defaultValue: 'Services' })}
                      </h3>
                      {recentServicesCount > 0 && (
                        <span className="text-xs text-gray-400">{recentServicesCount}</span>
                      )}
                    </div>
                    {recentServiceItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.servicesEmpty', { defaultValue: 'No new services.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {recentServiceItems.map((service: any) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                              navigate('/services')
                              setIsNotificationsOpen(false)
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {service.title || t('common:unknown', 'Unknown')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {service.providerName || t('common:notAvailable', 'N/A')}
                              {service.createdAt ? ` • ${formatTimestamp(service.createdAt)}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {recentServicesCount > recentServiceItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/services')
                          setIsNotificationsOpen(false)
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {t('admin:notifications.viewAllServices', { defaultValue: 'View all services' })}
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('admin:notifications.sections.subscriptions', { defaultValue: 'Subscriptions' })}
                      </h3>
                      {subscriptionCount + cancellationCount > 0 && (
                        <span className="text-xs text-gray-400">{subscriptionCount + cancellationCount}</span>
                      )}
                    </div>

                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          {t('admin:notifications.subsections.requests', { defaultValue: 'Requests' })}
                        </p>
                        {subscriptionItems.length === 0 ? (
                          <p className="mt-1 text-sm text-gray-500">
                            {t('admin:notifications.subscriptionsEmpty', { defaultValue: 'No new subscription requests.' })}
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {subscriptionItems.map((request: any) => (
                              <button
                                key={request.id}
                                type="button"
                                onClick={() => {
                                  navigate('/subscriptions?view=requests')
                                  setIsNotificationsOpen(false)
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {formatRequestContact(request)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {request.plan?.name || t('common:notAvailable', 'N/A')}
                                  {request.createdAt ? ` • ${formatTimestamp(request.createdAt)}` : ''}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          {t('admin:notifications.subsections.cancellations', { defaultValue: 'Cancellations' })}
                        </p>
                        {cancellationItems.length === 0 ? (
                          <p className="mt-1 text-sm text-gray-500">
                            {t('admin:notifications.cancellationsEmpty', { defaultValue: 'No new cancellation requests.' })}
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {cancellationItems.map((request: any) => (
                              <button
                                key={request.id}
                                type="button"
                                onClick={() => {
                                  navigate('/subscriptions?view=cancellations')
                                  setIsNotificationsOpen(false)
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-gray-50"
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {formatCancellationContact(request)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {request.subscription?.plan?.name || t('common:notAvailable', 'N/A')}
                                  {request.requestedAt ? ` • ${formatTimestamp(request.requestedAt)}` : ''}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {subscriptionCount + cancellationCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/subscriptions')
                          setIsNotificationsOpen(false)
                        }}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {t('admin:notifications.viewAllSubscriptions', { defaultValue: 'View subscriptions' })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              <p className="font-medium text-swiss-charcoal">
                {user?.fullName || 'Admin User'}
              </p>
              <p className="text-gray-500 text-xs">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
            <div className="h-8 w-8 bg-swiss-mint rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('navbar.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header