import React, { useEffect, useRef, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Menu, Bell, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from './design-system/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useNotificationData } from '../hooks/useNotificationData'
import { dismissNotification, markVisited } from '../utils/notificationState'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { t } = useTranslation(['dashboard','common','admin'])
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null)
  const notifications = useNotificationData()
  const faviconBaseHrefRef = useRef<string | null>(null)
  const faviconUpdateIdRef = useRef(0)

  const handleSignOut = () => {
    signOut()
  }

  const supportItems = notifications.support.items.slice(0, 5)
  const userItems = notifications.users.items.slice(0, 5)
  const productItems = notifications.products.items.slice(0, 5)
  const serviceItems = notifications.services.items.slice(0, 5)
  const subscriptionItems = notifications.subscriptions.requests.items.slice(0, 5)
  const cancellationItems = notifications.subscriptions.cancellations.items.slice(0, 5)

  const totalNotifications = notifications.total
  const isLoadingNotifications = notifications.isLoading

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

  useEffect(() => {
    if (typeof document === 'undefined') return
    const updateId = faviconUpdateIdRef.current + 1
    faviconUpdateIdRef.current = updateId
    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null) ||
      (() => {
        const created = document.createElement('link')
        created.rel = 'icon'
        document.head.appendChild(created)
        return created
      })()

    if (link.href && !link.href.startsWith('data:')) {
      faviconBaseHrefRef.current = link.href
    }

    const baseHref = faviconBaseHrefRef.current || link.href
    if (!notifications.total || notifications.total <= 0) {
      if (baseHref) {
        link.href = baseHref
      }
      return
    }

    const countText = notifications.total > 9 ? '9+' : `${notifications.total}`
    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawBadge = () => {
      const radius = 10
      const centerX = size - radius
      const centerY = radius
      ctx.fillStyle = '#EF4444'
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(countText, centerX, centerY)
    }

    const applyCanvas = () => {
      if (faviconUpdateIdRef.current !== updateId) return
      try {
        link.href = canvas.toDataURL('image/png')
      } catch {
        if (baseHref) link.href = baseHref
      }
    }

    const drawFallback = () => {
      if (faviconUpdateIdRef.current !== updateId) return
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)
      drawBadge()
      applyCanvas()
    }

    if (!baseHref) {
      drawFallback()
      return
    }

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (faviconUpdateIdRef.current !== updateId) return
      ctx.clearRect(0, 0, size, size)
      try {
        ctx.drawImage(image, 0, 0, size, size)
      } catch {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)
      }
      drawBadge()
      applyCanvas()
    }
    image.onerror = () => {
      if (faviconUpdateIdRef.current !== updateId) return
      drawFallback()
    }
    image.src = baseHref
  }, [notifications.total])

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
                      {notifications.support.count > 0 && (
                        <span className="text-xs text-gray-400">{notifications.support.count}</span>
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
                              dismissNotification('support', ticket.id)
                              markVisited('support')
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
                    {notifications.support.count > supportItems.length && (
                      <button
                        type="button"
                            onClick={() => {
                              markVisited('support')
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
                      {notifications.users.count > 0 && (
                        <span className="text-xs text-gray-400">{notifications.users.count}</span>
                      )}
                    </div>
                    {userItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.usersEmpty', { defaultValue: 'No new users.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {userItems.map((recentUser: any) => (
                          <button
                            key={recentUser.id}
                            type="button"
                            onClick={() => {
                              dismissNotification('users', recentUser.id)
                              markVisited('users')
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
                    {notifications.users.count > userItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          markVisited('users')
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
                      {notifications.products.count > 0 && (
                        <span className="text-xs text-gray-400">{notifications.products.count}</span>
                      )}
                    </div>
                    {productItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.productsEmpty', { defaultValue: 'No new products.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {productItems.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              dismissNotification('products', product.id)
                              markVisited('products')
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
                    {notifications.products.count > productItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          markVisited('products')
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
                      {notifications.services.count > 0 && (
                        <span className="text-xs text-gray-400">{notifications.services.count}</span>
                      )}
                    </div>
                    {serviceItems.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('admin:notifications.servicesEmpty', { defaultValue: 'No new services.' })}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {serviceItems.map((service: any) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                              dismissNotification('services', service.id)
                              markVisited('services')
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
                    {notifications.services.count > serviceItems.length && (
                      <button
                        type="button"
                        onClick={() => {
                          markVisited('services')
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
                      {notifications.subscriptions.count > 0 && (
                        <span className="text-xs text-gray-400">{notifications.subscriptions.count}</span>
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
                                  dismissNotification('subscriptionRequests', request.id)
                                  markVisited('subscriptions')
                                  markVisited('subscriptionRequests')
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
                                  dismissNotification('subscriptionCancellations', request.id)
                                  markVisited('subscriptions')
                                  markVisited('subscriptionCancellations')
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

                    {notifications.subscriptions.count > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          markVisited('subscriptions')
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