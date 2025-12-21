/**
 * Billing period parsing and date math for SubscriptionPlan.billingPeriod.
 *
 * We intentionally support both legacy values (monthly/quarterly/yearly)
 * and the admin UI options requested by the business (30 days, monthly recurring, 1 year).
 */
export type BillingPeriodResolution =
  | {
      /** Canonical identifier for internal logic */
      key: 'monthly';
      /** Whether the subscription should auto-renew when period ends */
      isRecurring: true;
      /** Adds one period to the provided date */
      addPeriod: (start: Date) => Date;
      /** Approximate months for analytics (MRR normalization) */
      monthsPerPeriod: 1;
    }
  | {
      key: 'quarterly';
      isRecurring: true;
      addPeriod: (start: Date) => Date;
      monthsPerPeriod: 3;
    }
  | {
      key: 'yearly';
      isRecurring: true;
      addPeriod: (start: Date) => Date;
      monthsPerPeriod: 12;
    }
  | {
      key: 'monthly_recurring';
      isRecurring: true;
      addPeriod: (start: Date) => Date;
      monthsPerPeriod: 1;
    }
  | {
      key: 'fixed_30_days';
      isRecurring: false;
      addPeriod: (start: Date) => Date;
      monthsPerPeriod: 1; // approx for reporting only (30-day month)
    }
  | {
      key: 'fixed_1_year';
      isRecurring: false;
      addPeriod: (start: Date) => Date;
      monthsPerPeriod: 12;
    };

function normalizeBillingPeriod(input: string | null | undefined): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function addUtcMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function addUtcYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Resolve billingPeriod string into real renewal logic.
 *
 * - "monthly"/"quarterly"/"yearly": legacy recurring periods (auto-renew when enabled)
 * - "monthly recurring": recurring monthly (explicitly called out)
 * - "30 days": fixed-term (does NOT auto-renew)
 * - "1 year": fixed-term (does NOT auto-renew)
 */
export function resolveBillingPeriod(billingPeriod: string | null | undefined): BillingPeriodResolution {
  const value = normalizeBillingPeriod(billingPeriod);

  switch (value) {
    case 'monthly':
      return { key: 'monthly', isRecurring: true, addPeriod: (d) => addUtcMonths(d, 1), monthsPerPeriod: 1 };
    case 'quarterly':
      return { key: 'quarterly', isRecurring: true, addPeriod: (d) => addUtcMonths(d, 3), monthsPerPeriod: 3 };
    case 'yearly':
    case 'annual':
    case 'annually':
    case 'year':
      return { key: 'yearly', isRecurring: true, addPeriod: (d) => addUtcYears(d, 1), monthsPerPeriod: 12 };

    case 'monthly recurring':
    case 'monthly recur':
    case 'monthly subscription':
      return { key: 'monthly_recurring', isRecurring: true, addPeriod: (d) => addUtcMonths(d, 1), monthsPerPeriod: 1 };

    case '30 days':
    case '30 day':
    case '30-day':
    case 'p30d':
      return { key: 'fixed_30_days', isRecurring: false, addPeriod: (d) => addUtcDays(d, 30), monthsPerPeriod: 1 };

    case '1 year':
    case '1 yr':
    case 'one year':
    case 'p1y':
      return { key: 'fixed_1_year', isRecurring: false, addPeriod: (d) => addUtcYears(d, 1), monthsPerPeriod: 12 };

    default:
      // Default to monthly recurring semantics for backward compatibility.
      return { key: 'monthly', isRecurring: true, addPeriod: (d) => addUtcMonths(d, 1), monthsPerPeriod: 1 };
  }
}

