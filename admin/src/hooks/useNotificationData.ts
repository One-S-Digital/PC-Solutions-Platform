import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiClient, apiService } from '../services/api'
import { subscriptionService } from '../services/subscriptionService'
import {
  NOTIFICATION_STATE_EVENT,
  getDismissedCountSince,
  getEffectiveSince,
  getLastVisited,
  isDismissed,
  isNewSince,
} from '../utils/notificationState'

const getLatestVisited = (...dates: Array<Date | null>) => {
  const valid = dates.filter(Boolean) as Date[]
  if (valid.length === 0) return null
  return new Date(Math.max(...valid.map(date => date.getTime())))
}

export const useNotificationData = () => {
  const apiClient = useApiClient()
  const [stateVersion, setStateVersion] = useState(0)

  useEffect(() => {
    const handler = () => setStateVersion((value) => value + 1)
    if (typeof window === 'undefined') return
    window.addEventListener('storage', handler)
    window.addEventListener(NOTIFICATION_STATE_EVENT, handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener(NOTIFICATION_STATE_EVENT, handler)
    }
  }, [])

  const supportLastVisited = useMemo(() => getLastVisited('support'), [stateVersion])
  const usersLastVisited = useMemo(() => getLastVisited('users'), [stateVersion])
  const productsLastVisited = useMemo(() => getLastVisited('products'), [stateVersion])
  const servicesLastVisited = useMemo(() => getLastVisited('services'), [stateVersion])
  const subscriptionsLastVisited = useMemo(() => getLastVisited('subscriptions'), [stateVersion])
  const subscriptionRequestsLastVisited = useMemo(
    () => getLatestVisited(subscriptionsLastVisited, getLastVisited('subscriptionRequests')),
    [subscriptionsLastVisited, stateVersion]
  )
  const subscriptionCancellationsLastVisited = useMemo(
    () => getLatestVisited(subscriptionsLastVisited, getLastVisited('subscriptionCancellations')),
    [subscriptionsLastVisited, stateVersion]
  )

  const usersSince = useMemo(
    () => getEffectiveSince(usersLastVisited).toISOString(),
    [usersLastVisited]
  )
  const productsSince = useMemo(
    () => getEffectiveSince(productsLastVisited).toISOString(),
    [productsLastVisited]
  )
  const servicesSince = useMemo(
    () => getEffectiveSince(servicesLastVisited).toISOString(),
    [servicesLastVisited]
  )
  const subscriptionRequestsSince = useMemo(
    () => getEffectiveSince(subscriptionRequestsLastVisited).toISOString(),
    [subscriptionRequestsLastVisited]
  )
  const subscriptionCancellationsSince = useMemo(
    () => getEffectiveSince(subscriptionCancellationsLastVisited).toISOString(),
    [subscriptionCancellationsLastVisited]
  )

  const supportQuery = useQuery({
    queryKey: ['support-ticket-notifications'],
    queryFn: () => apiService.getSupportTickets(apiClient, { status: 'OPEN' }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const usersQuery = useQuery({
    queryKey: ['notification-users', usersSince],
    queryFn: () =>
      apiService.getAdminUsers(apiClient, {
        page: 1,
        limit: 5,
        dateFrom: usersSince,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const productsQuery = useQuery({
    queryKey: ['notification-products', productsSince],
    queryFn: () =>
      apiService.getProducts(apiClient, {
        dateFrom: productsSince,
        limit: 5,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const servicesQuery = useQuery({
    queryKey: ['notification-services', servicesSince],
    queryFn: () =>
      apiService.getServices(apiClient, {
        dateFrom: servicesSince,
        limit: 5,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const subscriptionRequestsQuery = useQuery({
    queryKey: ['notification-subscription-requests', subscriptionRequestsSince],
    queryFn: () =>
      subscriptionService.getSubscriptionRequests(apiClient, {
        status: 'PENDING',
        page: 1,
        limit: 5,
        dateFrom: subscriptionRequestsSince,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const cancellationRequestsQuery = useQuery({
    queryKey: ['notification-subscription-cancellations', subscriptionCancellationsSince],
    queryFn: () =>
      subscriptionService.getCancellationRequests(apiClient, {
        status: 'PENDING',
        page: 1,
        limit: 5,
        dateFrom: subscriptionCancellationsSince,
      }),
    enabled: !!apiClient,
    staleTime: 30000,
  })

  const supportTickets = supportQuery.data?.data?.data || []
  const supportItems = supportTickets.filter(
    (ticket: any) =>
      isNewSince(ticket.createdAt, supportLastVisited) && !isDismissed('support', ticket.id)
  )
  const supportCount = supportItems.length

  const usersPayload = (usersQuery.data as any)?.data?.data ?? (usersQuery.data as any)?.data
  const usersList = Array.isArray(usersPayload?.users) ? usersPayload.users : []
  const usersItems = usersList.filter(
    (user: any) =>
      isNewSince(user.createdAt, usersLastVisited) && !isDismissed('users', user.id)
  )
  const usersTotal = usersPayload?.total ?? usersItems.length
  const usersCount = Math.max(
    0,
    usersTotal - getDismissedCountSince('users', getEffectiveSince(usersLastVisited))
  )

  const products = productsQuery.data?.data?.data || []
  const productsTotal = productsQuery.data?.data?.total ?? products.length
  const productItems = products.filter(
    (product: any) =>
      isNewSince(product.createdAt, productsLastVisited) && !isDismissed('products', product.id)
  )
  const productCount = Math.max(
    0,
    productsTotal - getDismissedCountSince('products', getEffectiveSince(productsLastVisited))
  )

  const services = servicesQuery.data?.data?.data || []
  const servicesTotal = servicesQuery.data?.data?.total ?? services.length
  const serviceItems = services.filter(
    (service: any) =>
      isNewSince(service.createdAt, servicesLastVisited) && !isDismissed('services', service.id)
  )
  const serviceCount = Math.max(
    0,
    servicesTotal - getDismissedCountSince('services', getEffectiveSince(servicesLastVisited))
  )

  const subscriptionRequestsPayload =
    (subscriptionRequestsQuery.data as any)?.data?.data ?? (subscriptionRequestsQuery.data as any)?.data
  const subscriptionRequests = subscriptionRequestsPayload?.requests || []
  const subscriptionRequestItems = subscriptionRequests.filter(
    (request: any) =>
      isNewSince(request.createdAt, subscriptionRequestsLastVisited) &&
      !isDismissed('subscriptionRequests', request.id)
  )
  const subscriptionRequestsTotal = subscriptionRequestsPayload?.total ?? subscriptionRequestItems.length
  const subscriptionRequestsCount = Math.max(
    0,
    subscriptionRequestsTotal -
      getDismissedCountSince(
        'subscriptionRequests',
        getEffectiveSince(subscriptionRequestsLastVisited)
      )
  )

  const cancellationRequestsPayload =
    (cancellationRequestsQuery.data as any)?.data?.data ?? (cancellationRequestsQuery.data as any)?.data
  const cancellationRequests = cancellationRequestsPayload?.requests || []
  const cancellationRequestItems = cancellationRequests.filter(
    (request: any) =>
      isNewSince(request.requestedAt, subscriptionCancellationsLastVisited) &&
      !isDismissed('subscriptionCancellations', request.id)
  )
  const cancellationRequestsTotal = cancellationRequestsPayload?.total ?? cancellationRequestItems.length
  const cancellationRequestsCount = Math.max(
    0,
    cancellationRequestsTotal -
      getDismissedCountSince(
        'subscriptionCancellations',
        getEffectiveSince(subscriptionCancellationsLastVisited)
      )
  )

  const totalNotifications =
    supportCount +
    usersCount +
    productCount +
    serviceCount +
    subscriptionRequestsCount +
    cancellationRequestsCount

  return {
    support: { items: supportItems, count: supportCount },
    users: { items: usersItems, count: usersCount, total: usersTotal },
    products: { items: productItems, count: productCount, total: productsTotal },
    services: { items: serviceItems, count: serviceCount, total: servicesTotal },
    subscriptions: {
      requests: { items: subscriptionRequestItems, count: subscriptionRequestsCount, total: subscriptionRequestsTotal },
      cancellations: {
        items: cancellationRequestItems,
        count: cancellationRequestsCount,
        total: cancellationRequestsTotal,
      },
      count: subscriptionRequestsCount + cancellationRequestsCount,
    },
    total: totalNotifications,
    isLoading:
      supportQuery.isLoading ||
      usersQuery.isLoading ||
      productsQuery.isLoading ||
      servicesQuery.isLoading ||
      subscriptionRequestsQuery.isLoading ||
      cancellationRequestsQuery.isLoading,
  }
}
