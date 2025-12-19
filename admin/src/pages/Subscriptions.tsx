import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  X,
  RefreshCcw,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Building2,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { useApiClient } from '../services/api';
import { subscriptionService } from '../services/subscriptionService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionStatusLabels,
  SubscriptionStatusColors,
  SubscriptionTierLabels,
  SubscriptionAnalytics,
  PaginatedSubscriptions,
} from '../types/subscription';
import { useTranslation } from 'react-i18next';

const Subscriptions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<{
    type: 'pause' | 'cancel' | 'renew' | 'extend' | 'upgrade' | 'downgrade' | null;
    subscription: Subscription | null;
  }>({ type: null, subscription: null });
  const [actionReason, setActionReason] = useState('');
  const [actionDays, setActionDays] = useState(30);
  const [selectedNewPlanId, setSelectedNewPlanId] = useState('');

  const apiClient = useApiClient();
  const { t } = useTranslation(['common', 'admin']);
  const queryClient = useQueryClient();

  // Fetch subscriptions
  const { data: subscriptionsResponse, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['subscriptions', page, limit, selectedStatus, selectedPlanId, searchQuery],
    queryFn: () =>
      subscriptionService.getSubscriptions(apiClient, {
        page,
        limit,
        status: selectedStatus || undefined,
        planId: selectedPlanId || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Fetch subscription plans
  const { data: plansResponse } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(apiClient),
  });

  // Fetch analytics
  const { data: analyticsResponse } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: () => subscriptionService.getSubscriptionAnalytics(apiClient, '30d'),
  });

  // Fetch expiring subscriptions
  const { data: expiringResponse } = useQuery({
    queryKey: ['expiring-subscriptions'],
    queryFn: () => subscriptionService.getExpiringSubscriptions(apiClient, 30),
  });

  const subscriptionData: PaginatedSubscriptions = subscriptionsResponse?.data?.data || {
    subscriptions: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
  const plans: SubscriptionPlan[] = plansResponse?.data?.data || [];
  const analytics: SubscriptionAnalytics | null = analyticsResponse?.data?.data || null;
  const expiringSubscriptions: Subscription[] = expiringResponse?.data?.data || [];

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: string) => subscriptionService.activateSubscription(apiClient, id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      subscriptionService.pauseSubscription(apiClient, id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
      setActionReason('');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => subscriptionService.resumeSubscription(apiClient, id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason, immediate }: { id: string; reason: string; immediate: boolean }) =>
      subscriptionService.cancelSubscription(apiClient, id, { reason, immediate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
      setActionReason('');
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, periodMonths }: { id: string; periodMonths: number }) =>
      subscriptionService.renewSubscription(apiClient, id, { periodMonths }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, additionalDays, reason }: { id: string; additionalDays: number; reason: string }) =>
      subscriptionService.extendSubscription(apiClient, id, { additionalDays, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
      setActionReason('');
      setActionDays(30);
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ id, newPlanId }: { id: string; newPlanId: string }) =>
      subscriptionService.upgradeSubscription(apiClient, id, { newPlanId, immediate: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
      setSelectedNewPlanId('');
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: ({ id, newPlanId }: { id: string; newPlanId: string }) =>
      subscriptionService.downgradeSubscription(apiClient, id, { newPlanId, immediate: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setShowActionModal({ type: null, subscription: null });
      setSelectedNewPlanId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionService.deleteSubscription(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setSelectedSubscription(null);
    },
  });

  const handleAction = () => {
    if (!showActionModal.subscription) return;
    const id = showActionModal.subscription.id;

    switch (showActionModal.type) {
      case 'pause':
        pauseMutation.mutate({ id, reason: actionReason });
        break;
      case 'cancel':
        cancelMutation.mutate({ id, reason: actionReason, immediate: false });
        break;
      case 'renew':
        renewMutation.mutate({ id, periodMonths: 1 });
        break;
      case 'extend':
        extendMutation.mutate({ id, additionalDays: actionDays, reason: actionReason });
        break;
      case 'upgrade':
        if (selectedNewPlanId) {
          upgradeMutation.mutate({ id, newPlanId: selectedNewPlanId });
        }
        break;
      case 'downgrade':
        if (selectedNewPlanId) {
          downgradeMutation.mutate({ id, newPlanId: selectedNewPlanId });
        }
        break;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-CH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getSubscriberName = (subscription: Subscription): string => {
    if (subscription.user) {
      return `${subscription.user.firstName || ''} ${subscription.user.lastName || ''}`.trim() || subscription.user.email;
    }
    if (subscription.organization) {
      return subscription.organization.name;
    }
    return 'Unknown';
  };

  const getSubscriberIcon = (subscription: Subscription) => {
    return subscription.organization ? (
      <Building2 className="w-4 h-4 text-gray-500" />
    ) : (
      <Users className="w-4 h-4 text-gray-500" />
    );
  };

  // Stats cards
  const statsCards = [
    {
      title: t('admin:subscriptions.stats.activeSubscriptions'),
      value: analytics?.activeSubscriptions || 0,
      icon: <CreditCard className="w-6 h-6 text-green-600" />,
      color: 'bg-green-50 border-green-200',
    },
    {
      title: t('admin:subscriptions.stats.trialSubscriptions'),
      value: analytics?.trialSubscriptions || 0,
      icon: <Clock className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: t('admin:subscriptions.stats.expiringSoon'),
      value: analytics?.expiringWithin30Days || 0,
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      title: t('admin:subscriptions.stats.monthlyRevenue'),
      value: formatCurrency(analytics?.monthlyRecurringRevenue || 0),
      icon: <DollarSign className="w-6 h-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200',
      isText: true,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin:subscriptions.title')}</h1>
          <p className="text-gray-500 mt-1">{t('admin:subscriptions.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('admin:subscriptions.newSubscription')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} border rounded-lg p-4 flex items-center justify-between`}
          >
            <div>
              <p className="text-sm text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {stat.isText ? stat.value : stat.value.toLocaleString()}
              </p>
            </div>
            {stat.icon}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('admin:subscriptions.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as SubscriptionStatus | '')}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('admin:subscriptions.filters.allStatuses')}</option>
          {Object.values(SubscriptionStatus).map((status) => (
            <option key={status} value={status}>
              {t(`admin:subscriptions.status.${status.toLowerCase()}`)}
            </option>
          ))}
        </select>

        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('admin:subscriptions.filters.allPlans')}</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setSelectedStatus('');
            setSelectedPlanId('');
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
        >
          {t('admin:subscriptions.filters.clearFilters')}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscriptions List */}
        <div className="lg:col-span-2 bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">
              Subscriptions ({subscriptionData.total})
            </h2>
          </div>

          {subscriptionsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : subscriptionData.subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {t('admin:subscriptions.noSubscriptions')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.table.subscriber')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.table.plan')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.table.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.table.periodEnd')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subscriptionData.subscriptions.map((subscription) => (
                      <tr
                        key={subscription.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedSubscription?.id === subscription.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedSubscription(subscription)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getSubscriberIcon(subscription)}
                            <span className="font-medium text-gray-900">
                              {getSubscriberName(subscription)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {subscription.plan?.name || 'Unknown Plan'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              SubscriptionStatusColors[subscription.status]
                            }`}
                          >
                            {t(`admin:subscriptions.status.${subscription.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(subscription.currentPeriodEnd)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {subscription.status === 'PENDING' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  activateMutation.mutate(subscription.id);
                                }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Activate"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {(subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowActionModal({ type: 'pause', subscription });
                                }}
                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Pause"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {subscription.status === 'PAUSED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resumeMutation.mutate(subscription.id);
                                }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Resume"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowActionModal({ type: 'cancel', subscription });
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  {t('admin:subscriptions.pagination.showing', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, subscriptionData.total),
                    total: subscriptionData.total,
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin:subscriptions.pagination.previous')}
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= subscriptionData.totalPages}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin:subscriptions.pagination.next')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Subscription Details / Sidebar */}
        <div className="space-y-4">
          {/* Subscription Details */}
          {selectedSubscription ? (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">{t('admin:subscriptions.details.title')}</h3>
                <button
                  onClick={() => setSelectedSubscription(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.subscriber')}</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getSubscriberIcon(selectedSubscription)}
                    <span className="font-medium">{getSubscriberName(selectedSubscription)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.plan')}</label>
                    <p className="font-medium">{selectedSubscription.plan?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.tier')}</label>
                    <p className="font-medium">
                      {t(`admin:subscriptions.tier.${selectedSubscription.tier.toLowerCase()}`)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.status')}</label>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        SubscriptionStatusColors[selectedSubscription.status]
                      }`}
                    >
                      {t(`admin:subscriptions.status.${selectedSubscription.status.toLowerCase()}`)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.periodStart')}</label>
                    <p className="text-sm">{formatDate(selectedSubscription.currentPeriodStart)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.periodEnd')}</label>
                    <p className="text-sm">{formatDate(selectedSubscription.currentPeriodEnd)}</p>
                  </div>
                </div>

                {selectedSubscription.trialEnd && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.trialEnd')}</label>
                    <p className="text-sm">{formatDate(selectedSubscription.trialEnd)}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.type')}</label>
                  <p className="text-sm">
                    {selectedSubscription.isManual ? t('admin:subscriptions.details.manual') : t('admin:subscriptions.details.stripeManaged')}
                  </p>
                </div>

                {selectedSubscription.notes && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">{t('admin:subscriptions.details.notes')}</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedSubscription.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        setShowActionModal({ type: 'extend', subscription: selectedSubscription })
                      }
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    >
                      <Calendar className="w-4 h-4" />
                      {t('admin:subscriptions.actions.extend')}
                    </button>
                    <button
                      onClick={() =>
                        setShowActionModal({ type: 'renew', subscription: selectedSubscription })
                      }
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {t('admin:subscriptions.actions.renew')}
                    </button>
                    <button
                      onClick={() =>
                        setShowActionModal({ type: 'upgrade', subscription: selectedSubscription })
                      }
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      {t('admin:subscriptions.actions.upgrade')}
                    </button>
                    <button
                      onClick={() =>
                        setShowActionModal({ type: 'downgrade', subscription: selectedSubscription })
                      }
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                      {t('admin:subscriptions.actions.downgrade')}
                    </button>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(selectedSubscription.id)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('admin:subscriptions.actions.delete')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{t('admin:subscriptions.details.selectSubscription')}</p>
            </div>
          )}

          {/* Expiring Soon */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                {t('admin:subscriptions.expiring.title')}
              </h3>
            </div>
            <div className="p-4">
              {expiringSubscriptions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t('admin:subscriptions.expiring.noSubscriptions')}
                </p>
              ) : (
                <div className="space-y-3">
                  {expiringSubscriptions.slice(0, 5).map((subscription) => (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedSubscription(subscription)}
                    >
                      <div className="flex items-center gap-2">
                        {getSubscriberIcon(subscription)}
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {getSubscriberName(subscription)}
                        </span>
                      </div>
                      <span className="text-xs text-orange-600 font-medium">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal.type && showActionModal.subscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t(`admin:subscriptions.modal.${showActionModal.type}.title`)}
            </h3>

            <p className="text-gray-600 mb-4">
              {t(`admin:subscriptions.modal.${showActionModal.type}.description`)}
            </p>

            {(showActionModal.type === 'pause' ||
              showActionModal.type === 'cancel' ||
              showActionModal.type === 'extend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:subscriptions.modal.reason')}</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t('admin:subscriptions.modal.reasonPlaceholder')}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            )}

            {showActionModal.type === 'extend' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:subscriptions.modal.extend.additionalDays')}
                </label>
                <input
                  type="number"
                  value={actionDays}
                  onChange={(e) => setActionDays(parseInt(e.target.value) || 0)}
                  min={1}
                  max={365}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {(showActionModal.type === 'upgrade' || showActionModal.type === 'downgrade') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:subscriptions.modal.newPlan')}</label>
                <select
                  value={selectedNewPlanId}
                  onChange={(e) => setSelectedNewPlanId(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('admin:subscriptions.modal.selectPlan')}</option>
                  {plans
                    .filter((p) => p.id !== showActionModal.subscription?.planId)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.price, plan.currency)}/{plan.billingPeriod}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal({ type: null, subscription: null });
                  setActionReason('');
                  setActionDays(30);
                  setSelectedNewPlanId('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                {t('admin:subscriptions.modal.cancelButton')}
              </button>
              <button
                onClick={handleAction}
                disabled={
                  ((showActionModal.type === 'pause' || showActionModal.type === 'cancel') &&
                    !actionReason) ||
                  (showActionModal.type === 'extend' && (!actionReason || actionDays < 1)) ||
                  ((showActionModal.type === 'upgrade' || showActionModal.type === 'downgrade') &&
                    !selectedNewPlanId)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('admin:subscriptions.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <CreateSubscriptionModal
          plans={plans}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
          }}
          apiClient={apiClient}
        />
      )}
    </div>
  );
};

// Create Subscription Modal Component
const CreateSubscriptionModal: React.FC<{
  plans: SubscriptionPlan[];
  onClose: () => void;
  onSuccess: () => void;
  apiClient: any;
}> = ({ plans, onClose, onSuccess, apiClient }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [formData, setFormData] = useState({
    userId: '',
    organizationId: '',
    planId: '',
    tier: 'BASIC' as SubscriptionTier,
    durationMonths: 1,
    includeTrial: false,
    notes: '',
  });
  const [subscriberType, setSubscriberType] = useState<'user' | 'organization'>('user');

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createSubscription(apiClient, {
        userId: subscriberType === 'user' ? formData.userId : undefined,
        organizationId: subscriberType === 'organization' ? formData.organizationId : undefined,
        planId: formData.planId,
        tier: formData.tier,
        durationMonths: formData.durationMonths,
        includeTrial: formData.includeTrial,
        notes: formData.notes || undefined,
      }),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const selectedPlan = plans.find((p) => p.id === formData.planId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">{t('admin:subscriptions.create.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subscriber Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin:subscriptions.create.subscriberType')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="user"
                  checked={subscriberType === 'user'}
                  onChange={() => setSubscriberType('user')}
                  className="text-blue-600"
                />
                <Users className="w-4 h-4" />
                {t('admin:subscriptions.create.user')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="organization"
                  checked={subscriberType === 'organization'}
                  onChange={() => setSubscriberType('organization')}
                  className="text-blue-600"
                />
                <Building2 className="w-4 h-4" />
                {t('admin:subscriptions.create.organization')}
              </label>
            </div>
          </div>

          {/* Subscriber ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {subscriberType === 'user' ? t('admin:subscriptions.create.userId') : t('admin:subscriptions.create.organizationId')}
            </label>
            <input
              type="text"
              value={subscriberType === 'user' ? formData.userId : formData.organizationId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [subscriberType === 'user' ? 'userId' : 'organizationId']: e.target.value,
                })
              }
              placeholder={subscriberType === 'user' ? t('admin:subscriptions.create.userIdPlaceholder') : t('admin:subscriptions.create.organizationIdPlaceholder')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:subscriptions.create.plan')}</label>
            <select
              value={formData.planId}
              onChange={(e) => {
                const plan = plans.find((p) => p.id === e.target.value);
                setFormData({
                  ...formData,
                  planId: e.target.value,
                  tier: (plan?.name.toUpperCase() as SubscriptionTier) || 'BASIC',
                });
              }}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">{t('admin:subscriptions.create.selectPlan')}</option>
              {plans.filter((p) => p.isActive).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {new Intl.NumberFormat('de-CH', {
                    style: 'currency',
                    currency: plan.currency,
                  }).format(plan.price)}/{plan.billingPeriod}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:subscriptions.create.duration')}</label>
            <input
              type="number"
              value={formData.durationMonths}
              onChange={(e) =>
                setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 1 })
              }
              min={1}
              max={36}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Include Trial */}
          {selectedPlan && selectedPlan.trialDays > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeTrial"
                checked={formData.includeTrial}
                onChange={(e) => setFormData({ ...formData, includeTrial: e.target.checked })}
                className="text-blue-600 rounded"
              />
              <label htmlFor="includeTrial" className="text-sm text-gray-700">
                {t('admin:subscriptions.create.includeTrial', { days: selectedPlan.trialDays })}
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:subscriptions.create.notes')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('admin:subscriptions.create.notesPlaceholder')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {t('admin:subscriptions.modal.cancelButton')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? t('admin:subscriptions.create.creating') : t('admin:subscriptions.create.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Subscriptions;
