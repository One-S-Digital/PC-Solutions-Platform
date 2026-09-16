import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SignupTraceEvent,
  clearSignupCorrelationId,
  getSignupCorrelationId,
  resetSignupCorrelationId,
  signupTraceHeaders,
  traceSignup,
  traceSignupBeacon,
} from '../../utils/signupTrace';

const CORRELATION_KEY = 'procreche.signup.correlationId.v1';

/**
 * The correlation id is the only thing joining the browser's events to the
 * webhook's and the API's. If it is not stable across a reload, the timeline
 * silently splits in two and the log stops answering the question it exists for
 * — so its persistence is worth pinning down.
 */
describe('signupTrace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('correlation id', () => {
    it('mints an id once and reuses it across calls', () => {
      const first = getSignupCorrelationId();
      expect(first).toBeTruthy();
      expect(getSignupCorrelationId()).toBe(first);
      expect(window.localStorage.getItem(CORRELATION_KEY)).toBe(first);
    });

    it('survives a reload by reading the stored value back', () => {
      window.localStorage.setItem(CORRELATION_KEY, 'existing-journey-id');
      expect(getSignupCorrelationId()).toBe('existing-journey-id');
    });

    it('mints a NEW id when a fresh signup starts', () => {
      const first = getSignupCorrelationId();
      const second = resetSignupCorrelationId();

      // Two separate attempts by the same person must not collapse into one
      // timeline, or the second attempt looks like a continuation of the first.
      expect(second).not.toBe(first);
      expect(getSignupCorrelationId()).toBe(second);
    });

    it('clears the id once the signup has completed', () => {
      const first = getSignupCorrelationId();
      clearSignupCorrelationId();

      expect(window.localStorage.getItem(CORRELATION_KEY)).toBeNull();
      expect(getSignupCorrelationId()).not.toBe(first);
    });

    it('still returns a usable id when storage throws', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });

      // Private mode must degrade the trace, never break the wizard.
      expect(getSignupCorrelationId()).toBeTruthy();
    });

    it('sends the id as a request header', () => {
      const id = getSignupCorrelationId();
      expect(signupTraceHeaders()).toEqual({ 'X-Signup-Correlation-Id': id });
    });
  });

  describe('reporting', () => {
    it('posts the event with its correlation id and keepalive', () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      traceSignup(SignupTraceEvent.STEP3_ENTERED, { role: 'EDUCATOR' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      expect(init.keepalive).toBe(true);
      expect(JSON.parse(init.body)).toMatchObject({
        event: 'client.step3_entered',
        role: 'EDUCATOR',
        correlationId: getSignupCorrelationId(),
      });
    });

    it('never throws when the network is unavailable', () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      expect(() => traceSignup(SignupTraceEvent.DRAFT_SAVED)).not.toThrow();
    });

    it('uses sendBeacon for the abandonment event', () => {
      const beacon = vi.fn().mockReturnValue(true);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });

      traceSignupBeacon(SignupTraceEvent.WIZARD_ABANDONED, { outcome: 'FAIL' });

      // sendBeacon is the only transport that survives the page unloading, so
      // the abandonment event must not fall back to fetch when it is available.
      expect(beacon).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back to fetch when sendBeacon refuses the payload', () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);
      Object.defineProperty(navigator, 'sendBeacon', {
        value: vi.fn().mockReturnValue(false),
        configurable: true,
      });

      traceSignupBeacon(SignupTraceEvent.WIZARD_ABANDONED);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
