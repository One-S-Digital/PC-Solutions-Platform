import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
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
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  ChevronLeft,
  GraduationCap,
  Package,
  Wrench,
  Heart,
  Shield,
  Edit,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  MessageSquare,
  ClipboardList,
  Settings,
  Mail,
} from 'lucide-react';
import { useApiClient, apiService } from '../services/api';
import { subscriptionService } from '../services/subscriptionService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionStatusColors,
  SubscriptionAnalytics,
  PaginatedSubscriptions,
  PricingTier,
} from '../types/subscription';
import { UserRole } from '../types';
import { User } from '../types/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Locale constant for currency formatting
const CURRENCY_LOCALE = 'de-CH';

// Role configuration with icons and colors - labels are translation keys
const roleConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; labelKey: string }> = {
  [UserRole.FOUNDATION]: {
    icon: <Building2 className="w-8 h-8" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    labelKey: 'admin:subscriptions.roles.foundations',
  },
  [UserRole.PRODUCT_SUPPLIER]: {
    icon: <Package className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    labelKey: 'admin:subscriptions.roles.productSuppliers',
  },
  [UserRole.SERVICE_PROVIDER]: {
    icon: <Wrench className="w-8 h-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    labelKey: 'admin:subscriptions.roles.serviceProviders',
  },
  [UserRole.EDUCATOR]: {
    icon: <GraduationCap className="w-8 h-8" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    labelKey: 'admin:subscriptions.roles.educators',
  },
  [UserRole.PARENT]: {
    icon: <Heart className="w-8 h-8" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
    labelKey: 'admin:subscriptions.roles.parents',
  },
};

// Subscription status options - reusing SubscriptionStatusColors for consistency
// Labels are translation keys under admin:subscriptions.status.*
const subscriptionStatusOptions = [
  { value: SubscriptionStatus.ACTIVE, labelKey: 'active', color: SubscriptionStatusColors[SubscriptionStatus.ACTIVE] },
  { value: SubscriptionStatus.INACTIVE, labelKey: 'inactive', color: SubscriptionStatusColors[SubscriptionStatus.INACTIVE] },
  { value: SubscriptionStatus.PAUSED, labelKey: 'paused', color: SubscriptionStatusColors[SubscriptionStatus.PAUSED] },
  { value: SubscriptionStatus.CANCELLED, labelKey: 'cancelled', color: SubscriptionStatusColors[SubscriptionStatus.CANCELLED] },
  { value: SubscriptionStatus.TRIAL, labelKey: 'trial', color: SubscriptionStatusColors[SubscriptionStatus.TRIAL] },
  { value: SubscriptionStatus.PENDING, labelKey: 'pending', color: SubscriptionStatusColors[SubscriptionStatus.PENDING] },
  { value: SubscriptionStatus.EXPIRED, labelKey: 'expired', color: SubscriptionStatusColors[SubscriptionStatus.EXPIRED] },
  { value: SubscriptionStatus.PAST_DUE, labelKey: 'past_due', color: SubscriptionStatusColors[SubscriptionStatus.PAST_DUE] },
  { value: SubscriptionStatus.GRACE_PERIOD, labelKey: 'grace_period', color: SubscriptionStatusColors[SubscriptionStatus.GRACE_PERIOD] },
];

// Edit Subscription Modal Component
interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  availableTiers?: SubscriptionTier[];
  onSave: (data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; durationMonths?: number; notes?: string }) => Promise<void>;
  onDelete?: () => void;
  isLoading: boolean;
}

const EditSubscriptionModal: React.FC<EditSubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  subscription,
  plans,
  availableTiers,
  onSave,
  onDelete,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status || SubscriptionStatus.INACTIVE);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(subscription?.planId || '');
  const [tier, setTier] = useState<SubscriptionTier>(subscription?.tier || SubscriptionTier.BASIC);
  const [durationMonths, setDurationMonths] = useState<number>(-1); // -1 = no selection (user must choose)
  const [notes, setNotes] = useState<string>(subscription?.notes || '');

  // Subscription period options (0 = monthly recurring with no fixed end, -1 = no selection)
  const subscriptionPeriodOptions = React.useMemo(() => [
    { value: -1, label: t('admin:subscriptions.editSubscription.period.selectPeriod', 'Select a period...') },
    { value: 0, label: t('admin:subscriptions.editSubscription.period.monthlyRecurring', 'Monthly Recurring') },
    { value: 1, label: t('admin:subscriptions.editSubscription.period.oneMonth', '1 Month') },
    { value: 3, label: t('admin:subscriptions.editSubscription.period.threeMonths', '3 Months') },
    { value: 6, label: t('admin:subscriptions.editSubscription.period.sixMonths', '6 Months') },
    { value: 12, label: t('admin:subscriptions.editSubscription.period.oneYear', '1 Year') },
    { value: 24, label: t('admin:subscriptions.editSubscription.period.twoYears', '2 Years') },
  ], [t]);

  const billingPeriodLabel = React.useCallback(
    (period: string | null | undefined) => {
      const normalized = (period || '').trim().toLowerCase().replace(/\s+/g, ' ');
      switch (normalized) {
        case '30 days':
        case '30 day':
        case '30-day':
          return t('admin:subscriptions.planEditor.billingOptions.thirtyDays', '30 Days');
        case 'monthly recurring':
          return t('admin:subscriptions.planEditor.billingOptions.monthlyRecurring', 'Monthly Recurring');
        case '1 year':
        case '1 yr':
        case 'one year':
          return t('admin:subscriptions.planEditor.billingOptions.oneYear', '1 Year');
        case 'monthly':
          return t('admin:subscriptions.planEditor.billingOptions.monthly', 'Monthly');
        case 'quarterly':
          return t('admin:subscriptions.planEditor.billingOptions.quarterly', 'Quarterly');
        case 'yearly':
        case 'annual':
        case 'annually':
          return t('admin:subscriptions.planEditor.billingOptions.yearly', 'Yearly');
        default:
          return period || t('common:notAvailable', 'N/A');
      }
    },
    [t]
  );

  React.useEffect(() => {
    if (subscription) {
      setStatus(subscription.status);
      setSelectedPlanId(subscription.planId || '');
      setTier(subscription.tier || SubscriptionTier.BASIC);
      // Calculate duration from current period if available
      if (subscription.currentPeriodStart && subscription.currentPeriodEnd) {
        const start = new Date(subscription.currentPeriodStart);
        const end = new Date(subscription.currentPeriodEnd);
        const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
        // Check if this is a monthly recurring subscription
        // Monthly recurring = ~1 month period AND cancelAtPeriodEnd is false (auto-renews)
        if (months <= 1 && subscription.cancelAtPeriodEnd === false) {
          setDurationMonths(0); // Monthly Recurring
        } else if (months <= 1) {
          setDurationMonths(1);
        } else if (months <= 3) {
          setDurationMonths(3);
        } else if (months <= 6) {
          setDurationMonths(6);
        } else if (months <= 12) {
          setDurationMonths(12);
        } else {
          setDurationMonths(24);
        }
      } else {
        // No period set - default to Monthly Recurring if cancelAtPeriodEnd is false
        if (subscription.cancelAtPeriodEnd === false) {
          setDurationMonths(0);
        } else {
          setDurationMonths(12);
        }
      }
      setNotes(subscription.notes || '');
    } else {
      setStatus(SubscriptionStatus.INACTIVE);
      setSelectedPlanId('');
      setTier(SubscriptionTier.BASIC);
      setDurationMonths(-1); // No default - user must select
      setNotes('');
    }
  }, [subscription]);

  // Handle Escape key to close modal - must be before any early returns to comply with Rules of Hooks
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Early return AFTER all hooks to comply with React's Rules of Hooks
  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      status,
      planId: selectedPlanId || undefined,
      tier: user?.role === UserRole.FOUNDATION ? tier : undefined,
      durationMonths,
      notes: notes || undefined,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 id="subscription-modal-title" className="text-lg font-semibold">
            {subscription ? t('admin:subscriptions.editSubscription.title', 'Edit Subscription') : t('admin:subscriptions.createSubscription.title', 'Create Subscription')}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('common:close', 'Close modal')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info with Subscription Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-swiss-teal flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {(user.firstName || user.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.name || user.email || t('common:unknown', 'Unknown')}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mt-1">
                  {user.role}
                </span>
              </div>
            </div>
            {subscription ? (
              <div className="flex flex-col items-end gap-1">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  subscription.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                  subscription.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                  subscription.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {subscription.status}
                </span>
                <span className="text-xs text-gray-500">
                  {subscription.plan?.name || t('common:notAvailable', 'N/A')}
                </span>
              </div>
            ) : (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {t('admin:subscriptions.noSubscription', 'No Subscription')}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subscription Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.editSubscription.status', 'Subscription Status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {subscriptionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`admin:subscriptions.status.${option.labelKey}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Tier (Foundation only) */}
          {user?.role === UserRole.FOUNDATION && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.details.tier', 'Subscription Tier')}
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(availableTiers && availableTiers.length > 0 ? availableTiers : Object.values(SubscriptionTier)).map(
                  (tierValue) => (
                    <option key={tierValue} value={tierValue}>
                      {t(`admin:subscriptions.tier.${tierValue.toLowerCase()}` as any, tierValue)}
                    </option>
                  )
                )}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {t(
                  'admin:subscriptions.tier.help',
                  'Tier applies to Foundation feature access and pricing configuration.'
                )}
              </p>
            </div>
          )}

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.editSubscription.plan', 'Subscription Plan')}
            </label>
            {plans.filter((p) => p.isActive).length > 0 ? (
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('admin:subscriptions.editSubscription.selectPlan', 'Select a plan...')}</option>
                {plans.filter((p) => p.isActive).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}{plan.price > 0 ? ` - ${new Intl.NumberFormat(CURRENCY_LOCALE, {
                      style: 'currency',
                      currency: plan.currency,
                    }).format(plan.price)}/${billingPeriodLabel(plan.billingPeriod)}` : ` (${t('admin:subscriptions.editSubscription.enquiryBased', 'Enquiry-based pricing')})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm">
                  {t('admin:subscriptions.editSubscription.noPlansAvailable', 'No subscription plans available. Please create subscription plans first via the API or database seed.')}
                </p>
              </div>
            )}
          </div>

          {/* Subscription Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.editSubscription.subscriptionPeriod', 'Subscription Period')}
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {subscriptionPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {durationMonths === 0 
                ? t('admin:subscriptions.editSubscription.monthlyRecurringHelp', 'Auto-renews every month until cancelled, paused, or changed by an admin.')
                : t('admin:subscriptions.editSubscription.subscriptionPeriodHelp', 'Select how long this subscription should be active.')}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.editSubscription.notes', 'Notes (optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('admin:subscriptions.editSubscription.notesPlaceholder', 'Add notes about this subscription...')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Current subscription info */}
          {subscription && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-800 font-medium mb-1">{t('admin:subscriptions.editSubscription.currentInfo', 'Current Subscription Info')}</p>
              <p className="text-blue-600">{t('admin:subscriptions.editSubscription.planLabel', 'Plan')}: {subscription.plan?.name || t('common:none', 'None')}</p>
              <p className="text-blue-600">
                {t('admin:subscriptions.editSubscription.periodLabel', 'Period')}: {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : t('common:notAvailable', 'N/A')} - {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : t('common:notAvailable', 'N/A')}
              </p>
            </div>
          )}

          {/* Quick Action Buttons - Cancel or Delete (if subscription exists) */}
          {subscription && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-amber-900">
                {t('admin:subscriptions.quickActions', 'Quick Actions')}
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Cancel Button - Only for ACTIVE or TRIAL subscriptions */}
                {(subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('admin:subscriptions.confirmCancelInModal', 'Cancel this subscription immediately? The user will lose access right away.'))) {
                        onSave({
                          status: SubscriptionStatus.CANCELLED,
                        });
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 border border-orange-200"
                  >
                    <X className="w-4 h-4" />
                    {t('admin:subscriptions.cancelSubscription', 'Cancel Subscription')}
                  </button>
                )}
                {/* Delete Button - Always show for existing subscriptions */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('admin:subscriptions.confirmDeleteModal', 'Are you sure you want to permanently delete this subscription? This action cannot be undone.'))) {
                        onDelete();
                        onClose();
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('admin:subscriptions.deleteSubscription', 'Delete Subscription')}
                  </button>
                )}
              </div>
              <p className="text-xs text-amber-700">
                {t('admin:subscriptions.quickActionsHelp', 'Use these for quick cancellation or deletion. Or modify the fields above and click Save.')}
              </p>
            </div>
          )}

          {/* Main Actions */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('admin:subscriptions.editSubscription.saving', 'Saving...')}
                </>
              ) : (
                <>
                  {subscription ? (
                    <>
                      <Edit className="w-4 h-4" />
                      {t('admin:subscriptions.editSubscription.save', 'Save Changes')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t('admin:subscriptions.createSubscription.create', 'Create Subscription')}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Subscription Plan Modal Component (lightweight plan editor)
interface EditSubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  onSave: (data: { planId: string; billingPeriod: string }) => Promise<void>;
  isLoading: boolean;
}

const EditSubscriptionPlanModal: React.FC<EditSubscriptionPlanModalProps> = ({
  isOpen,
  onClose,
  plans,
  onSave,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingPeriod, setBillingPeriod] = useState<string>('');

  const billingPeriodLabel = React.useCallback(
    (period: string | null | undefined) => {
      const normalized = (period || '').trim().toLowerCase().replace(/\s+/g, ' ');
      switch (normalized) {
        case '30 days':
        case '30 day':
        case '30-day':
          return t('admin:subscriptions.planEditor.billingOptions.thirtyDays', '30 Days');
        case 'monthly recurring':
          return t('admin:subscriptions.planEditor.billingOptions.monthlyRecurring', 'Monthly Recurring');
        case '1 year':
        case '1 yr':
        case 'one year':
          return t('admin:subscriptions.planEditor.billingOptions.oneYear', '1 Year');
        case 'monthly':
          return t('admin:subscriptions.planEditor.billingOptions.monthly', 'Monthly');
        case 'quarterly':
          return t('admin:subscriptions.planEditor.billingOptions.quarterly', 'Quarterly');
        case 'yearly':
        case 'annual':
        case 'annually':
          return t('admin:subscriptions.planEditor.billingOptions.yearly', 'Yearly');
        default:
          return period || t('common:notAvailable', 'N/A');
      }
    },
    [t]
  );

  const selectedPlan = React.useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    // Default to first active plan for convenience
    const defaultPlan = plans.find((p) => p.isActive) || plans[0];
    if (defaultPlan && !selectedPlanId) {
      setSelectedPlanId(defaultPlan.id);
      setBillingPeriod(defaultPlan.billingPeriod || '');
    }
  }, [isOpen, plans, selectedPlanId]);

  React.useEffect(() => {
    if (selectedPlan) {
      // Normalize to canonical stored values (lowercase) while displaying translated labels.
      setBillingPeriod((selectedPlan.billingPeriod || '').trim());
    }
  }, [selectedPlan]);

  // Handle Escape key to close modal - must be before any early returns to comply with Rules of Hooks
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Early return AFTER all hooks to comply with React's Rules of Hooks
  if (!isOpen) return null;

  const mergedBillingOptions = React.useMemo(() => {
    const opts = [
      { value: '30 days', label: billingPeriodLabel('30 days') },
      { value: 'monthly recurring', label: billingPeriodLabel('monthly recurring') },
      { value: '1 year', label: billingPeriodLabel('1 year') },
      // legacy / existing values we still support
      { value: 'monthly', label: billingPeriodLabel('monthly') },
      { value: 'quarterly', label: billingPeriodLabel('quarterly') },
      { value: 'yearly', label: billingPeriodLabel('yearly') },
    ];

    const current = billingPeriod?.trim();
    if (current && !opts.some((o) => o.value === current)) {
      // Keep current value selectable, but display a nicer label if we know it
      opts.unshift({ value: current, label: billingPeriodLabel(current) });
    }
    return opts;
  }, [billingPeriod, billingPeriodLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    await onSave({ planId: selectedPlanId, billingPeriod: billingPeriod.trim() });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-plan-modal-title"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 id="subscription-plan-modal-title" className="text-lg font-semibold">
            {t('admin:subscriptions.planEditor.title', 'Subscription Plan Editor')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('common:close', 'Close modal')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.planEditor.plan', 'Plan')}
            </label>
            {plans.length > 0 ? (
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} {!plan.isActive ? `(${t('common:inactive', 'Inactive')})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm">
                  {t('admin:subscriptions.planEditor.noPlansAvailable', 'No subscription plans available. Please run the database seed or create plans via the API.')}
                </p>
              </div>
            )}
          </div>

          {/* Billing Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.planEditor.billingPeriod', 'Subscription')}
            </label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {mergedBillingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {t(
                'admin:subscriptions.planEditor.billingPeriodHelp',
                'Select the subscription billing period shown for this plan.'
              )}
            </p>
          </div>

          {/* Current plan info */}
          {selectedPlan && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-800 font-medium mb-1">
                {t('admin:subscriptions.planEditor.currentInfo', 'Current Plan Info')}
              </p>
              <p className="text-blue-600">
                {t('admin:subscriptions.planEditor.price', 'Price')}: {new Intl.NumberFormat(CURRENCY_LOCALE, {
                  style: 'currency',
                  currency: selectedPlan.currency,
                }).format(selectedPlan.price)}
              </p>
              <p className="text-blue-600">
                {t('admin:subscriptions.planEditor.currentBillingPeriod', 'Current Subscription')}: {billingPeriodLabel(selectedPlan.billingPeriod)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedPlanId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('admin:subscriptions.planEditor.saving', 'Saving...') : t('admin:subscriptions.planEditor.save', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Pricing Tier Modal (Foundation-only subscription tier configuration)
interface EditPricingTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: PricingTier | null;
  onSave: (data: {
    id?: string;
    role: string;
    subscriptionTier: SubscriptionTier;
    name: string;
    basePrice: number;
    currency: string;
    billingPeriod: 'monthly' | 'yearly';
    yearlyDiscount: number;
    volumeDiscounts: Array<{ minQuantity: number; discountPercentage: number }>;
    isActive: boolean;
    displayOrder: number;
  }) => Promise<void>;
  isLoading: boolean;
}

const EditPricingTierModal: React.FC<EditPricingTierModalProps> = ({ isOpen, onClose, tier, onSave, isLoading }) => {
  const { t } = useTranslation(['admin', 'common']);

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(tier?.subscriptionTier || SubscriptionTier.BASIC);
  const [name, setName] = useState<string>(tier?.name || '');
  const [basePrice, setBasePrice] = useState<string>(tier ? String(tier.basePrice) : '0');
  const [currency, setCurrency] = useState<string>(tier?.currency || 'CHF');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>((tier?.billingPeriod as any) || 'monthly');
  const [yearlyDiscount, setYearlyDiscount] = useState<string>(tier ? String((tier.discounts as any)?.yearlyDiscount ?? 0) : '0');
  const [volumeDiscounts, setVolumeDiscounts] = useState<Array<{ id: string; minQuantity: string; discountPercentage: string }>>(
    () =>
      (tier?.discounts?.volumeDiscounts || []).map((d, idx) => ({
        id: `${tier?.id ?? 'new'}-${idx}`,
        minQuantity: String(d.minQuantity),
        discountPercentage: String(d.discountPercentage),
      })) || []
  );
  const [isActive, setIsActive] = useState<boolean>(tier?.isActive ?? true);
  const [displayOrder, setDisplayOrder] = useState<string>(tier ? String(tier.displayOrder ?? 0) : '0');

  React.useEffect(() => {
    if (!isOpen) return;
    setSubscriptionTier(tier?.subscriptionTier || SubscriptionTier.BASIC);
    setName(tier?.name || '');
    setBasePrice(tier ? String(tier.basePrice) : '0');
    setCurrency(tier?.currency || 'CHF');
    setBillingPeriod(((tier?.billingPeriod as any) || 'monthly') as 'monthly' | 'yearly');
    setYearlyDiscount(tier ? String((tier.discounts as any)?.yearlyDiscount ?? 0) : '0');
    setVolumeDiscounts(
      (tier?.discounts?.volumeDiscounts || []).map((d, idx) => ({
        id: `${tier?.id || 'new'}-${idx}`,
        minQuantity: String(d.minQuantity),
        discountPercentage: String(d.discountPercentage),
      }))
    );
    setIsActive(tier?.isActive ?? true);
    setDisplayOrder(tier ? String(tier.displayOrder ?? 0) : '0');
  }, [isOpen, tier]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const addVolumeDiscount = () => {
    setVolumeDiscounts((prev) => [
      ...prev,
      { id: `vd-${Date.now()}`, minQuantity: '1', discountPercentage: '0' },
    ]);
  };

  const updateVolumeDiscount = (id: string, key: 'minQuantity' | 'discountPercentage', value: string) => {
    setVolumeDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: value } : d)));
  };

  const removeVolumeDiscount = (id: string) => {
    setVolumeDiscounts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBasePrice = Number(basePrice);
    const parsedYearlyDiscount = Number(yearlyDiscount);
    const parsedDisplayOrder = Number(displayOrder);

    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      toast.error(t('admin:subscriptions.tierEditor.validation.basePrice', 'Base price must be a valid number.'));
      return;
    }
    if (!Number.isFinite(parsedYearlyDiscount) || parsedYearlyDiscount < 0 || parsedYearlyDiscount > 100) {
      toast.error(t('admin:subscriptions.tierEditor.validation.yearlyDiscount', 'Yearly discount must be between 0 and 100.'));
      return;
    }
    if (!Number.isFinite(parsedDisplayOrder)) {
      toast.error(t('admin:subscriptions.tierEditor.validation.displayOrder', 'Display order must be a valid number.'));
      return;
    }

    const parsedVolumeDiscounts = volumeDiscounts
      .map((d) => ({
        minQuantity: Number(d.minQuantity),
        discountPercentage: Number(d.discountPercentage),
      }))
      .filter(
        (d) =>
          Number.isFinite(d.minQuantity) &&
          d.minQuantity >= 1 &&
          Number.isFinite(d.discountPercentage) &&
          d.discountPercentage >= 0 &&
          d.discountPercentage <= 100
      );

    await onSave({
      id: tier?.id,
      role: UserRole.FOUNDATION,
      subscriptionTier,
      name: name || `Foundation - ${subscriptionTier}`,
      basePrice: parsedBasePrice,
      currency: currency || 'CHF',
      billingPeriod,
      yearlyDiscount: parsedYearlyDiscount,
      volumeDiscounts: parsedVolumeDiscounts,
      isActive,
      displayOrder: parsedDisplayOrder,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-tier-modal-title"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 id="pricing-tier-modal-title" className="text-lg font-semibold">
            {tier
              ? t('admin:subscriptions.tierEditor.editTitle', 'Edit Subscription Tier')
              : t('admin:subscriptions.tierEditor.createTitle', 'Create Subscription Tier')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('common:close', 'Close modal')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.tierEditor.fields.subscriptionTier', 'Tier')}
              </label>
              <select
                value={subscriptionTier}
                onChange={(e) => setSubscriptionTier(e.target.value as SubscriptionTier)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(SubscriptionTier).map((tierValue) => (
                  <option key={tierValue} value={tierValue}>
                    {t(`admin:subscriptions.tier.${tierValue.toLowerCase()}` as any, tierValue)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.tierEditor.fields.billingPeriod', 'Billing Period')}
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as 'monthly' | 'yearly')}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="monthly">{t('admin:subscriptions.tierEditor.billing.monthly', 'Monthly')}</option>
                <option value="yearly">{t('admin:subscriptions.tierEditor.billing.yearly', 'Yearly')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.tierEditor.fields.name', 'Name')}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('admin:subscriptions.tierEditor.fields.namePlaceholder', 'e.g. Foundation - Essential')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.tierEditor.fields.basePrice', 'Base Price')}
                </label>
                <input
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  inputMode="decimal"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.tierEditor.fields.currency', 'Currency')}
                </label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.tierEditor.fields.yearlyDiscount', 'Yearly Discount (%)')}
              </label>
              <input
                value={yearlyDiscount}
                onChange={(e) => setYearlyDiscount(e.target.value)}
                inputMode="numeric"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.tierEditor.fields.displayOrder', 'Display Order')}
              </label>
              <input
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                inputMode="numeric"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('admin:subscriptions.tierEditor.fields.isActive', 'Active')}</p>
              <p className="text-xs text-gray-500">{t('admin:subscriptions.tierEditor.fields.isActiveHelp', 'Inactive tiers are hidden from selection and pricing.')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}
            >
              {isActive ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
            </button>
          </div>

          {/* Volume Discounts */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('admin:subscriptions.tierEditor.fields.volumeDiscounts', 'Volume Discounts')}</p>
                <p className="text-xs text-gray-500">{t('admin:subscriptions.tierEditor.fields.volumeDiscountsHelp', 'Optional: discounts based on quantity.')}</p>
              </div>
              <button
                type="button"
                onClick={addVolumeDiscount}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
                {t('admin:subscriptions.tierEditor.actions.addVolumeDiscount', 'Add')}
              </button>
            </div>

            {volumeDiscounts.length === 0 ? (
              <p className="text-sm text-gray-500">{t('admin:subscriptions.tierEditor.fields.noVolumeDiscounts', 'No volume discounts configured.')}</p>
            ) : (
              <div className="space-y-3">
                {volumeDiscounts.map((d) => (
                  <div key={d.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('admin:subscriptions.tierEditor.fields.minQuantity', 'Min Quantity')}
                      </label>
                      <input
                        value={d.minQuantity}
                        onChange={(e) => updateVolumeDiscount(d.id, 'minQuantity', e.target.value)}
                        inputMode="numeric"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('admin:subscriptions.tierEditor.fields.discountPercentage', 'Discount (%)')}
                      </label>
                      <input
                        value={d.discountPercentage}
                        onChange={(e) => updateVolumeDiscount(d.id, 'discountPercentage', e.target.value)}
                        inputMode="numeric"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeVolumeDiscount(d.id)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label={t('common:delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('admin:subscriptions.tierEditor.actions.saving', 'Saving...') : t('admin:subscriptions.tierEditor.actions.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Send Invoice Modal Component
interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    contactName?: string;
    contactEmail: string;
    plan?: { name: string };
    tier: string;
  };
  onSend: (data: {
    invoiceNumber: string;
    invoiceAmount: number;
    invoiceCurrency?: string;
    sendEmail?: boolean;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  isOpen,
  onClose,
  request,
  onSend,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('CHF');
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState('');

  // Fetch next invoice number
  useQuery({
    queryKey: ['next-invoice-number'],
    queryFn: async () => {
      const res = await subscriptionService.getNextInvoiceNumber(apiClient);
      setInvoiceNumber(res.data?.data?.invoiceNumber || '');
      return res;
    },
    enabled: isOpen && !invoiceNumber,
  });

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(invoiceAmount);
    if (!invoiceNumber || isNaN(amount) || amount <= 0) {
      return;
    }
    await onSend({
      invoiceNumber,
      invoiceAmount: amount,
      invoiceCurrency,
      sendEmail,
      notes: notes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {t('admin:subscriptions.requests.invoiceModal.title', 'Send Invoice')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-600">
              {t('admin:subscriptions.requests.invoiceModal.sendingTo', 'Sending invoice to')}:
            </p>
            <p className="font-medium">{request.contactName || request.contactEmail}</p>
            <p className="text-gray-500">{request.plan?.name} - {request.tier}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.invoiceModal.invoiceNumber', 'Invoice Number')}
            </label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.requests.invoiceModal.amount', 'Amount')}
              </label>
              <input
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:subscriptions.requests.invoiceModal.currency', 'Currency')}
              </label>
              <select
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.invoiceModal.notes', 'Notes (optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="sendEmail" className="text-sm text-gray-700">
              {t('admin:subscriptions.requests.invoiceModal.sendEmailNotification', 'Send email notification to customer')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !invoiceNumber || !invoiceAmount}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isLoading ? t('common:sending', 'Sending...') : t('admin:subscriptions.requests.invoiceModal.send', 'Send Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirm Payment Modal Component
interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    contactName?: string;
    contactEmail: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    invoiceCurrency?: string;
  };
  onConfirm: (data: {
    paymentReference?: string;
    paymentDate?: string;
    autoActivate?: boolean;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  isOpen,
  onClose,
  request,
  onConfirm,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoActivate, setAutoActivate] = useState(false);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      paymentReference: paymentReference || undefined,
      paymentDate: paymentDate || undefined,
      autoActivate,
      notes: notes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {t('admin:subscriptions.requests.paymentModal.title', 'Confirm Payment')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-teal-50 rounded-lg text-sm">
            <p className="text-teal-600">
              {t('admin:subscriptions.requests.paymentModal.forInvoice', 'For Invoice')}:
            </p>
            <p className="font-medium text-teal-900">{request.invoiceNumber}</p>
            <p className="text-teal-700">
              {request.invoiceAmount
                ? new Intl.NumberFormat('de-CH', {
                    style: 'currency',
                    currency: request.invoiceCurrency || 'CHF',
                  }).format(request.invoiceAmount)
                : '-'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.paymentModal.reference', 'Payment Reference (optional)')}
            </label>
            <input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Bank transfer ID, check number"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.paymentModal.date', 'Payment Date')}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.paymentModal.notes', 'Notes (optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoActivate"
              checked={autoActivate}
              onChange={(e) => setAutoActivate(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoActivate" className="text-sm text-gray-700">
              {t('admin:subscriptions.requests.paymentModal.autoActivate', 'Automatically activate subscription')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isLoading ? t('common:confirming', 'Confirming...') : t('admin:subscriptions.requests.paymentModal.confirm', 'Confirm Payment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Decline Request Modal Component
interface DeclineRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    contactName?: string;
    contactEmail: string;
  };
  onDecline: (data: {
    reason: string;
    sendEmail?: boolean;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const DeclineRequestModal: React.FC<DeclineRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  onDecline,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onDecline({
      reason,
      sendEmail,
      notes: notes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-red-700">
            {t('admin:subscriptions.requests.declineModal.title', 'Decline Request')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-red-50 rounded-lg text-sm">
            <p className="text-red-600">
              {t('admin:subscriptions.requests.declineModal.warning', 'You are about to decline the subscription request from')}:
            </p>
            <p className="font-medium text-red-900">{request.contactName || request.contactEmail}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.declineModal.reason', 'Reason for Declining')} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for declining this request..."
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:subscriptions.requests.declineModal.notes', 'Internal Notes (optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendDeclineEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="sendDeclineEmail" className="text-sm text-gray-700">
              {t('admin:subscriptions.requests.declineModal.sendEmailNotification', 'Send email notification to customer')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {isLoading ? t('common:declining', 'Declining...') : t('admin:subscriptions.requests.declineModal.decline', 'Decline Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subscription Settings Modal Component
interface SubscriptionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    notificationEmail?: string;
    enableEmailNotifications?: boolean;
    defaultTrialDays?: number;
    defaultGracePeriodDays?: number;
    invoicePrefix?: string;
    invoiceNextNumber?: number;
    paymentTermsDays?: number;
    estimatedResponseHours?: number;
  } | null;
  onSave: (data: {
    notificationEmail?: string;
    enableEmailNotifications?: boolean;
    defaultTrialDays?: number;
    defaultGracePeriodDays?: number;
    invoicePrefix?: string;
    invoiceNextNumber?: number;
    paymentTermsDays?: number;
    estimatedResponseHours?: number;
  }) => Promise<void>;
  isLoading: boolean;
}

const SubscriptionSettingsModal: React.FC<SubscriptionSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [notificationEmail, setNotificationEmail] = useState(settings?.notificationEmail || '');
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(settings?.enableEmailNotifications ?? true);
  const [defaultTrialDays, setDefaultTrialDays] = useState(String(settings?.defaultTrialDays ?? 14));
  const [defaultGracePeriodDays, setDefaultGracePeriodDays] = useState(String(settings?.defaultGracePeriodDays ?? 7));
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix || 'INV-');
  const [invoiceNextNumber, setInvoiceNextNumber] = useState(String(settings?.invoiceNextNumber ?? 1001));
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(settings?.paymentTermsDays ?? 30));
  const [estimatedResponseHours, setEstimatedResponseHours] = useState(String(settings?.estimatedResponseHours ?? 48));

  React.useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.notificationEmail || '');
      setEnableEmailNotifications(settings.enableEmailNotifications ?? true);
      setDefaultTrialDays(String(settings.defaultTrialDays ?? 14));
      setDefaultGracePeriodDays(String(settings.defaultGracePeriodDays ?? 7));
      setInvoicePrefix(settings.invoicePrefix || 'INV-');
      setInvoiceNextNumber(String(settings.invoiceNextNumber ?? 1001));
      setPaymentTermsDays(String(settings.paymentTermsDays ?? 30));
      setEstimatedResponseHours(String(settings.estimatedResponseHours ?? 48));
    }
  }, [settings]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      notificationEmail: notificationEmail || undefined,
      enableEmailNotifications,
      defaultTrialDays: parseInt(defaultTrialDays) || 14,
      defaultGracePeriodDays: parseInt(defaultGracePeriodDays) || 7,
      invoicePrefix: invoicePrefix || 'INV-',
      invoiceNextNumber: parseInt(invoiceNextNumber) || 1001,
      paymentTermsDays: parseInt(paymentTermsDays) || 30,
      estimatedResponseHours: parseInt(estimatedResponseHours) || 48,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {t('admin:subscriptions.settings.title', 'Subscription Settings')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Notifications Section */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('admin:subscriptions.settings.emailSection', 'Email Notifications')}
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin:subscriptions.settings.enableNotifications', 'Enable Email Notifications')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('admin:subscriptions.settings.enableNotificationsHelp', 'Receive emails for new subscription requests')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableEmailNotifications(!enableEmailNotifications)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    enableEmailNotifications ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {enableEmailNotifications ? t('common:enabled', 'Enabled') : t('common:disabled', 'Disabled')}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.notificationEmail', 'Notification Email')}
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin:subscriptions.settings.notificationEmailHelp', 'Email address to receive subscription request notifications')}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Settings Section */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('admin:subscriptions.settings.invoiceSection', 'Invoice Settings')}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.invoicePrefix', 'Invoice Prefix')}
                </label>
                <input
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.nextInvoiceNumber', 'Next Invoice Number')}
                </label>
                <input
                  type="number"
                  value={invoiceNextNumber}
                  onChange={(e) => setInvoiceNextNumber(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.paymentTerms', 'Payment Terms (days)')}
                </label>
                <input
                  type="number"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subscription Defaults Section */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('admin:subscriptions.settings.defaultsSection', 'Subscription Defaults')}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.defaultTrialDays', 'Default Trial Days')}
                </label>
                <input
                  type="number"
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.gracePeriodDays', 'Grace Period Days')}
                </label>
                <input
                  type="number"
                  value={defaultGracePeriodDays}
                  onChange={(e) => setDefaultGracePeriodDays(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:subscriptions.settings.estimatedResponseHours', 'Estimated Response Time (hours)')}
                </label>
                <input
                  type="number"
                  value={estimatedResponseHours}
                  onChange={(e) => setEstimatedResponseHours(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin:subscriptions.settings.estimatedResponseHoursHelp', 'Shown to users when they submit a request')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('common:saving', 'Saving...') : t('common:save', 'Save Settings')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subscription Request Status enum (matches backend)
enum SubscriptionRequestStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVOICE_SENT = 'INVOICE_SENT',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  ACTIVATED = 'ACTIVATED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

// Request status colors
const requestStatusColors: Record<string, string> = {
  [SubscriptionRequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [SubscriptionRequestStatus.UNDER_REVIEW]: 'bg-blue-100 text-blue-800',
  [SubscriptionRequestStatus.INVOICE_SENT]: 'bg-purple-100 text-purple-800',
  [SubscriptionRequestStatus.PAYMENT_PENDING]: 'bg-orange-100 text-orange-800',
  [SubscriptionRequestStatus.PAYMENT_RECEIVED]: 'bg-teal-100 text-teal-800',
  [SubscriptionRequestStatus.ACTIVATED]: 'bg-green-100 text-green-800',
  [SubscriptionRequestStatus.DECLINED]: 'bg-red-100 text-red-800',
  [SubscriptionRequestStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

// Subscription Request interface
interface SubscriptionRequest {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  tier: SubscriptionTier;
  billingPeriod: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact?: string;
  message?: string;
  notes?: string;
  status: SubscriptionRequestStatus;
  invoiceNumber?: string;
  invoiceSentAt?: string;
  invoiceAmount?: number;
  invoiceCurrency?: string;
  paymentReceivedAt?: string;
  paymentReference?: string;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  processedAt?: string;
  processedBy?: string;
  declinedAt?: string;
  declinedBy?: string;
  declineReason?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  plan?: {
    id: string;
    name: string;
  };
}

interface SubscriptionCancellationRequest {
  id: string;
  subscriptionId: string;
  userId?: string;
  organizationId?: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    currentPeriodEnd?: string;
    plan?: { id: string; name: string };
  };
}

// View mode for main content
type ViewMode = 'subscriptions' | 'requests' | 'cancellations' | 'settings';

const Subscriptions: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<Subscription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
  const [isTierEditorOpen, setIsTierEditorOpen] = useState(false);
  const [editingPricingTier, setEditingPricingTier] = useState<PricingTier | null>(null);
  
  // Subscription Requests state
  const [viewMode, setViewMode] = useState<ViewMode>('subscriptions');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('');
  const [cancellationStatusFilter, setCancellationStatusFilter] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [isRequestDetailOpen, setIsRequestDetailOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const apiClient = useApiClient();
  const { t } = useTranslation(['common', 'admin']);
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(apiClient),
    enabled: !!apiClient,
  });

  // Fetch subscription plans
  const { data: plansResponse } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(apiClient),
    enabled: !!apiClient,
  });

  // Fetch analytics
  const { data: analyticsResponse } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: () => subscriptionService.getSubscriptionAnalytics(apiClient, '30d'),
    enabled: !!apiClient,
  });

  // Fetch all subscriptions
  const { data: subscriptionsResponse } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionService.getSubscriptions(apiClient, { limit: 1000 }),
    enabled: !!apiClient,
  });

  // Fetch pricing tiers (Foundation only)
  const { data: pricingTiersResponse, isLoading: pricingTiersLoading } = useQuery({
    queryKey: ['pricing-tiers', selectedRole],
    queryFn: () =>
      subscriptionService.getPricingTiers(apiClient, {
        role: UserRole.FOUNDATION,
        includeInactive: true,
      }),
    enabled: !!apiClient && selectedRole === UserRole.FOUNDATION,
  });

  // Fetch subscription requests
  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['subscription-requests', requestStatusFilter],
    queryFn: () =>
      subscriptionService.getSubscriptionRequests(apiClient, {
        status: requestStatusFilter || undefined,
        limit: 100,
      }),
    enabled: !!apiClient && viewMode === 'requests',
  });

  // Fetch subscription cancellation requests
  const { data: cancellationRequestsResponse, isLoading: cancellationRequestsLoading } = useQuery({
    queryKey: ['subscription-cancellation-requests', cancellationStatusFilter],
    queryFn: () =>
      subscriptionService.getCancellationRequests(apiClient, {
        status: cancellationStatusFilter || undefined,
        limit: 100,
      }),
    enabled: !!apiClient && viewMode === 'cancellations',
  });

  // Fetch request analytics
  const { data: requestAnalyticsResponse } = useQuery({
    queryKey: ['subscription-request-analytics'],
    queryFn: () => subscriptionService.getSubscriptionRequestAnalytics(apiClient),
    enabled: !!apiClient && viewMode === 'requests',
  });

  // Fetch subscription settings
  const { data: settingsResponse } = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: () => subscriptionService.getSubscriptionSettings(apiClient),
    enabled: !!apiClient,
  });

  const users: User[] = usersResponse?.data?.data || [];
  const plans: SubscriptionPlan[] = plansResponse?.data?.data || [];
  const analytics: SubscriptionAnalytics | null = analyticsResponse?.data?.data || null;
  const subscriptions: Subscription[] = subscriptionsResponse?.data?.data?.subscriptions || [];
  const pricingTiers: PricingTier[] = pricingTiersResponse?.data?.data || [];
  const requests: SubscriptionRequest[] = requestsResponse?.data?.data?.requests || [];
  const cancellationRequests: SubscriptionCancellationRequest[] =
    cancellationRequestsResponse?.data?.data?.requests || [];
  const requestAnalytics = requestAnalyticsResponse?.data?.data || null;
  const subscriptionSettings = settingsResponse?.data?.data || null;

  const foundationAvailableTiers = React.useMemo(() => {
    const order: SubscriptionTier[] = [
      SubscriptionTier.BASIC,
      SubscriptionTier.ESSENTIAL,
      SubscriptionTier.PROFESSIONAL,
      SubscriptionTier.ENTERPRISE,
    ];
    const active = new Set<SubscriptionTier>();
    pricingTiers.filter((pt) => pt.isActive).forEach((pt) => active.add(pt.subscriptionTier));
    const tiers = order.filter((t) => active.has(t));
    return tiers.length > 0 ? tiers : order;
  }, [pricingTiers]);

  // Create a map of userId to subscription
  const userSubscriptionMap = React.useMemo(() => {
    const map = new Map<string, Subscription>();
    subscriptions.forEach((sub) => {
      if (sub.userId) {
        map.set(sub.userId, sub);
      }
    });
    return map;
  }, [subscriptions]);

  // Group users by role and count
  const usersByRole = React.useMemo(() => {
    const roleGroups: Record<string, User[]> = {};
    const subscribableRoles = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.EDUCATOR, UserRole.PARENT];
    
    subscribableRoles.forEach((role) => {
      roleGroups[role] = users.filter((user) => user.role === role);
    });
    
    return roleGroups;
  }, [users]);

  // Get filtered users for selected role
  const filteredUsers = React.useMemo(() => {
    if (!selectedRole) return [];
    
    const roleUsers = usersByRole[selectedRole] || [];
    if (!searchQuery) return roleUsers;
    
    const query = searchQuery.toLowerCase();
    return roleUsers.filter((user) => {
      const name = (user.firstName || '') + ' ' + (user.lastName || '');
      return name.toLowerCase().includes(query) || 
             (user.email || '').toLowerCase().includes(query);
    });
  }, [selectedRole, usersByRole, searchQuery]);

  // Mutations for subscription management
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; durationMonths?: number; notes?: string };
    }) => {
      const existingSubscription = userSubscriptionMap.get(userId);
      const isMonthlyRecurring = data.durationMonths === 0;
      
      if (existingSubscription) {
        // Calculate new currentPeriodEnd based on durationMonths
        // 0 = monthly recurring (set to 1 month period that will auto-renew indefinitely)
        let currentPeriodEnd: string | undefined;
        if (data.durationMonths !== undefined) {
          const startDate = existingSubscription.currentPeriodStart 
            ? new Date(existingSubscription.currentPeriodStart)
            : new Date();
          const endDate = new Date(startDate);
          // For monthly recurring (0), set period to 1 month
          const months = isMonthlyRecurring ? 1 : data.durationMonths;
          endDate.setMonth(endDate.getMonth() + months);
          currentPeriodEnd = endDate.toISOString();
        }
        
        // Update existing subscription - include planId if changed
        await subscriptionService.updateSubscription(apiClient, existingSubscription.id, {
          planId: data.planId,
          tier: data.tier,
          currentPeriodEnd,
          notes: data.notes,
        });
        
        // Update status and cancelAtPeriodEnd flag
        // For monthly recurring: cancelAtPeriodEnd = false (auto-renew indefinitely)
        // For fixed-term: don't change cancelAtPeriodEnd unless status changed
        if (isMonthlyRecurring || data.status !== existingSubscription.status) {
          await subscriptionService.updateSubscriptionStatus(
            apiClient, 
            existingSubscription.id, 
            data.status,
            isMonthlyRecurring ? false : undefined
          );
        }
        
        return;
      } else {
        // Create new subscription - validate plan is available
        if (!data.planId && !plans[0]?.id) {
          throw new Error('No plan selected and no plans available');
        }
        // For monthly recurring (0), set durationMonths to 1
        const duration = isMonthlyRecurring ? 1 : data.durationMonths;
        const subscription = await subscriptionService.createSubscription(apiClient, {
          userId,
          planId: data.planId || plans[0]?.id,
          tier: data.tier || SubscriptionTier.BASIC,
          durationMonths: duration,
          notes: data.notes,
        });
        
        // For monthly recurring, ensure cancelAtPeriodEnd is false
        if (isMonthlyRecurring && subscription.data?.data?.id) {
          await subscriptionService.updateSubscriptionStatus(
            apiClient,
            subscription.data.data.id,
            data.status,
            false
          );
        }
        
        return subscription;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setSelectedUserSubscription(null);
      toast.success(t('admin:subscriptions.editSubscription.success', 'Subscription updated successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to update subscription:', error);
      toast.error(t('admin:subscriptions.editSubscription.error', 'Failed to update subscription: ') + error.message);
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return subscriptionService.deleteSubscription(apiClient, subscriptionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      toast.success(t('admin:subscriptions.deleteSuccess', 'Subscription deleted successfully'));
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setSelectedUserSubscription(null);
    },
    onError: (error: Error) => {
      console.error('Failed to delete subscription:', error);
      toast.error(t('admin:subscriptions.deleteError', 'Failed to delete subscription: ') + error.message);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, billingPeriod }: { planId: string; billingPeriod: string }) => {
      return subscriptionService.updatePlan(apiClient, planId, { billingPeriod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success(t('admin:subscriptions.planEditor.success', 'Plan updated successfully'));
      setIsPlanEditorOpen(false);
    },
    onError: (error: Error) => {
      console.error('Failed to update plan:', error);
      toast.error(t('admin:subscriptions.planEditor.error', 'Failed to update plan: ') + error.message);
    },
  });

  const upsertPricingTierMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      role: string;
      subscriptionTier: SubscriptionTier;
      name: string;
      basePrice: number;
      currency: string;
      billingPeriod: 'monthly' | 'yearly';
      yearlyDiscount: number;
      volumeDiscounts: Array<{ minQuantity: number; discountPercentage: number }>;
      isActive: boolean;
      displayOrder: number;
    }) => {
      const dto = {
        role: payload.role,
        subscriptionTier: payload.subscriptionTier,
        name: payload.name,
        basePrice: payload.basePrice,
        currency: payload.currency,
        billingPeriod: payload.billingPeriod,
        discounts: {
          yearlyDiscount: payload.yearlyDiscount,
          volumeDiscounts: payload.volumeDiscounts,
        },
        isActive: payload.isActive,
        displayOrder: payload.displayOrder,
      };
      if (payload.id) {
        return subscriptionService.updatePricingTier(apiClient, payload.id, dto);
      }
      return subscriptionService.createPricingTier(apiClient, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-tiers', selectedRole] });
      toast.success(t('admin:subscriptions.tierEditor.success', 'Subscription tier saved successfully'));
      setIsTierEditorOpen(false);
      setEditingPricingTier(null);
    },
    onError: (error: Error) => {
      console.error('Failed to save pricing tier:', error);
      toast.error(t('admin:subscriptions.tierEditor.error', 'Failed to save subscription tier: ') + error.message);
    },
  });

  const deletePricingTierMutation = useMutation({
    mutationFn: async (id: string) => subscriptionService.deletePricingTier(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-tiers', selectedRole] });
      toast.success(t('admin:subscriptions.tierEditor.deleteSuccess', 'Subscription tier deleted successfully'));
    },
    onError: (error: Error) => {
      console.error('Failed to delete pricing tier:', error);
      toast.error(t('admin:subscriptions.tierEditor.deleteError', 'Failed to delete subscription tier: ') + error.message);
    },
  });

  // Subscription Request mutations
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) =>
      subscriptionService.reviewSubscriptionRequest(apiClient, id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-analytics'] });
      toast.success(t('admin:subscriptions.requests.reviewSuccess', 'Request marked as under review'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.requests.reviewError', 'Failed to review request: ') + error.message);
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { invoiceNumber: string; invoiceAmount: number; invoiceCurrency?: string; sendEmail?: boolean; notes?: string };
    }) => subscriptionService.sendInvoiceForRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-analytics'] });
      setIsInvoiceModalOpen(false);
      toast.success(t('admin:subscriptions.requests.invoiceSentSuccess', 'Invoice sent successfully'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.requests.invoiceSentError', 'Failed to send invoice: ') + error.message);
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { paymentReference?: string; paymentDate?: string; autoActivate?: boolean; notes?: string };
    }) => subscriptionService.confirmPaymentForRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-analytics'] });
      setIsPaymentModalOpen(false);
      toast.success(t('admin:subscriptions.requests.paymentConfirmedSuccess', 'Payment confirmed successfully'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.requests.paymentConfirmedError', 'Failed to confirm payment: ') + error.message);
    },
  });

  const activateRequestMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { startDate?: string; periodMonths?: number; includeTrial?: boolean; sendEmail?: boolean; notes?: string };
    }) => subscriptionService.activateSubscriptionRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      setIsRequestDetailOpen(false);
      toast.success(t('admin:subscriptions.requests.activatedSuccess', 'Subscription activated successfully'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.requests.activatedError', 'Failed to activate subscription: ') + error.message);
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { reason: string; sendEmail?: boolean; notes?: string };
    }) => subscriptionService.declineSubscriptionRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-request-analytics'] });
      setIsDeclineModalOpen(false);
      setIsRequestDetailOpen(false);
      toast.success(t('admin:subscriptions.requests.declinedSuccess', 'Request declined'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.requests.declinedError', 'Failed to decline request: ') + error.message);
    },
  });

  // Cancellation Request mutations
  const approveCancellationRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: { immediate?: boolean; reason?: string; notes?: string } }) =>
      subscriptionService.approveCancellationRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-cancellation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      toast.success(t('admin:subscriptions.cancellations.actions.approve', 'Approved'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.cancellations.actions.approve', 'Approve') + ': ' + error.message);
    },
  });

  const declineCancellationRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: { notes?: string } }) =>
      subscriptionService.declineCancellationRequest(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-cancellation-requests'] });
      toast.success(t('admin:subscriptions.cancellations.actions.decline', 'Declined'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.cancellations.actions.decline', 'Decline') + ': ' + error.message);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      notificationEmail?: string;
      enableEmailNotifications?: boolean;
      defaultTrialDays?: number;
      defaultGracePeriodDays?: number;
      invoicePrefix?: string;
      invoiceNextNumber?: number;
      paymentTermsDays?: number;
      estimatedResponseHours?: number;
    }) => subscriptionService.updateSubscriptionSettings(apiClient, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-settings'] });
      setIsSettingsModalOpen(false);
      toast.success(t('admin:subscriptions.settings.updateSuccess', 'Settings updated successfully'));
    },
    onError: (error: Error) => {
      toast.error(t('admin:subscriptions.settings.updateError', 'Failed to update settings: ') + error.message);
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedUserSubscription(userSubscriptionMap.get(user.id) || null);
    setIsEditModalOpen(true);
  };

  const handleSaveSubscription = async (data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; durationMonths?: number; notes?: string }) => {
    if (selectedUser) {
      await updateSubscriptionMutation.mutateAsync({ userId: selectedUser.id, data });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getSubscriptionStatusBadge = (userId: string) => {
    const subscription = userSubscriptionMap.get(userId);
    if (!subscription) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          {t('admin:subscriptions.noSubscription', 'No Subscription')}
        </span>
      );
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${SubscriptionStatusColors[subscription.status]}`}>
        {t(`admin:subscriptions.status.${subscription.status.toLowerCase()}`)}
      </span>
    );
  };

  const getRequestStatusBadge = (status: SubscriptionRequestStatus) => {
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${requestStatusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`admin:subscriptions.requestStatus.${status.toLowerCase()}`, status)}
      </span>
    );
  };

  const getCancellationStatusBadge = (status: SubscriptionCancellationRequest['status']) => {
    const colors: Record<SubscriptionCancellationRequest['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`admin:subscriptions.cancellations.status.${status.toLowerCase()}`, status)}
      </span>
    );
  };

  const handleViewRequest = (request: SubscriptionRequest) => {
    setSelectedRequest(request);
    setIsRequestDetailOpen(true);
  };

  const pendingRequestsCount = requests.filter(
    (r) => r.status === SubscriptionRequestStatus.PENDING || r.status === SubscriptionRequestStatus.UNDER_REVIEW
  ).length;

  const pendingCancellationRequestsCount = cancellationRequests.filter((r) => r.status === 'PENDING').length;

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlanEditorOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t('admin:subscriptions.planEditor.open', 'Edit Plans')}
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setViewMode('subscriptions');
            setSelectedRole(null);
          }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'subscriptions'
              ? 'border-swiss-teal text-swiss-teal'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            {t('admin:subscriptions.tabs.subscriptions', 'Subscriptions')}
          </div>
        </button>
        <button
          onClick={() => setViewMode('requests')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'requests'
              ? 'border-swiss-teal text-swiss-teal'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            {t('admin:subscriptions.tabs.requests', 'Subscription Requests')}
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                {pendingRequestsCount}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => {
            setViewMode('cancellations');
            setSelectedRole(null);
          }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'cancellations'
              ? 'border-swiss-teal text-swiss-teal'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {t('admin:subscriptions.tabs.cancellations', 'Cancellation Requests')}
            {pendingCancellationRequestsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                {pendingCancellationRequestsCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'subscriptions' && (
        <>
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
                    {stat.isText ? stat.value : (stat.value as number).toLocaleString()}
                  </p>
                </div>
                {stat.icon}
              </div>
            ))}
          </div>
        </>
      )}

      {viewMode === 'requests' && (
        <>
          {/* Request Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin:subscriptions.requests.stats.pending', 'Pending')}</p>
                  <p className="text-2xl font-bold text-yellow-800">{requestAnalytics?.pending || 0}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin:subscriptions.requests.stats.underReview', 'Under Review')}</p>
                  <p className="text-2xl font-bold text-blue-800">{requestAnalytics?.underReview || 0}</p>
                </div>
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin:subscriptions.requests.stats.invoiceSent', 'Invoice Sent')}</p>
                  <p className="text-2xl font-bold text-purple-800">{requestAnalytics?.invoiceSent || 0}</p>
                </div>
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin:subscriptions.requests.stats.paymentReceived', 'Payment Received')}</p>
                  <p className="text-2xl font-bold text-teal-800">{requestAnalytics?.paymentReceived || 0}</p>
                </div>
                <DollarSign className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin:subscriptions.requests.stats.activated', 'Activated')}</p>
                  <p className="text-2xl font-bold text-green-800">{requestAnalytics?.activated || 0}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Request Filters */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('admin:subscriptions.requests.filter.allStatuses', 'All Statuses')}</option>
                  {Object.values(SubscriptionRequestStatus).map((status) => (
                    <option key={status} value={status}>
                      {t(`admin:subscriptions.requestStatus.${status.toLowerCase()}`, status)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['subscription-requests'] })}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4" />
                {t('common:refresh', 'Refresh')}
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {requestsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('admin:subscriptions.requests.noRequests', 'No subscription requests found')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.contact', 'Contact')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.plan', 'Plan')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.tier', 'Tier')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.status', 'Status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.date', 'Date')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.requests.table.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewRequest(request)}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {request.contactName || request.user?.firstName
                                ? `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || request.contactName
                                : t('common:unknown', 'Unknown')}
                            </p>
                            <p className="text-sm text-gray-500">{request.contactEmail}</p>
                            {request.organization && (
                              <p className="text-xs text-gray-400">{request.organization.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {request.plan?.name || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {t(`admin:subscriptions.tier.${request.tier.toLowerCase()}` as any, request.tier)}
                        </td>
                        <td className="px-4 py-4">
                          {getRequestStatusBadge(request.status)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewRequest(request);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              {t('common:view', 'View')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === 'cancellations' && (
        <>
          {/* Cancellation Request Filters */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={cancellationStatusFilter}
                  onChange={(e) => setCancellationStatusFilter(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('admin:subscriptions.cancellations.filter.allStatuses', 'All Statuses')}</option>
                  {(['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'] as const).map((status) => (
                    <option key={status} value={status}>
                      {t(`admin:subscriptions.cancellations.status.${status.toLowerCase()}`, status)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['subscription-cancellation-requests'] })}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4" />
                {t('common:refresh', 'Refresh')}
              </button>
            </div>
          </div>

          {/* Cancellation Requests Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {cancellationRequestsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : cancellationRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('admin:subscriptions.cancellations.noRequests', 'No cancellation requests found')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.subscriber', 'Subscriber')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.plan', 'Plan')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.status', 'Status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.requestedAt', 'Requested')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.reason', 'Reason')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.cancellations.table.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cancellationRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {req.organization?.name ||
                                (req.user?.firstName || req.user?.lastName
                                  ? `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim()
                                  : req.user?.email || t('common:unknown', 'Unknown'))}
                            </p>
                            {req.user?.email && <p className="text-sm text-gray-500">{req.user.email}</p>}
                            {req.subscriptionId && <p className="text-xs text-gray-400">Sub: {req.subscriptionId}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {req.subscription?.plan?.name || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {getCancellationStatusBadge(req.status)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-[360px]">
                          <div className="truncate" title={req.reason || ''}>
                            {req.reason || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                approveCancellationRequestMutation.mutate({ id: req.id, data: { immediate: false } })
                              }
                              disabled={req.status !== 'PENDING' || approveCancellationRequestMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {t('admin:subscriptions.cancellations.actions.approve', 'Approve')}
                            </button>
                            <button
                              onClick={() => declineCancellationRequestMutation.mutate({ id: req.id, data: {} })}
                              disabled={req.status !== 'PENDING' || declineCancellationRequestMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              {t('admin:subscriptions.cancellations.actions.decline', 'Decline')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Role Selection or User List (only in subscriptions mode) */}
      {viewMode === 'subscriptions' && !selectedRole ? (
        // Role Cards View
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:subscriptions.selectRoleType', 'Select User Type to Manage Subscriptions')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const userCount = usersByRole[role]?.length || 0;
              const subscribedCount = usersByRole[role]?.filter((u) => userSubscriptionMap.has(u.id))?.length || 0;
              
              return (
                <div
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`${config.bgColor} border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 transform hover:scale-105`}
                >
                  <div className={`${config.color} mb-4`}>{config.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(config.labelKey)}</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{userCount}</span> {t('admin:subscriptions.totalUsers', 'total users')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-green-600">{subscribedCount}</span> {t('admin:subscriptions.subscribed', 'subscribed')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'subscriptions' && selectedRole ? (
        // User List View
        <div className="space-y-4">
          {/* Back Button & Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedRole(null);
                setSearchQuery('');
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('admin:subscriptions.backToRoles', 'Back to Role Selection')}
            </button>
          </div>

          {/* Role Header */}
          <div className={`${roleConfig[selectedRole]?.bgColor || 'bg-gray-50'} border-2 rounded-xl p-6`}>
            <div className="flex items-center gap-4">
              <div className={roleConfig[selectedRole]?.color || 'text-gray-600'}>
                {roleConfig[selectedRole]?.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t(roleConfig[selectedRole].labelKey)} {t('admin:subscriptions.subscriptions', 'Subscriptions')}
                </h2>
                <p className="text-gray-600">
                  {t('admin:subscriptions.managingUsers', 'Managing {{count}} users', { count: usersByRole[selectedRole]?.length || 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Tier (Foundation only) */}
          {selectedRole === UserRole.FOUNDATION && (
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('admin:subscriptions.tierSection.title', 'Subscription Tier')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('admin:subscriptions.tierSection.subtitle', 'Configure Foundation subscription tiers and pricing.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPricingTier(null);
                    setIsTierEditorOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                  {t('admin:subscriptions.tierSection.add', 'Add Tier')}
                </button>
              </div>

              {pricingTiersLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : pricingTiers.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {t('admin:subscriptions.tierSection.empty', 'No tiers configured yet.')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin:subscriptions.tierSection.table.tier', 'Tier')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin:subscriptions.tierSection.table.billing', 'Billing')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin:subscriptions.tierSection.table.price', 'Price')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin:subscriptions.tierSection.table.active', 'Active')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {t('admin:subscriptions.tierSection.table.actions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pricingTiers.map((pt) => (
                        <tr key={pt.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="font-medium">{t(`admin:subscriptions.tier.${pt.subscriptionTier.toLowerCase()}` as any, pt.subscriptionTier)}</div>
                            <div className="text-xs text-gray-500">{pt.name}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {pt.billingPeriod === 'yearly'
                              ? t('admin:subscriptions.tierEditor.billing.yearly', 'Yearly')
                              : t('admin:subscriptions.tierEditor.billing.monthly', 'Monthly')}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {formatCurrency(pt.basePrice, pt.currency)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${pt.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {pt.isActive ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPricingTier(pt);
                                  setIsTierEditorOpen(true);
                                }}
                                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                {t('common:edit', 'Edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(t('admin:subscriptions.tierEditor.confirmDelete', 'Delete this tier?'))) {
                                    deletePricingTierMutation.mutate(pt.id);
                                  }
                                }}
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                {t('common:delete', 'Delete')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('admin:subscriptions.searchUsers', 'Search users by name or email...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('admin:subscriptions.noUsersFound', 'No users found')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.user', 'User')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.email', 'Email')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.organization', 'Organization')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.subscriptionStatus', 'Subscription Status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.plan', 'Plan')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('admin:subscriptions.userTable.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => {
                      const subscription = userSubscriptionMap.get(user.id);
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleEditUser(user)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-swiss-teal flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-medium">
                                  {(user.firstName || user.email || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.firstName && user.lastName
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.name || t('common:unknown', 'Unknown')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {user.email || t('common:notAvailable', 'N/A')}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {user.orgName || '-'}
                          </td>
                          <td className="px-4 py-4">
                            {getSubscriptionStatusBadge(user.id)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {subscription?.plan?.name || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(user);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                subscription
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {subscription ? (
                                <>
                                  <Edit className="w-4 h-4" />
                                  {t('admin:subscriptions.manageSubscription', 'Manage')}
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  {t('admin:subscriptions.addSubscription', 'Add')}
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Request Detail Modal */}
      {isRequestDetailOpen && selectedRequest && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setIsRequestDetailOpen(false)}
        >
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('admin:subscriptions.requests.detail.title', 'Subscription Request')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('admin:subscriptions.requests.detail.submitted', 'Submitted on {{date}}', {
                      date: new Date(selectedRequest.createdAt).toLocaleString(),
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setIsRequestDetailOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500">
                  {t('admin:subscriptions.requests.detail.status', 'Status')}:
                </span>
                {getRequestStatusBadge(selectedRequest.status)}
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  {t('admin:subscriptions.requests.detail.contactInfo', 'Contact Information')}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.name', 'Name')}</p>
                    <p className="font-medium">{selectedRequest.contactName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.email', 'Email')}</p>
                    <p className="font-medium">{selectedRequest.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.phone', 'Phone')}</p>
                    <p className="font-medium">{selectedRequest.contactPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.preferredContact', 'Preferred Contact')}</p>
                    <p className="font-medium capitalize">{selectedRequest.preferredContact || 'email'}</p>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  {t('admin:subscriptions.requests.detail.planDetails', 'Plan Details')}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.plan', 'Plan')}</p>
                    <p className="font-medium">{selectedRequest.plan?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.tier', 'Tier')}</p>
                    <p className="font-medium">
                      {t(`admin:subscriptions.tier.${selectedRequest.tier.toLowerCase()}` as any, selectedRequest.tier)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('admin:subscriptions.requests.detail.billingPeriod', 'Billing Period')}</p>
                    <p className="font-medium capitalize">{selectedRequest.billingPeriod}</p>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedRequest.message && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {t('admin:subscriptions.requests.detail.message', 'Message')}
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              {/* Invoice Info (if sent) */}
              {selectedRequest.invoiceNumber && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-3">
                    {t('admin:subscriptions.requests.detail.invoiceInfo', 'Invoice Information')}
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-purple-600">{t('admin:subscriptions.requests.detail.invoiceNumber', 'Invoice Number')}</p>
                      <p className="font-medium text-purple-900">{selectedRequest.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-purple-600">{t('admin:subscriptions.requests.detail.amount', 'Amount')}</p>
                      <p className="font-medium text-purple-900">
                        {selectedRequest.invoiceAmount
                          ? formatCurrency(selectedRequest.invoiceAmount, selectedRequest.invoiceCurrency || 'CHF')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600">{t('admin:subscriptions.requests.detail.sentAt', 'Sent At')}</p>
                      <p className="font-medium text-purple-900">
                        {selectedRequest.invoiceSentAt
                          ? new Date(selectedRequest.invoiceSentAt).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Info (if received) */}
              {selectedRequest.paymentReceivedAt && (
                <div className="bg-teal-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-teal-900 mb-3">
                    {t('admin:subscriptions.requests.detail.paymentInfo', 'Payment Information')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-teal-600">{t('admin:subscriptions.requests.detail.paymentReference', 'Reference')}</p>
                      <p className="font-medium text-teal-900">{selectedRequest.paymentReference || '-'}</p>
                    </div>
                    <div>
                      <p className="text-teal-600">{t('admin:subscriptions.requests.detail.receivedAt', 'Received At')}</p>
                      <p className="font-medium text-teal-900">
                        {new Date(selectedRequest.paymentReceivedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {t('admin:subscriptions.requests.detail.notes', 'Admin Notes')}
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              {/* Decline reason */}
              {selectedRequest.status === SubscriptionRequestStatus.DECLINED && selectedRequest.declineReason && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">
                    {t('admin:subscriptions.requests.detail.declineReason', 'Decline Reason')}
                  </h4>
                  <p className="text-sm text-red-700">{selectedRequest.declineReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex flex-wrap gap-3 justify-end">
                {selectedRequest.status === SubscriptionRequestStatus.PENDING && (
                  <button
                    onClick={() => reviewRequestMutation.mutate({ id: selectedRequest.id })}
                    disabled={reviewRequestMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4" />
                    {t('admin:subscriptions.requests.actions.review', 'Mark Under Review')}
                  </button>
                )}
                
                {(selectedRequest.status === SubscriptionRequestStatus.PENDING ||
                  selectedRequest.status === SubscriptionRequestStatus.UNDER_REVIEW) && (
                  <>
                    <button
                      onClick={() => {
                        setIsInvoiceModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                      {t('admin:subscriptions.requests.actions.sendInvoice', 'Send Invoice')}
                    </button>
                    <button
                      onClick={() => setIsDeclineModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('admin:subscriptions.requests.actions.decline', 'Decline')}
                    </button>
                  </>
                )}

                {(selectedRequest.status === SubscriptionRequestStatus.INVOICE_SENT ||
                  selectedRequest.status === SubscriptionRequestStatus.PAYMENT_PENDING) && (
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    <DollarSign className="w-4 h-4" />
                    {t('admin:subscriptions.requests.actions.confirmPayment', 'Confirm Payment')}
                  </button>
                )}

                {selectedRequest.status === SubscriptionRequestStatus.PAYMENT_RECEIVED && (
                  <button
                    onClick={() => {
                      activateRequestMutation.mutate({
                        id: selectedRequest.id,
                        data: { sendEmail: true },
                      });
                    }}
                    disabled={activateRequestMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('admin:subscriptions.requests.actions.activate', 'Activate Subscription')}
                  </button>
                )}

                <button
                  onClick={() => setIsRequestDetailOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  {t('common:close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Modal */}
      {isInvoiceModalOpen && selectedRequest && (
        <SendInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          request={selectedRequest}
          onSend={async (data) => {
            await sendInvoiceMutation.mutateAsync({
              id: selectedRequest.id,
              data,
            });
          }}
          isLoading={sendInvoiceMutation.isPending}
        />
      )}

      {/* Confirm Payment Modal */}
      {isPaymentModalOpen && selectedRequest && (
        <ConfirmPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          request={selectedRequest}
          onConfirm={async (data) => {
            await confirmPaymentMutation.mutateAsync({
              id: selectedRequest.id,
              data,
            });
          }}
          isLoading={confirmPaymentMutation.isPending}
        />
      )}

      {/* Decline Modal */}
      {isDeclineModalOpen && selectedRequest && (
        <DeclineRequestModal
          isOpen={isDeclineModalOpen}
          onClose={() => setIsDeclineModalOpen(false)}
          request={selectedRequest}
          onDecline={async (data) => {
            await declineRequestMutation.mutateAsync({
              id: selectedRequest.id,
              data,
            });
          }}
          isLoading={declineRequestMutation.isPending}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SubscriptionSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={subscriptionSettings}
          onSave={async (data) => {
            await updateSettingsMutation.mutateAsync(data);
          }}
          isLoading={updateSettingsMutation.isPending}
        />
      )}

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          setSelectedUserSubscription(null);
        }}
        user={selectedUser}
        subscription={selectedUserSubscription}
        plans={plans}
        availableTiers={selectedRole === UserRole.FOUNDATION ? foundationAvailableTiers : undefined}
        onSave={handleSaveSubscription}
        onDelete={selectedUserSubscription ? () => deleteSubscriptionMutation.mutate(selectedUserSubscription.id) : undefined}
        isLoading={updateSubscriptionMutation.isPending || deleteSubscriptionMutation.isPending}
      />

      {/* Subscription Plan Editor Modal */}
      <EditSubscriptionPlanModal
        isOpen={isPlanEditorOpen}
        onClose={() => setIsPlanEditorOpen(false)}
        plans={plans}
        onSave={async ({ planId, billingPeriod }) => {
          await updatePlanMutation.mutateAsync({ planId, billingPeriod });
        }}
        isLoading={updatePlanMutation.isPending}
      />

      <EditPricingTierModal
        isOpen={isTierEditorOpen}
        onClose={() => {
          setIsTierEditorOpen(false);
          setEditingPricingTier(null);
        }}
        tier={editingPricingTier}
        onSave={async (payload) => {
          await upsertPricingTierMutation.mutateAsync(payload);
        }}
        isLoading={upsertPricingTierMutation.isPending}
      />
    </div>
  );
};

export default Subscriptions;
