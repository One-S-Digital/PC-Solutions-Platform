/**
 * Subscription Management API Service
 */
import { AxiosInstance } from 'axios';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionAction,
  SubscriptionNote,
  SubscriptionSchedule,
  SubscriptionAnalytics,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  ActivateSubscriptionDto,
  PauseSubscriptionDto,
  ResumeSubscriptionDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
  ExtendSubscriptionDto,
  UpgradeDowngradeDto,
  ScheduleActionDto,
  AddNoteDto,
  BulkSubscriptionActionDto,
  SubscriptionFilters,
  PaginatedSubscriptions,
  CreatePlanDto,
  UpdatePlanDto,
  PricingTier,
  CreatePricingTierDto,
  UpdatePricingTierDto,
} from '../types/subscription';

// API Response wrapper type
interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

/**
 * Subscription Management Service
 */
export const subscriptionService = {
  // =====================================
  // SUBSCRIPTION PLAN MANAGEMENT
  // =====================================

  /** Create a new subscription plan */
  createPlan: (apiClient: AxiosInstance, data: CreatePlanDto) =>
    apiClient.post<ApiResponse<SubscriptionPlan>>('/admin/subscription-management/plans', data),

  /** Get all subscription plans */
  getPlans: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<SubscriptionPlan[]>>('/admin/subscription-management/plans'),

  /** Get active subscription plans only */
  getActivePlans: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<SubscriptionPlan[]>>('/admin/subscription-management/plans/active'),

  /** Get a subscription plan by ID */
  getPlanById: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<SubscriptionPlan>>(`/admin/subscription-management/plans/${id}`),

  /** Update a subscription plan */
  updatePlan: (apiClient: AxiosInstance, id: string, data: UpdatePlanDto) =>
    apiClient.put<ApiResponse<SubscriptionPlan>>(`/admin/subscription-management/plans/${id}`, data),

  /** Delete a subscription plan */
  deletePlan: (apiClient: AxiosInstance, id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/subscription-management/plans/${id}`),

  // =====================================
  // SUBSCRIPTION CRUD
  // =====================================

  /** Create a new subscription */
  createSubscription: (apiClient: AxiosInstance, data: CreateSubscriptionDto) =>
    apiClient.post<ApiResponse<Subscription>>('/admin/subscription-management/subscriptions', data),

  /** Get all subscriptions with filters and pagination */
  getSubscriptions: (apiClient: AxiosInstance, filters?: SubscriptionFilters) =>
    apiClient.get<ApiResponse<PaginatedSubscriptions>>('/admin/subscription-management/subscriptions', {
      params: filters,
    }),

  /** Get a subscription by ID */
  getSubscriptionById: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}`),

  /** Update a subscription */
  updateSubscription: (apiClient: AxiosInstance, id: string, data: UpdateSubscriptionDto) =>
    apiClient.put<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}`, data),

  /** Delete a subscription */
  deleteSubscription: (apiClient: AxiosInstance, id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/subscription-management/subscriptions/${id}`),

  /** Get subscriptions expiring within N days */
  getExpiringSubscriptions: (apiClient: AxiosInstance, daysAhead: number = 30) =>
    apiClient.get<ApiResponse<Subscription[]>>('/admin/subscription-management/subscriptions/expiring', {
      params: { daysAhead },
    }),

  /** Get user's subscription */
  getUserSubscription: (apiClient: AxiosInstance, userId: string) =>
    apiClient.get<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/user/${userId}`),

  /** Get organization's subscription */
  getOrganizationSubscription: (apiClient: AxiosInstance, organizationId: string) =>
    apiClient.get<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/organization/${organizationId}`),

  // =====================================
  // SUBSCRIPTION STATUS MANAGEMENT
  // =====================================

  /** Activate a subscription */
  activateSubscription: (apiClient: AxiosInstance, id: string, data: ActivateSubscriptionDto = {}) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/activate`, data),

  /** Pause a subscription */
  pauseSubscription: (apiClient: AxiosInstance, id: string, data: PauseSubscriptionDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/pause`, data),

  /** Resume a paused subscription */
  resumeSubscription: (apiClient: AxiosInstance, id: string, data: ResumeSubscriptionDto = {}) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/resume`, data),

  /** Cancel a subscription */
  cancelSubscription: (apiClient: AxiosInstance, id: string, data: CancelSubscriptionDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/cancel`, data),

  /** Renew a subscription */
  renewSubscription: (apiClient: AxiosInstance, id: string, data: RenewSubscriptionDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/renew`, data),

  /** Extend a subscription */
  extendSubscription: (apiClient: AxiosInstance, id: string, data: ExtendSubscriptionDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/extend`, data),

  /** Upgrade a subscription to a higher plan */
  upgradeSubscription: (apiClient: AxiosInstance, id: string, data: UpgradeDowngradeDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/upgrade`, data),

  /** Downgrade a subscription to a lower plan */
  downgradeSubscription: (apiClient: AxiosInstance, id: string, data: UpgradeDowngradeDto) =>
    apiClient.post<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/downgrade`, data),

  /** Update subscription status directly */
  updateSubscriptionStatus: (apiClient: AxiosInstance, id: string, status: string, cancelAtPeriodEnd?: boolean) =>
    apiClient.put<ApiResponse<Subscription>>(`/admin/subscription-management/subscriptions/${id}/status`, { status, cancelAtPeriodEnd }),

  // =====================================
  // SUBSCRIPTION HISTORY & NOTES
  // =====================================

  /** Get subscription action history */
  getSubscriptionHistory: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<SubscriptionAction[]>>(`/admin/subscription-management/subscriptions/${id}/history`),

  /** Get subscription notes */
  getSubscriptionNotes: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<SubscriptionNote[]>>(`/admin/subscription-management/subscriptions/${id}/notes`),

  /** Add a note to a subscription */
  addSubscriptionNote: (apiClient: AxiosInstance, id: string, data: AddNoteDto) =>
    apiClient.post<ApiResponse<SubscriptionNote>>(`/admin/subscription-management/subscriptions/${id}/notes`, data),

  // =====================================
  // SCHEDULED ACTIONS
  // =====================================

  /** Get pending scheduled actions for a subscription */
  getSubscriptionSchedules: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<SubscriptionSchedule[]>>(`/admin/subscription-management/subscriptions/${id}/schedules`),

  /** Schedule a future action for a subscription */
  scheduleSubscriptionAction: (apiClient: AxiosInstance, id: string, data: ScheduleActionDto) =>
    apiClient.post<ApiResponse<SubscriptionSchedule>>(`/admin/subscription-management/subscriptions/${id}/schedule`, data),

  /** Cancel a scheduled action */
  cancelScheduledAction: (apiClient: AxiosInstance, scheduleId: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/subscription-management/subscriptions/schedules/${scheduleId}`),

  // =====================================
  // BULK OPERATIONS
  // =====================================

  /** Bulk pause multiple subscriptions */
  bulkPauseSubscriptions: (apiClient: AxiosInstance, data: BulkSubscriptionActionDto) =>
    apiClient.post<ApiResponse<{ success: boolean; count: number }>>('/admin/subscription-management/subscriptions/bulk/pause', data),

  /** Bulk cancel multiple subscriptions */
  bulkCancelSubscriptions: (apiClient: AxiosInstance, data: BulkSubscriptionActionDto) =>
    apiClient.post<ApiResponse<{ success: boolean; count: number }>>('/admin/subscription-management/subscriptions/bulk/cancel', data),

  // =====================================
  // ANALYTICS
  // =====================================

  /** Get subscription analytics */
  getSubscriptionAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') =>
    apiClient.get<ApiResponse<SubscriptionAnalytics>>('/admin/subscription-management/analytics', {
      params: { timeRange },
    }),

  /** Get subscription stats */
  getSubscriptionStats: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/stats'),

  // =====================================
  // FEATURE ACCESS
  // =====================================

  /** Check if a user has access to a feature */
  checkFeatureAccess: (apiClient: AxiosInstance, userId: string, feature: string) =>
    apiClient.get<ApiResponse<{ hasAccess: boolean }>>(`/admin/subscription-management/feature-access/${userId}/${feature}`),

  // =====================================
  // BILLING
  // =====================================

  /** Process billing cycle (for manual subscriptions) */
  processBillingCycle: (apiClient: AxiosInstance) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/admin/subscription-management/billing/process-cycle'),

  /** Get billing transactions */
  getBillingTransactions: (apiClient: AxiosInstance, params?: {
    page?: number;
    limit?: number;
    status?: string;
    subscriptionId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/billing/transactions', { params }),

  /** Get billing analytics */
  getBillingAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/billing/analytics', {
      params: { timeRange },
    }),

  // =====================================
  // PRICING TIERS (SUBSCRIPTION TIERS)
  // =====================================

  /** Create a pricing tier (scoped by role + subscriptionTier) */
  createPricingTier: (apiClient: AxiosInstance, data: CreatePricingTierDto) =>
    apiClient.post<ApiResponse<PricingTier>>('/admin/subscription-management/pricing/tiers', data),

  /** Get pricing tiers (supports role/subscriptionTier filters) */
  getPricingTiers: (
    apiClient: AxiosInstance,
    params?: { role?: string; subscriptionTier?: string; includeInactive?: boolean },
  ) =>
    apiClient.get<ApiResponse<PricingTier[]>>('/admin/subscription-management/pricing/tiers', { params }),

  /** Update a pricing tier */
  updatePricingTier: (apiClient: AxiosInstance, id: string, data: UpdatePricingTierDto) =>
    apiClient.put<ApiResponse<PricingTier>>(`/admin/subscription-management/pricing/tiers/${id}`, data),

  /** Delete a pricing tier */
  deletePricingTier: (apiClient: AxiosInstance, id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/subscription-management/pricing/tiers/${id}`),

  // =====================================
  // SUBSCRIPTION REQUESTS
  // =====================================

  /** Get all subscription requests */
  getSubscriptionRequests: (apiClient: AxiosInstance, params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    role?: string;
  }) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/requests', { params }),

  /** Get subscription request analytics */
  getSubscriptionRequestAnalytics: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/requests/analytics'),

  /** Get next invoice number */
  getNextInvoiceNumber: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<{ invoiceNumber: string }>>('/admin/subscription-management/requests/next-invoice-number'),

  /** Get single subscription request */
  getSubscriptionRequestById: (apiClient: AxiosInstance, id: string) =>
    apiClient.get<ApiResponse<any>>(`/admin/subscription-management/requests/${id}`),

  /** Mark request as under review */
  reviewSubscriptionRequest: (apiClient: AxiosInstance, id: string, data: { notes?: string }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/review`, data),

  /** Send invoice for request */
  sendInvoiceForRequest: (apiClient: AxiosInstance, id: string, data: {
    invoiceNumber: string;
    invoiceAmount: number;
    invoiceCurrency?: string;
    sendEmail?: boolean;
    notes?: string;
  }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/send-invoice`, data),

  /** Confirm payment for request */
  confirmPaymentForRequest: (apiClient: AxiosInstance, id: string, data: {
    paymentReference?: string;
    paymentDate?: string;
    autoActivate?: boolean;
    notes?: string;
  }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/confirm-payment`, data),

  /** Activate subscription from request */
  activateSubscriptionRequest: (apiClient: AxiosInstance, id: string, data: {
    startDate?: string;
    periodMonths?: number;
    includeTrial?: boolean;
    trialStartDate?: string;
    trialEndDate?: string;
    sendEmail?: boolean;
    notes?: string;
  }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/activate`, data),

  /** Decline subscription request */
  declineSubscriptionRequest: (apiClient: AxiosInstance, id: string, data: {
    reason: string;
    sendEmail?: boolean;
    notes?: string;
  }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/decline`, data),

  /** Add note to request */
  addNoteToRequest: (apiClient: AxiosInstance, id: string, data: {
    note: string;
    isInternal?: boolean;
  }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/requests/${id}/notes`, data),

  // =====================================
  // SUBSCRIPTION SETTINGS
  // =====================================

  /** Get subscription settings */
  getSubscriptionSettings: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/settings'),

  /** Update subscription settings */
  updateSubscriptionSettings: (apiClient: AxiosInstance, data: {
    notificationEmail?: string;
    enableEmailNotifications?: boolean;
    defaultTrialDays?: number;
    defaultGracePeriodDays?: number;
    invoicePrefix?: string;
    invoiceNextNumber?: number;
    paymentTermsDays?: number;
    estimatedResponseHours?: number;
  }) =>
    apiClient.put<ApiResponse<any>>('/admin/subscription-management/settings', data),

  // =====================================
  // SUBSCRIPTION CANCELLATION REQUESTS
  // =====================================

  /** Get all subscription cancellation requests */
  getCancellationRequests: (apiClient: AxiosInstance, params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    subscriptionId?: string;
    role?: string;
  }) =>
    apiClient.get<ApiResponse<any>>('/admin/subscription-management/cancellation-requests', { params }),

  /** Approve a cancellation request (optionally immediate) */
  approveCancellationRequest: (apiClient: AxiosInstance, id: string, data?: { immediate?: boolean; reason?: string; notes?: string }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/cancellation-requests/${id}/approve`, data || {}),

  /** Decline a cancellation request */
  declineCancellationRequest: (apiClient: AxiosInstance, id: string, data?: { notes?: string }) =>
    apiClient.post<ApiResponse<any>>(`/admin/subscription-management/cancellation-requests/${id}/decline`, data || {}),
};

export default subscriptionService;
