// Browser half of the signup trace.
//
// Why this exists: the account and the educator profile are saved by two
// different requests, minutes apart, with a browser session in between. The
// server can only ever see the requests that arrive — so a signup that dies in
// that gap (tab closed, draft lost, submit retried five times and given up on)
// leaves no evidence anywhere. Those are exactly the signups that end up in the
// admin "incomplete" list, which is why every previous round of fixes had to
// reason about the gap instead of reading it.
//
// This module reports what the browser did, tagged with a correlation id that
// the API and the Clerk webhook stamp onto their own rows, so a single timeline
// spans all three.

import { API_ENDPOINTS } from '../services/api-endpoints';
import { apiService } from '../services/api';

const CORRELATION_KEY = 'procreche.signup.correlationId.v1';

/**
 * Used only when storage is unavailable (private mode, sandboxed webview).
 * Scoped to the page view, so the trace degrades to "grouped within this tab"
 * rather than to nothing at all.
 */
let inMemoryCorrelationId: string | null = null;

/** Header the API reads to attach a request to a signup journey. */
export const SIGNUP_CORRELATION_HEADER = 'X-Signup-Correlation-Id';

export const SignupTraceEvent = {
  WIZARD_STARTED: 'client.wizard_started',
  ACCOUNT_SUBMITTED: 'client.account_submitted',
  VERIFICATION_SENT: 'client.verification_sent',
  VERIFICATION_SUBMITTED: 'client.verification_submitted',
  ACCOUNT_FAILED: 'client.account_failed',
  STEP3_ENTERED: 'client.step3_entered',
  DRAFT_SAVED: 'client.draft_saved',
  DRAFT_RESTORED: 'client.draft_restored',
  DRAFT_MISSING: 'client.draft_missing',
  PROFILE_SUBMIT_ATTEMPT: 'client.profile_submit_attempt',
  PROFILE_SUBMIT_RETRY: 'client.profile_submit_retry',
  PROFILE_SUBMIT_FAILED: 'client.profile_submit_failed',
  PROFILE_SUBMIT_SUCCEEDED: 'client.profile_submit_succeeded',
  WIZARD_ABANDONED: 'client.wizard_abandoned',
} as const;

export type SignupTraceEventName =
  (typeof SignupTraceEvent)[keyof typeof SignupTraceEvent];

function safeStore(): Storage | null {
  // Same defensive pattern as signupDraft.ts: storage access throws outright in
  // some privacy modes, and a diagnostic must never be the thing that breaks.
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The id for this signup attempt, created on first use.
 *
 * Stored in localStorage rather than component state because the journey
 * survives a page reload, a tab close and an email round-trip — the id has to
 * survive all three or the timeline breaks exactly where it matters most.
 */
export function getSignupCorrelationId(): string {
  const store = safeStore();
  if (!store) {
    inMemoryCorrelationId ??= randomId();
    return inMemoryCorrelationId;
  }

  try {
    const existing = store.getItem(CORRELATION_KEY);
    if (existing && existing.length <= 100) return existing;
    const minted = randomId();
    store.setItem(CORRELATION_KEY, minted);
    return minted;
  } catch {
    return randomId();
  }
}

/** Start a fresh journey. Called when a role is picked on step 1. */
export function resetSignupCorrelationId(): string {
  const store = safeStore();
  const minted = randomId();
  inMemoryCorrelationId = minted;
  try {
    store?.setItem(CORRELATION_KEY, minted);
  } catch {
    /* best-effort */
  }
  return minted;
}

/** Drop the id once the signup has genuinely finished. */
export function clearSignupCorrelationId(): void {
  inMemoryCorrelationId = null;
  try {
    safeStore()?.removeItem(CORRELATION_KEY);
  } catch {
    /* best-effort */
  }
}

/** Headers to attach to a signup-related API call. */
export function signupTraceHeaders(): Record<string, string> {
  return { [SIGNUP_CORRELATION_HEADER]: getSignupCorrelationId() };
}

export interface TraceOptions {
  role?: string | null;
  email?: string | null;
  outcome?: 'OK' | 'FAIL' | 'SKIP';
  errorCode?: string;
  errorMessage?: string;
  /**
   * Presence flags and counters only — never what the user typed. The server
   * scrubs this again, but keeping the rule visible here is what stops a
   * well-meaning `{ shortBio }` from being added later.
   */
  detail?: Record<string, string | number | boolean | null>;
}

function buildPayload(event: SignupTraceEventName, options: TraceOptions = {}) {
  return JSON.stringify({
    correlationId: getSignupCorrelationId(),
    event,
    outcome: options.outcome ?? 'OK',
    role: options.role ?? undefined,
    email: options.email ?? undefined,
    errorCode: options.errorCode,
    errorMessage: options.errorMessage?.slice(0, 500),
    detail: options.detail,
  });
}

function endpoint(): string {
  return `${apiService.apiBaseUrl}${API_ENDPOINTS.signupLog.clientEvent}`;
}

/**
 * Report an event. Never throws, never awaited, never blocks the wizard.
 *
 * `keepalive` lets the request outlive the page, which matters for the events
 * fired while the user is navigating away.
 */
export function traceSignup(event: SignupTraceEventName, options: TraceOptions = {}): void {
  if (typeof fetch !== 'function') return;

  try {
    void fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: buildPayload(event, options),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* Diagnostics must never surface to the user. */
  }
}

/**
 * Report an event from a page that is going away.
 *
 * `sendBeacon` is the only transport the browser guarantees to flush during
 * unload, and it is the whole reason an abandoned step 3 becomes visible at
 * all. It cannot set a Content-Type header, so the body is sent as a Blob typed
 * as JSON — Nest parses that identically.
 */
export function traceSignupBeacon(
  event: SignupTraceEventName,
  options: TraceOptions = {},
): void {
  const body = buildPayload(event, options);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint(), blob)) return;
    }
  } catch {
    /* fall through to the keepalive fetch below */
  }

  traceSignup(event, options);
}
