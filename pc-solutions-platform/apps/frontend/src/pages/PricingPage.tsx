import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge,
  ThemeToggle
} from '@repo/ui';

interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  features: string[];
  isActive: boolean;
  planPrices: PlanPrice[];
}

interface PlanPrice {
  id: string;
  cadence: string;
  kind: string;
  amount: number;
}

export default function PricingPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createCheckoutSession = async (planCode: string, cadence: string, kind: string) => {
    try {
      setIsCreatingSession(`${planCode}-${cadence}-${kind}`);
      const token = await getToken();
      
      const response = await fetch(`/api/billing/checkout/${cadence}${kind === 'one_time' ? '/onetime' : kind === 'recurring' ? '/recurring' : ''}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planCode }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
    } finally {
      setIsCreatingSession(null);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount / 100);
  };

  const getPriceForPlan = (planPrices: PlanPrice[], cadence: string, kind: string) => {
    const price = planPrices.find(p => p.cadence === cadence && p.kind === kind);
    return price ? formatPrice(price.amount) : 'N/A';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading pricing...</p>
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
          <h1 className="text-text-strong font-semibold tracking-tight">Pricing Plans</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-strong mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Flexible pricing options for foundations, suppliers, and service providers. 
            Choose monthly recurring or annual (recurring or one-time) billing.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <SwissCard key={plan.id} variant="accent" className="p-6 relative">
              {plan.code === 'ESSENTIAL' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="success">Most Popular</Badge>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-text-strong mb-2">{plan.name}</h3>
                <p className="text-text-muted text-sm">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-accent mb-1">
                    {getPriceForPlan(plan.planPrices, 'monthly', 'recurring')}
                  </div>
                  <div className="text-text-muted text-sm">per month</div>
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-2xl font-semibold text-text-strong mb-1">
                    {getPriceForPlan(plan.planPrices, 'annual', 'recurring')}
                  </div>
                  <div className="text-text-muted text-sm">per year (recurring)</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-semibold text-text-strong mb-1">
                    {getPriceForPlan(plan.planPrices, 'annual', 'one_time')}
                  </div>
                  <div className="text-text-muted text-sm">one-time payment</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-text-default">
                      <span className="text-accent mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <SwissButton
                  variant="primary"
                  className="w-full"
                  onClick={() => createCheckoutSession(plan.code, 'monthly', 'recurring')}
                  disabled={isCreatingSession === `${plan.code}-monthly-recurring`}
                >
                  {isCreatingSession === `${plan.code}-monthly-recurring` ? 'Processing...' : 'Monthly Plan'}
                </SwissButton>
                
                <SwissButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => createCheckoutSession(plan.code, 'annual', 'recurring')}
                  disabled={isCreatingSession === `${plan.code}-annual-recurring`}
                >
                  {isCreatingSession === `${plan.code}-annual-recurring` ? 'Processing...' : 'Annual (Recurring)'}
                </SwissButton>
                
                <SwissButton
                  variant="outline"
                  className="w-full"
                  onClick={() => createCheckoutSession(plan.code, 'annual', 'one_time')}
                  disabled={isCreatingSession === `${plan.code}-annual-one_time`}
                >
                  {isCreatingSession === `${plan.code}-annual-one_time` ? 'Processing...' : 'Annual (One-time)'}
                </SwissButton>
              </div>
            </SwissCard>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-text-strong text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <SwissCard variant="accent" className="p-6">
              <h3 className="font-semibold text-text-strong mb-2">
                What's the difference between recurring and one-time annual payments?
              </h3>
              <p className="text-text-muted text-sm">
                Recurring annual payments automatically renew each year, while one-time payments 
                give you access for exactly one year without automatic renewal.
              </p>
            </SwissCard>

            <SwissCard variant="accent" className="p-6">
              <h3 className="font-semibold text-text-strong mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-text-muted text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated 
                and reflected in your next billing cycle.
              </p>
            </SwissCard>

            <SwissCard variant="accent" className="p-6">
              <h3 className="font-semibold text-text-strong mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-text-muted text-sm">
                We accept all major credit cards, debit cards, and bank transfers through Stripe. 
                TWINT is also available for Swiss customers.
              </p>
            </SwissCard>

            <SwissCard variant="accent" className="p-6">
              <h3 className="font-semibold text-text-strong mb-2">
                Is there a free trial?
              </h3>
              <p className="text-text-muted text-sm">
                Yes, all plans come with a 14-day free trial. You can cancel anytime during the 
                trial period without being charged.
              </p>
            </SwissCard>
          </div>
        </div>
      </main>
    </div>
  );
}