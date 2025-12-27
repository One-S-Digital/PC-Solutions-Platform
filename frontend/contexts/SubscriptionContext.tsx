/**
 * SubscriptionContext - Manages subscription state for the application
 * 
 * This context provides subscription status information throughout the app,
 * enabling paywall functionality for roles that require subscriptions.
 * 
 * Future-proofed for Stripe/payment gateway integration:
 * - paymentGateway object contains provider-agnostic fields
 * - checkoutUrl field ready for Stripe Checkout integration
 * - portalUrl field ready for Stripe Customer Portal
 * 
 * @see /api/src/subscription-management/subscription-management.controller.ts
 */

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../providers/AuthProvider';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { UserRole } from '../types';

// =====================================
// TYPES
// =====================================

/**
 * Subscription status enum matching backend SubscriptionStatus
 */
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PAUSED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'TRIAL'
  | 'PAST_DUE'
  | 'PENDING'
  | 'GRACE_PERIOD';

/**
 * Payment gateway provider type
 * Ready for future Stripe integration
 */
export type PaymentProvider = 'manual' | 'stripe' | 'other';

/**
 * Subscription plan interface
 */
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
  // Stripe fields for future integration
  stripePriceId?: string;
  stripeProductId?: string;
}

/**
 * Subscription details interface
 */
export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  tier: string;
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
  isManual: boolean;
  activatedBy?: string;
  activatedAt?: string;
  gracePeriodEnd?: string;
  notes?: string;
  // Stripe fields for future integration
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  plan: SubscriptionPlan;
}

/**
 * Payment gateway information
 * Future-proofed for Stripe Customer Portal integration
 */
export interface PaymentGatewayInfo {
  /** Payment provider: manual, stripe, or other */
  provider: PaymentProvider;
  /** Customer ID in payment system (e.g., Stripe cus_xxx) */
  customerId: string | null;
  /** Subscription ID in payment system (e.g., Stripe sub_xxx) */
  subscriptionId: string | null;
  /** URL to payment portal (e.g., Stripe Customer Portal) */
  portalUrl: string | null;
}

/**
 * User subscription response from API
 */
export interface UserSubscriptionData {
  hasActiveSubscription: boolean;
  requiresSubscription: boolean;
  status: SubscriptionStatus | null;
  subscription: Subscription | null;
  features: string[];
  limits: Record<string, any> | null;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  daysUntilExpiry: number | null;
  cancelAtPeriodEnd: boolean;
  paymentGateway: PaymentGatewayInfo;
}

/**
 * Subscription request payload (for manual subscription flow)
 */
export interface SubscriptionRequestPayload {
  planId: string;
  tier?: string;
  billingPeriod?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredContact?: 'email' | 'phone';
  message?: string;
  // Note: organizationId is obtained from auth context on the backend, not sent by frontend
  notes?: string;
}

/**
 * Subscription request response
 */
export interface SubscriptionRequestResponse {
  message: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  /** Future: Stripe Checkout URL for payment */
  checkoutUrl: string | null;
}

/**
 * Subscription context type
 */
export interface SubscriptionContextType {
  // Status
  /** Whether user has an active subscription */
  hasActiveSubscription: boolean;
  /** Whether user's role requires a subscription */
  requiresSubscription: boolean;
  /** Current subscription status */
  status: SubscriptionStatus | null;
  /** Whether subscription is being loaded */
  isLoading: boolean;
  /** Error message if subscription fetch failed */
  error: string | null;

  // Subscription data
  /** Current subscription details */
  subscription: Subscription | null;
  /** Available features in current plan */
  features: string[];
  /** Plan limits */
  limits: Record<string, any> | null;
  /** Current plan details */
  plan: SubscriptionPlan | null;
  /** Subscription expiry date */
  expiresAt: Date | null;

  // Trial info
  /** Whether subscription is in trial period */
  isTrialing: boolean;
  /** Days remaining in trial */
  trialDaysRemaining: number | null;

  // Expiry info
  /** Days until subscription expires */
  daysUntilExpiry: number | null;
  /** Whether subscription is set to cancel at period end */
  cancelAtPeriodEnd: boolean;

  // Payment gateway
  /** Payment gateway information (for Stripe integration) */
  paymentGateway: PaymentGatewayInfo | null;

  // Actions
  /** Refresh subscription data from API */
  refreshSubscription: () => Promise<void>;
  /** Check if user has access to a specific feature */
  hasFeature: (featureKey: string) => boolean;
  /** Check if user is within plan limit for a resource */
  checkLimit: (limitKey: string, currentUsage: number) => boolean;
  /** Request a new subscription (manual flow) */
  requestSubscription: (payload: SubscriptionRequestPayload) => Promise<SubscriptionRequestResponse>;
}

// =====================================
// CONSTANTS
// =====================================

/**
 * Roles that require a subscription to access platform features
 * These roles will see the paywall if they don't have an active subscription
 */
const SUBSCRIPTION_REQUIRED_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
];

// =====================================
// CONTEXT
// =====================================

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/**
 * E2E provider (Playwright): avoids Clerk and external services.
 * Provides enough surface area for pages used in E2E tests.
 */
export const SubscriptionProviderE2E: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value: SubscriptionContextType = {
    hasActiveSubscription: false,
    requiresSubscription: false,
    status: null,
    isLoading: false,
    error: null,
    subscription: null,
    features: [],
    limits: null,
    plan: null,
    expiresAt: null,
    isTrialing: false,
    trialDaysRemaining: null,
    daysUntilExpiry: null,
    cancelAtPeriodEnd: false,
    paymentGateway: null,
    refreshSubscription: async () => undefined,
    hasFeature: () => false,
    checkLimit: () => true,
    requestSubscription: async () => ({
      message: 'E2E mock subscription request',
      subscriptionId: 'e2e-mock-sub-id',
      status: 'PENDING',
      checkoutUrl: null,
    }),
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

// =====================================
// PROVIDER
// =====================================

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['subscription', 'common']);
  const { currentUser } = useAuthContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  // State
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived: Does user's role require subscription?
  const requiresSubscription = currentUser
    ? SUBSCRIPTION_REQUIRED_ROLES.includes(currentUser.role as UserRole)
    : false;

  /**
   * Fetch subscription data from API
   */
  const fetchSubscription = useCallback(async () => {
    // No user logged in - reset state
    if (!currentUser) {
      setSubscriptionData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // User doesn't need subscription - set default values
    if (!requiresSubscription) {
      setSubscriptionData({
        hasActiveSubscription: true, // Free roles have full access
        requiresSubscription: false,
        status: null,
        subscription: null,
        features: ['*'],
        limits: null,
        plan: null,
        expiresAt: null,
        isTrialing: false,
        trialDaysRemaining: null,
        daysUntilExpiry: null,
        cancelAtPeriodEnd: false,
        paymentGateway: {
          provider: 'manual',
          customerId: null,
          subscriptionId: null,
          portalUrl: null,
        },
      });
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fetch subscription from API
    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedRequest<UserSubscriptionData>('/subscriptions/me');

      if (response.success && response.data) {
        setSubscriptionData(response.data);
      } else {
        // No subscription found - user needs to subscribe
        setSubscriptionData({
          hasActiveSubscription: false,
          requiresSubscription: true,
          status: null,
          subscription: null,
          features: [],
          limits: null,
          plan: null,
          expiresAt: null,
          isTrialing: false,
          trialDaysRemaining: null,
          daysUntilExpiry: null,
          cancelAtPeriodEnd: false,
          paymentGateway: {
            provider: 'manual',
            customerId: null,
            subscriptionId: null,
            portalUrl: null,
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError(err instanceof Error ? err.message : t('subscription:errors.fetchFailed'));
      
      // Set default state on error
      setSubscriptionData({
        hasActiveSubscription: false,
        requiresSubscription: true,
        status: null,
        subscription: null,
        features: [],
        limits: null,
        plan: null,
        expiresAt: null,
        isTrialing: false,
        trialDaysRemaining: null,
        daysUntilExpiry: null,
        cancelAtPeriodEnd: false,
        paymentGateway: {
          provider: 'manual',
          customerId: null,
          subscriptionId: null,
          portalUrl: null,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, requiresSubscription, authenticatedRequest, t]);

  // Fetch subscription when user changes
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Check if user has access to a specific feature
   */
  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      // Free roles have all features
      if (!requiresSubscription) {
        return true;
      }

      // No subscription data yet - loading
      if (!subscriptionData) {
        return false;
      }

      // Check if has active subscription
      if (!subscriptionData.hasActiveSubscription) {
        return false;
      }

      // Check if feature is in plan
      const features = subscriptionData.features;
      
      // Wildcard means all features
      if (features.includes('*')) {
        return true;
      }

      return features.includes(featureKey);
    },
    [requiresSubscription, subscriptionData]
  );

  /**
   * Check if user is within plan limit for a resource
   */
  const checkLimit = useCallback(
    (limitKey: string, currentUsage: number): boolean => {
      // Free roles have no limits
      if (!requiresSubscription) {
        return true;
      }

      // No subscription data - block
      if (!subscriptionData) {
        return false;
      }

      // No limits defined in plan - allow (unlimited)
      if (!subscriptionData.limits) {
        return true;
      }

      const limit = subscriptionData.limits[limitKey];

      // No limit defined for this key - allow
      if (limit === undefined || limit === null || limit === -1) {
        return true;
      }

      // Check if under limit
      return currentUsage < limit;
    },
    [requiresSubscription, subscriptionData]
  );

  /**
   * Request a new subscription (manual flow)
   * Future: Will integrate with Stripe Checkout
   */
  const requestSubscription = useCallback(
    async (payload: SubscriptionRequestPayload): Promise<SubscriptionRequestResponse> => {
      const response = await authenticatedRequest<SubscriptionRequestResponse>(
        '/subscriptions/request',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || t('subscription:errors.requestFailed'));
      }

      // Refresh subscription data after request
      await fetchSubscription();

      return response.data;
    },
    [authenticatedRequest, fetchSubscription, t]
  );

  // Build context value
  const contextValue: SubscriptionContextType = {
    // Status
    hasActiveSubscription: subscriptionData?.hasActiveSubscription ?? false,
    requiresSubscription,
    status: subscriptionData?.status ?? null,
    isLoading,
    error,

    // Subscription data
    subscription: subscriptionData?.subscription ?? null,
    features: subscriptionData?.features ?? [],
    limits: subscriptionData?.limits ?? null,
    plan: subscriptionData?.plan ?? null,
    expiresAt: subscriptionData?.expiresAt ? new Date(subscriptionData.expiresAt) : null,

    // Trial info
    isTrialing: subscriptionData?.isTrialing ?? false,
    trialDaysRemaining: subscriptionData?.trialDaysRemaining ?? null,

    // Expiry info
    daysUntilExpiry: subscriptionData?.daysUntilExpiry ?? null,
    cancelAtPeriodEnd: subscriptionData?.cancelAtPeriodEnd ?? false,

    // Payment gateway
    paymentGateway: subscriptionData?.paymentGateway ?? null,

    // Actions
    refreshSubscription: fetchSubscription,
    hasFeature,
    checkLimit,
    requestSubscription,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// =====================================
// HOOK
// =====================================

/**
 * Hook to access subscription context
 * 
 * @example
 * ```tsx
 * const { hasActiveSubscription, requiresSubscription, features } = useSubscription();
 * 
 * if (requiresSubscription && !hasActiveSubscription) {
 *   return <SubscriptionPaywall />;
 * }
 * ```
 */
export const useSubscription = (): SubscriptionContextType => {
  const { t } = useTranslation(['subscription', 'common']);
  const context = useContext(SubscriptionContext);

  if (context === undefined) {
    throw new Error(t('subscription:errors.contextMissing', 'useSubscription must be used within a SubscriptionProvider'));
  }

  return context;
};

// =====================================
// UTILITY EXPORTS
// =====================================

/**
 * Check if a role requires subscription
 */
export const roleRequiresSubscription = (role: UserRole): boolean => {
  return SUBSCRIPTION_REQUIRED_ROLES.includes(role);
};

/**
 * Get roles that require subscription
 */
export const getSubscriptionRequiredRoles = (): UserRole[] => {
  return [...SUBSCRIPTION_REQUIRED_ROLES];
};
