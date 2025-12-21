import { resolveBillingPeriod } from './billing-period.util';

describe('resolveBillingPeriod', () => {
  it('treats "monthly recurring" as recurring monthly', () => {
    const r = resolveBillingPeriod('monthly recurring');
    expect(r.isRecurring).toBe(true);
    expect(r.monthsPerPeriod).toBe(1);
    expect(r.key).toBe('monthly_recurring');
  });

  it('treats "30 days" as fixed-term (non-recurring) and adds 30 days', () => {
    const r = resolveBillingPeriod('30 days');
    expect(r.isRecurring).toBe(false);
    expect(r.key).toBe('fixed_30_days');

    const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0));
    const end = r.addPeriod(start);
    expect(end.toISOString()).toBe(new Date(Date.UTC(2025, 0, 31, 0, 0, 0)).toISOString());
  });

  it('treats "1 year" as fixed-term (non-recurring) and adds 1 year', () => {
    const r = resolveBillingPeriod('1 year');
    expect(r.isRecurring).toBe(false);
    expect(r.key).toBe('fixed_1_year');

    const start = new Date(Date.UTC(2025, 5, 10, 0, 0, 0));
    const end = r.addPeriod(start);
    expect(end.toISOString()).toBe(new Date(Date.UTC(2026, 5, 10, 0, 0, 0)).toISOString());
  });

  it('keeps legacy "monthly"/"quarterly"/"yearly" as recurring', () => {
    expect(resolveBillingPeriod('monthly').isRecurring).toBe(true);
    expect(resolveBillingPeriod('quarterly').isRecurring).toBe(true);
    expect(resolveBillingPeriod('yearly').isRecurring).toBe(true);
  });
});

