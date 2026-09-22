import { describe, it, expect } from 'vitest';
import { classifyRecoveryFailure } from '../../components/auth/AccountProvisioningGate';

/**
 * The account-provisioning gate offers to create a profile. Doing that for
 * someone who already has an account is the exact failure this whole branch
 * exists to stop — they re-enter everything and end up with a second signup.
 *
 * So the gate may only make that offer when the server has actually said the
 * account is absent. Every other failure says nothing about whether an account
 * exists, and must stay retryable.
 */
describe('classifyRecoveryFailure', () => {
  it('treats a 404 as proof the account is missing', () => {
    expect(classifyRecoveryFailure({ status: 404 })).toBe('missing');
  });

  it('treats a pending account as transient, not missing', () => {
    // 202 / user_pending means the webhook is still provisioning — the
    // opposite of absent. Offering a signup form here would create a duplicate
    // account moments before the real one lands.
    expect(classifyRecoveryFailure({ status: 202, code: 'user_pending' })).toBe('transient');
    expect(classifyRecoveryFailure({ code: 'user_pending' })).toBe('transient');
  });

  it('treats network failure as transient', () => {
    expect(classifyRecoveryFailure({ status: 0, code: 'network_error' })).toBe('transient');
  });

  it('treats auth failures as transient', () => {
    // A stale token on a cold-started backend is not evidence of anything
    // about the account.
    expect(classifyRecoveryFailure({ status: 401, code: 'auth_token_missing' })).toBe('transient');
    expect(classifyRecoveryFailure({ status: 403 })).toBe('transient');
  });

  it('treats server errors as transient', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyRecoveryFailure({ status })).toBe('transient');
    }
  });

  it('defaults to transient for anything unrecognised', () => {
    // The safe default: a retry costs a click, a wrong "missing" costs the
    // user their whole signup.
    expect(classifyRecoveryFailure(new Error('boom'))).toBe('transient');
    expect(classifyRecoveryFailure(undefined)).toBe('transient');
    expect(classifyRecoveryFailure(null)).toBe('transient');
    expect(classifyRecoveryFailure({})).toBe('transient');
  });

  it('never reports missing for a status other than 404', () => {
    const statuses = [0, 200, 202, 301, 400, 401, 403, 408, 409, 429, 500, 502, 503];
    for (const status of statuses) {
      expect(classifyRecoveryFailure({ status }), `status ${status}`).toBe('transient');
    }
  });
});
