import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge,
  ThemeToggle
} from '@repo/ui';

interface SubscriptionData {
  hasActiveSubscription: boolean;
  hasActiveLicense: boolean;
  subscription?: any;
  license?: any;
  isEntitled: boolean;
}

export default function BillingSettingsPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch('/api/billing/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createPortalSession = async () => {
    try {
      setIsCreatingPortal(true);
      const token = await getToken();
      const response = await fetch('/api/billing/portal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create portal session:', err);
    } finally {
      setIsCreatingPortal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-surface-1/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-accent"></div>
          <h1 className="text-text-strong font-semibold tracking-tight">Billing Settings</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Subscription Status */}
        <SwissCard variant="accent" className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-strong mb-4">Current Subscription</h2>
          
          {subscriptionData?.isEntitled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">Active</Badge>
                <span className="text-text-strong font-medium">
                  {subscriptionData.hasActiveSubscription ? 'Subscription' : 'License'}
                </span>
              </div>

              {subscriptionData.subscription && (
                <div className="space-y-2">
                  <p className="text-text-muted">
                    <strong>Plan:</strong> {subscriptionData.subscription.plan?.name}
                  </p>
                  <p className="text-text-muted">
                    <strong>Billing:</strong> {subscriptionData.subscription.cadence}
                  </p>
                  <p className="text-text-muted">
                    <strong>Status:</strong> {subscriptionData.subscription.status}
                  </p>
                  <p className="text-text-muted">
                    <strong>Next billing:</strong> {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                  </p>
                </div>
              )}

              {subscriptionData.license && (
                <div className="space-y-2">
                  <p className="text-text-muted">
                    <strong>Plan:</strong> {subscriptionData.license.plan?.name}
                  </p>
                  <p className="text-text-muted">
                    <strong>Type:</strong> One-time payment
                  </p>
                  <p className="text-text-muted">
                    <strong>Expires:</strong> {formatDate(subscriptionData.license.accessExpiresAt)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-text-strong mb-2">No Active Subscription</h3>
              <p className="text-text-muted mb-4">
                You don't have an active subscription. Choose a plan to get started.
              </p>
              <a href="/pricing">
                <SwissButton variant="primary">View Plans</SwissButton>
              </a>
            </div>
          )}
        </SwissCard>

        {/* Billing Management */}
        {subscriptionData?.isEntitled && (
          <SwissCard variant="accent" className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Billing Management</h2>
            <p className="text-text-muted mb-4">
              Manage your subscription, update payment methods, and view billing history.
            </p>
            <SwissButton
              variant="primary"
              onClick={createPortalSession}
              disabled={isCreatingPortal}
            >
              {isCreatingPortal ? 'Opening...' : 'Manage Billing'}
            </SwissButton>
          </SwissCard>
        )}

        {/* Billing Information */}
        <SwissCard variant="accent" className="p-6">
          <h2 className="text-xl font-semibold text-text-strong mb-4">Billing Information</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-text-strong mb-2">Payment Methods</h3>
              <p className="text-text-muted text-sm">
                Your payment methods are securely stored with Stripe. Use the billing portal to add, update, or remove payment methods.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-text-strong mb-2">Invoices</h3>
              <p className="text-text-muted text-sm">
                All invoices and receipts are available in your billing portal. You'll also receive email confirmations for all transactions.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-text-strong mb-2">Cancellation</h3>
              <p className="text-text-muted text-sm">
                You can cancel your subscription at any time through the billing portal. Cancellations take effect at the end of your current billing period.
              </p>
            </div>
          </div>
        </SwissCard>
      </main>
    </div>
  );
}