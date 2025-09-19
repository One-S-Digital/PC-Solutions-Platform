import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge,
  ThemeToggle
} from '@repo/ui';

export default function BillingCancelPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-surface-1/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-accent"></div>
          <h1 className="text-text-strong font-semibold tracking-tight">Payment Cancelled</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-yellow-600">⚠</span>
          </div>
          <h1 className="text-3xl font-bold text-text-strong mb-2">
            Payment Cancelled
          </h1>
          <p className="text-text-muted">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        <SwissCard variant="accent" className="p-6 mb-6">
          <div className="text-center">
            <Badge variant="warning" className="mb-4">Payment Cancelled</Badge>
            <p className="text-text-muted mb-4">
              You can try again anytime or contact our support team if you need assistance.
            </p>
            <p className="text-text-muted text-sm">
              If you're experiencing issues with the payment process, please reach out to our support team.
            </p>
          </div>
        </SwissCard>

        <div className="text-center space-y-4">
          <Link to="/pricing">
            <SwissButton variant="primary" className="mr-4">
              Try Again
            </SwissButton>
          </Link>
          <Link to="/dashboard">
            <SwissButton variant="secondary">
              Back to Dashboard
            </SwissButton>
          </Link>
        </div>
      </main>
    </div>
  );
}