/**
 * Subscription Management System Types
 */

// Enums
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',
  PENDING = 'PENDING',
  GRACE_PERIOD = 'GRACE_PERIOD',
}

export enum SubscriptionTier {
  BASIC = 'BASIC',
  ESSENTIAL = 'ESSENTIAL',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

// Interfaces
export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string | null;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  limits: Record<string, any>;
  allowedRoles: string[];
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  stripePriceId?: string;
  stripeProductId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingTierDiscounts {
  yearlyDiscount: number;
  volumeDiscounts: Array<{
    minQuantity: number;
    discountPercentage: number;
  }>;
}

export interface PricingTier {
  id: string;
  role: string;
  subscriptionTier: SubscriptionTier;
  name: string;
  basePrice: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  discounts: PricingTierDiscounts;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  pausedAt?: string;
  pausedUntil?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  cancellationReason?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  isManual: boolean;
  activatedBy?: string;
  activatedAt?: string;
  gracePeriodEnd?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: User;
  organization?: Organization;
  plan: SubscriptionPlan;
  actions?: SubscriptionAction[];
  subscriptionNotes?: SubscriptionNote[];
  schedules?: SubscriptionSchedule[];
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
}

export interface SubscriptionAction {
  id: string;
  subscriptionId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionNote {
  id: string;
  subscriptionId: string;
  note: string;
  isInternal: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SubscriptionSchedule {
  id: string;
  subscriptionId: string;
  scheduledAction: string;
  scheduledDate: string;
  targetPlanId?: string;
  isProcessed: boolean;
  processedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  expiringWithin30Days: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  growthRate: number;
  churnRate: number;
  averageSubscriptionLength: number;
}

// DTOs
export interface CreateSubscriptionDto {
  userId?: string;
  organizationId?: string;
  planId: string;
  tier: SubscriptionTier;
  startDate?: string;
  durationMonths?: number;
  includeTrial?: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  notes?: string;
}

export interface UpdateSubscriptionDto {
  planId?: string;
  tier?: SubscriptionTier;
  currentPeriodEnd?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ActivateSubscriptionDto {
  startDate?: string;
  periodMonths?: number;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface PauseSubscriptionDto {
  pauseUntil?: string;
  reason: string;
  extendEndDate?: boolean;
  notifyCustomer?: boolean;
}

export interface ResumeSubscriptionDto {
  extendPeriod?: boolean;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface CancelSubscriptionDto {
  immediate: boolean;
  reason: string;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface RenewSubscriptionDto {
  periodMonths: number;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface ExtendSubscriptionDto {
  additionalDays: number;
  reason: string;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface UpgradeDowngradeDto {
  newPlanId: string;
  immediate: boolean;
  notifyCustomer?: boolean;
  notes?: string;
}

export interface ScheduleActionDto {
  action: 'ACTIVATE' | 'CANCEL' | 'PAUSE' | 'RESUME' | 'UPGRADE' | 'DOWNGRADE';
  scheduledDate: string;
  targetPlanId?: string;
  notes?: string;
}

export interface AddNoteDto {
  note: string;
  isInternal?: boolean;
}

export interface BulkSubscriptionActionDto {
  subscriptionIds: string[];
  reason?: string;
  notifyCustomers?: boolean;
}

export interface SubscriptionFilters {
  page?: number;
  limit?: number;
  status?: SubscriptionStatus;
  planId?: string;
  userId?: string;
  organizationId?: string;
  isManual?: boolean;
  search?: string;
  expiringBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  role?: string;
}

export interface PaginatedSubscriptions {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Plan DTOs
export interface CreatePlanDto {
  name: string;
  code?: string;
  description: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  features: string[];
  limits: Record<string, any>;
  allowedRoles?: string[];
  trialDays?: number;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

// Pricing tier DTOs
export interface CreatePricingTierDto {
  role: string;
  subscriptionTier: SubscriptionTier;
  name: string;
  basePrice: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly';
  discounts?: Partial<PricingTierDiscounts>;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdatePricingTierDto extends Partial<CreatePricingTierDto> {}

// Utility types
export const SubscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: 'Active',
  [SubscriptionStatus.INACTIVE]: 'Inactive',
  [SubscriptionStatus.PAUSED]: 'Paused',
  [SubscriptionStatus.CANCELLED]: 'Cancelled',
  [SubscriptionStatus.EXPIRED]: 'Expired',
  [SubscriptionStatus.TRIAL]: 'Trial',
  [SubscriptionStatus.PAST_DUE]: 'Past Due',
  [SubscriptionStatus.PENDING]: 'Pending',
  [SubscriptionStatus.GRACE_PERIOD]: 'Grace Period',
};

export const SubscriptionStatusColors: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [SubscriptionStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [SubscriptionStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
  [SubscriptionStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
  [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800',
  [SubscriptionStatus.PAST_DUE]: 'bg-orange-100 text-orange-800',
  [SubscriptionStatus.PENDING]: 'bg-gray-100 text-gray-600',
  [SubscriptionStatus.GRACE_PERIOD]: 'bg-orange-100 text-orange-800',
};

export const SubscriptionTierLabels: Record<SubscriptionTier, string> = {
  [SubscriptionTier.BASIC]: 'Basic',
  [SubscriptionTier.ESSENTIAL]: 'Essential',
  [SubscriptionTier.PROFESSIONAL]: 'Professional',
  [SubscriptionTier.ENTERPRISE]: 'Enterprise',
};
