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
  onSave: (data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; notes?: string }) => Promise<void>;
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
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status || SubscriptionStatus.INACTIVE);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(subscription?.planId || '');
  const [tier, setTier] = useState<SubscriptionTier>(subscription?.tier || SubscriptionTier.BASIC);
  const [notes, setNotes] = useState<string>(subscription?.notes || '');

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
      setNotes(subscription.notes || '');
    } else {
      setStatus(SubscriptionStatus.INACTIVE);
      setSelectedPlanId('');
      setTier(SubscriptionTier.BASIC);
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

        {/* User Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('admin:subscriptions.editSubscription.selectPlan', 'Select a plan...')}</option>
              {plans.filter((p) => p.isActive).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {new Intl.NumberFormat(CURRENCY_LOCALE, {
                    style: 'currency',
                    currency: plan.currency,
                  }).format(plan.price)}/{billingPeriodLabel(plan.billingPeriod)}
                </option>
              ))}
            </select>
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('admin:subscriptions.editSubscription.saving', 'Saving...') : t('admin:subscriptions.editSubscription.save', 'Save Changes')}
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

const Subscriptions: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserSubscription, setSelectedUserSubscription] = useState<Subscription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
  const [isTierEditorOpen, setIsTierEditorOpen] = useState(false);
  const [editingPricingTier, setEditingPricingTier] = useState<PricingTier | null>(null);

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

  const users: User[] = usersResponse?.data?.data || [];
  const plans: SubscriptionPlan[] = plansResponse?.data?.data || [];
  const analytics: SubscriptionAnalytics | null = analyticsResponse?.data?.data || null;
  const subscriptions: Subscription[] = subscriptionsResponse?.data?.data?.subscriptions || [];
  const pricingTiers: PricingTier[] = pricingTiersResponse?.data?.data || [];

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
      data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; notes?: string };
    }) => {
      const existingSubscription = userSubscriptionMap.get(userId);
      if (existingSubscription) {
        // Update existing subscription - include planId if changed
        return subscriptionService.updateSubscription(apiClient, existingSubscription.id, {
          planId: data.planId,
          tier: data.tier,
          notes: data.notes,
        }).then(() => {
          // Also update status if changed
          if (data.status !== existingSubscription.status) {
            return subscriptionService.updateSubscriptionStatus(apiClient, existingSubscription.id, data.status);
          }
        });
      } else {
        // Create new subscription - validate plan is available
        if (!data.planId && !plans[0]?.id) {
          throw new Error('No plan selected and no plans available');
        }
        return subscriptionService.createSubscription(apiClient, {
          userId,
          planId: data.planId || plans[0]?.id,
          tier: data.tier || SubscriptionTier.BASIC,
          notes: data.notes,
        });
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedUserSubscription(userSubscriptionMap.get(user.id) || null);
    setIsEditModalOpen(true);
  };

  const handleSaveSubscription = async (data: { status: SubscriptionStatus; planId?: string; tier?: SubscriptionTier; notes?: string }) => {
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
            onClick={() => setIsPlanEditorOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t('admin:subscriptions.planEditor.open', 'Edit Plans')}
          </button>
        </div>
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
                {stat.isText ? stat.value : (stat.value as number).toLocaleString()}
              </p>
            </div>
            {stat.icon}
          </div>
        ))}
      </div>

      {/* Role Selection or User List */}
      {!selectedRole ? (
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
      ) : (
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
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              {t('admin:subscriptions.editSubscription.edit', 'Edit')}
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
        isLoading={updateSubscriptionMutation.isPending}
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
