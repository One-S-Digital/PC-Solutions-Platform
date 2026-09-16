import { describe, it, expect } from 'vitest';
import {
  ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS,
  FRESH_ACCOUNT_WINDOW_MS,
  WEBHOOK_RETRY_DELAYS_MS,
  isFreshAccount,
  totalRetryBudgetMs,
  webhookRetryDelayMs,
} from '../../utils/webhookRetry';

/**
 * The signup wizard waits up to 60s for the provisioning webhook. This provider
 * used to give up after ~4s and cache the failure, so on a cold backend the two
 * disagreed: the wizard said "Account created!" while the app still believed
 * there was no account, and the protected route asked the user to fill in
 * everything again.
 *
 * These tests pin the two properties that stop that happening again — and the
 * one that stops the cure being worse than the disease.
 */
describe('webhookRetry', () => {
  describe('isFreshAccount', () => {
    it('treats a just-created account as mid-signup', () => {
      expect(isFreshAccount(new Date())).toBe(true);
    });

    it('treats an account created moments ago as mid-signup', () => {
      const now = Date.now();
      expect(isFreshAccount(new Date(now - 30_000), now)).toBe(true);
    });

    it('treats an established account as NOT mid-signup', () => {
      const now = Date.now();
      // An OAuth user returning later must reach the role picker immediately,
      // not sit through a webhook wait for a webhook that is never coming.
      expect(isFreshAccount(new Date(now - FRESH_ACCOUNT_WINDOW_MS - 1), now)).toBe(false);
      expect(isFreshAccount(new Date(now - 7 * 24 * 60 * 60 * 1000), now)).toBe(false);
    });

    it('errs towards fresh when the creation time is unknown or unparseable', () => {
      // Waiting a few extra seconds for an established user is a far smaller
      // harm than making a mid-signup user re-enter everything.
      expect(isFreshAccount(undefined)).toBe(true);
      expect(isFreshAccount(null)).toBe(true);
      expect(isFreshAccount('not a date')).toBe(true);
    });

    it('accepts an ISO string as well as a Date', () => {
      const now = Date.now();
      expect(isFreshAccount(new Date(now - 10_000).toISOString(), now)).toBe(true);
    });
  });

  describe('webhookRetryDelayMs', () => {
    it('walks the fresh-account schedule then stops', () => {
      WEBHOOK_RETRY_DELAYS_MS.forEach((expected, attempt) => {
        expect(webhookRetryDelayMs(attempt, true)).toBe(expected);
      });
      expect(webhookRetryDelayMs(WEBHOOK_RETRY_DELAYS_MS.length, true)).toBeNull();
    });

    it('gives an established account a short budget', () => {
      expect(webhookRetryDelayMs(0, false)).toBe(ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS[0]);
      expect(webhookRetryDelayMs(ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS.length, false)).toBeNull();
    });

    it('backs off rather than hammering the backend', () => {
      // A cold-started backend is the common cause of the long tail; retrying
      // every 200ms would just pile requests onto something already struggling.
      for (let i = 1; i < WEBHOOK_RETRY_DELAYS_MS.length; i++) {
        expect(WEBHOOK_RETRY_DELAYS_MS[i]).toBeGreaterThanOrEqual(WEBHOOK_RETRY_DELAYS_MS[i - 1]);
      }
    });

    it('never returns a delay for a negative attempt', () => {
      expect(webhookRetryDelayMs(-1, true)).toBeNull();
    });
  });

  describe('budgets', () => {
    it('gives a mid-signup account at least 45s, comparable to the wizard', () => {
      // The wizard polls for 60s. If this budget were much shorter, the two
      // would disagree again and the original bug would come straight back.
      expect(totalRetryBudgetMs(true)).toBeGreaterThanOrEqual(45_000);
    });

    it('keeps an established account under 5s so the role picker is not stalled', () => {
      expect(totalRetryBudgetMs(false)).toBeLessThan(5_000);
    });

    it('waits far longer for a fresh account than an established one', () => {
      expect(totalRetryBudgetMs(true)).toBeGreaterThan(totalRetryBudgetMs(false) * 5);
    });

    it('keeps the freshness window wider than the wizard budget it guards', () => {
      // The wizard gives provisioning 60s; an account still being provisioned at
      // second 59 must not be reclassified as established mid-wait.
      expect(FRESH_ACCOUNT_WINDOW_MS).toBeGreaterThan(60_000);
    });
  });
});
