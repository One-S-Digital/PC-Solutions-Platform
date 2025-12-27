/**
 * SubscriptionPaywall - Component that blocks access to features requiring subscription
 * 
 * This component wraps protected content and shows a paywall if the user:
 * 1. Has a role that requires subscription (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER)
 * 2. Does not have an active subscription (ACTIVE or TRIAL status)
 * 
 * Features:
 * - Different UI for different subscription statuses (pending, expired, etc.)
 * - Links to pricing page and billing settings
 * - Supports custom fallback content
 * - Route-aware: allows certain routes without subscription (settings, profile)
 * 
 * Future-proofed for Stripe integration:
 * - Ready to show "Manage Subscription" button linking to Stripe Customer Portal
 * - Ready to show upgrade/downgrade options
 * 
 * @example
 * ```tsx
 * // Wrap entire protected layout
 * <SubscriptionPaywall>
 *   <Routes>...</Routes>
 * </SubscriptionPaywall>
 * 
 * // Wrap specific feature
 * <SubscriptionPaywall requiredFeature="recruitment">
 *   <RecruitmentModule />
 * </SubscriptionPaywall>
 * ```
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LockClosedIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useSubscription, SubscriptionStatus } from '../../contexts/SubscriptionContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

// =====================================
// TYPES
// =====================================

export interface SubscriptionPaywallProps {
  /** Child content to show if subscription is active */
  children: React.ReactNode;
  /** Optional: Require specific feature access */
  requiredFeature?: string;
  /** Optional: Custom fallback content instead of default paywall */
  fallback?: React.ReactNode;
  /** Optional: Show inline paywall instead of full-page */
  inline?: boolean;
  /** Optional: Custom title for the paywall */
  title?: string;
  /** Optional: Custom message for the paywall */
  message?: string;
}

// =====================================
// CONSTANTS
// =====================================

/**
 * Routes that are always accessible without subscription
 * These allow users to manage their account/subscription even without active sub
 */
const ALWAYS_ALLOWED_ROUTES = [
  '/pricing',
  '/settings/profile',
  '/profile',
  '/settings',
  '/support',
];

/**
 * Route prefixes that are always allowed
 */
const ALWAYS_ALLOWED_PREFIXES = [
  '/pricing',
  '/settings',
  '/profile',
  '/support',
];

// =====================================
// PAYWALL CONTENT COMPONENTS
// =====================================

interface PaywallContentProps {
  status: SubscriptionStatus | null;
  inline?: boolean;
  title?: string;
  message?: string;
  onNavigateToPricing: () => void;
  onNavigateToBilling: () => void;
  onNavigateToProfile: () => void;
  onContactSupport: () => void;
}

/**
 * Get icon based on subscription status
 */
const getStatusIcon = (status: SubscriptionStatus | null): React.ElementType => {
  switch (status) {
    case 'PENDING':
      return ClockIcon;
    case 'EXPIRED':
    case 'CANCELLED':
      return ExclamationTriangleIcon;
    case 'PAUSED':
      return ClockIcon;
    case 'PAST_DUE':
    case 'GRACE_PERIOD':
      return CreditCardIcon;
    default:
      return LockClosedIcon;
  }
};

/**
 * Get icon color based on subscription status
 */
const getStatusIconColor = (status: SubscriptionStatus | null): string => {
  switch (status) {
    case 'PENDING':
      return 'text-blue-500';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'text-red-500';
    case 'PAUSED':
      return 'text-yellow-500';
    case 'PAST_DUE':
    case 'GRACE_PERIOD':
      return 'text-orange-500';
    default:
      return 'text-amber-500';
  }
};

/**
 * Paywall content - the actual UI shown when subscription is required
 */
const PaywallContent: React.FC<PaywallContentProps> = ({
  status,
  inline = false,
  title,
  message,
  onNavigateToPricing,
  onNavigateToBilling,
  onNavigateToProfile,
  onContactSupport,
}) => {
  const { t } = useTranslation(['subscription', 'common']);

  const Icon = getStatusIcon(status);
  const iconColor = getStatusIconColor(status);

  // Determine title and message based on status
  const getDefaultTitle = (): string => {
    switch (status) {
      case 'PENDING':
        return t('subscription:paywall.pendingTitle', 'Subscription Pending');
      case 'EXPIRED':
        return t('subscription:paywall.expiredTitle', 'Subscription Expired');
      case 'CANCELLED':
        return t('subscription:paywall.cancelledTitle', 'Subscription Cancelled');
      case 'PAUSED':
        return t('subscription:paywall.pausedTitle', 'Subscription Paused');
      case 'PAST_DUE':
        return t('subscription:paywall.pastDueTitle', 'Payment Required');
      case 'GRACE_PERIOD':
        return t('subscription:paywall.graceTitle', 'Grace Period');
      default:
        return t('subscription:paywall.requiredTitle', 'Subscription Required');
    }
  };

  const getDefaultMessage = (): string => {
    switch (status) {
      case 'PENDING':
        return t(
          'subscription:paywall.pendingMessage',
          'Your subscription request is being processed. Our team will contact you shortly to activate your account.'
        );
      case 'EXPIRED':
        return t(
          'subscription:paywall.expiredMessage',
          'Your subscription has expired. Renew now to regain access to all features.'
        );
      case 'CANCELLED':
        return t(
          'subscription:paywall.cancelledMessage',
          'Your subscription has been cancelled. Subscribe again to continue using the platform.'
        );
      case 'PAUSED':
        return t(
          'subscription:paywall.pausedMessage',
          'Your subscription is currently paused. Contact support to resume access.'
        );
      case 'PAST_DUE':
        return t(
          'subscription:paywall.pastDueMessage',
          'Your payment is overdue. Please update your payment method to restore access.'
        );
      case 'GRACE_PERIOD':
        return t(
          'subscription:paywall.graceMessage',
          'Your subscription is in a grace period. Please renew soon to avoid losing access.'
        );
      default:
        return t(
          'subscription:paywall.requiredMessage',
          'An active subscription is required to access this feature. Choose a plan to get started.'
        );
    }
  };

  const displayTitle = title || getDefaultTitle();
  const displayMessage = message || getDefaultMessage();

  // Determine which buttons to show
  const showPricingButton = !status || status === 'EXPIRED' || status === 'CANCELLED';
  const showBillingButton = status === 'PAST_DUE' || status === 'GRACE_PERIOD' || status === 'PAUSED';
  const showContactButton = status === 'PENDING' || status === 'PAUSED';

  const content = (
    <div className="text-center">
      {/* Icon */}
      <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
        iconColor.replace('text-', 'bg-').replace('500', '100')
      }`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-swiss-charcoal mb-2">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {displayMessage}
      </p>

      {/* Action Buttons */}
      <div className="space-y-3">
        {showPricingButton && (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={onNavigateToPricing}
            leftIcon={SparklesIcon}
          >
            {t('subscription:paywall.viewPlans', 'View Subscription Plans')}
          </Button>
        )}

        {showBillingButton && (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={onNavigateToBilling}
            leftIcon={CreditCardIcon}
          >
            {t('subscription:paywall.manageBilling', 'Manage Billing')}
          </Button>
        )}

        <Button
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto min-w-[200px]"
          onClick={onNavigateToProfile}
          leftIcon={UserCircleIcon}
        >
          {t('subscription:paywall.viewProfile', 'View Profile')}
        </Button>

        {showContactButton && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={onContactSupport}
          >
            {t('subscription:paywall.contactSupport', 'Contact Support')}
          </Button>
        )}
      </div>

      {/* Help text */}
      <p className="mt-6 text-sm text-gray-400">
        {t('subscription:paywall.needHelp', 'Need help?')}{' '}
        <button
          onClick={onContactSupport}
          className="text-swiss-mint hover:underline"
        >
          {t('subscription:paywall.contactUs', 'Contact us')}
        </button>
      </p>
    </div>
  );

  // Inline vs full-page layout
  if (inline) {
    return (
      <Card className="p-6 sm:p-8">
        {content}
      </Card>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 sm:p-8 shadow-lg">
        {content}
      </Card>
    </div>
  );
};

// =====================================
// LOADING COMPONENT
// =====================================

const PaywallLoading: React.FC<{ inline?: boolean }> = ({ inline }) => {
  const content = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-swiss-mint" />
    </div>
  );

  if (inline) {
    return <Card className="p-6">{content}</Card>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      {content}
    </div>
  );
};

// =====================================
// MAIN COMPONENT
// =====================================

/**
 * SubscriptionPaywall component
 * 
 * Wraps content and shows paywall if user doesn't have active subscription
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  children,
  requiredFeature,
  fallback,
  inline = false,
  title,
  message,
}) => {
  const { t } = useTranslation(['subscription', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    hasActiveSubscription,
    requiresSubscription,
    status,
    isLoading,
    hasFeature,
  } = useSubscription();

  // Navigation handlers
  const handleNavigateToPricing = () => navigate('/pricing');
  const handleNavigateToBilling = () => navigate('/settings#billingSubscription');
  const handleNavigateToProfile = () => navigate('/profile');
  const handleContactSupport = () => {
    // Could open support modal or navigate to support page
    window.location.href = 'mailto:support@procreche.ch';
  };

  // Check if current route is always allowed
  const isAllowedRoute = ALWAYS_ALLOWED_ROUTES.some(
    (route) => location.pathname === route
  ) || ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => location.pathname.startsWith(prefix)
  );

  // Still loading - show loading state
  if (isLoading) {
    return <PaywallLoading inline={inline} />;
  }

  // User doesn't need subscription (PARENT, EDUCATOR, ADMIN)
  if (!requiresSubscription) {
    return <>{children}</>;
  }

  // Route is always allowed (settings, profile, pricing)
  if (isAllowedRoute) {
    return <>{children}</>;
  }

  // User has active subscription
  if (hasActiveSubscription) {
    // Check specific feature if required
    if (requiredFeature && !hasFeature(requiredFeature)) {
      return (
        fallback || (
          <PaywallContent
            status={status}
            inline={inline}
            title={title || t('subscription:paywall.featureNotAvailableTitle', 'Feature Not Available')}
            message={message || t('subscription:paywall.featureNotAvailableMessage', { 
              feature: requiredFeature, 
              defaultValue: `This feature requires a higher tier plan. Upgrade to access ${requiredFeature}.` 
            })}
            onNavigateToPricing={handleNavigateToPricing}
            onNavigateToBilling={handleNavigateToBilling}
            onNavigateToProfile={handleNavigateToProfile}
            onContactSupport={handleContactSupport}
          />
        )
      );
    }

    return <>{children}</>;
  }

  // Show paywall
  return (
    fallback || (
      <PaywallContent
        status={status}
        inline={inline}
        title={title}
        message={message}
        onNavigateToPricing={handleNavigateToPricing}
        onNavigateToBilling={handleNavigateToBilling}
        onNavigateToProfile={handleNavigateToProfile}
        onContactSupport={handleContactSupport}
      />
    )
  );
};

// =====================================
// FEATURE GATE COMPONENT
// =====================================

export interface FeatureGateProps {
  /** Feature key to check */
  feature: string;
  /** Content to show if feature is available */
  children: React.ReactNode;
  /** Content to show if feature is not available */
  fallback?: React.ReactNode;
  /** Whether to show inline lock message */
  showLockMessage?: boolean;
}

/**
 * FeatureGate - Smaller component for gating specific features within a page
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="analytics" showLockMessage>
 *   <AnalyticsChart />
 * </FeatureGate>
 * ```
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showLockMessage = true,
}) => {
  const { t } = useTranslation(['subscription', 'common']);
  const { hasFeature, requiresSubscription } = useSubscription();
  const navigate = useNavigate();

  // User doesn't need subscription - show content
  if (!requiresSubscription) {
    return <>{children}</>;
  }

  // User has feature - show content
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Show fallback or lock message
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showLockMessage) {
    return null;
  }

  return (
    <Card className="p-4 text-center bg-gray-50 border-dashed border-2 border-gray-300">
      <LockClosedIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 mb-2">
        {t('subscription:featureGate.locked', 'This feature requires a plan upgrade')}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/pricing')}
      >
        {t('subscription:featureGate.upgrade', 'Upgrade Plan')}
      </Button>
    </Card>
  );
};

export default SubscriptionPaywall;
