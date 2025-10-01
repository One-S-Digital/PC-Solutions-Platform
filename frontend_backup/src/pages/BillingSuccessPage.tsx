import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge,
  ThemeToggle
} from '@repo/ui';

export default function BillingSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // In a real implementation, you would verify the session with your backend
      // For now, we'll just show a success message
      setIsLoading(false);
      setSessionData({ id: sessionId });
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Processing payment...</p>
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
          <h1 className="text-text-strong font-semibold tracking-tight">Payment Successful</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-text-strong mb-2">
            Payment Successful!
          </h1>
          <p className="text-text-muted">
            Thank you for your subscription. Your payment has been processed successfully.
          </p>
        </div>

        <SwissCard variant="accent" className="p-6 mb-6">
          <div className="text-center">
            <Badge variant="success" className="mb-4">Payment Confirmed</Badge>
            <p className="text-text-muted mb-4">
              Session ID: {sessionData?.id}
            </p>
            <p className="text-text-muted text-sm">
              You will receive a confirmation email shortly with your receipt and subscription details.
            </p>
          </div>
        </SwissCard>

        <div className="text-center space-y-4">
          <Link to="/dashboard">
            <SwissButton variant="primary" className="mr-4">
              Go to Dashboard
            </SwissButton>
          </Link>
          <Link to="/billing/settings">
            <SwissButton variant="secondary">
              Manage Subscription
            </SwissButton>
          </Link>
        </div>
      </main>
    </div>
  );
}