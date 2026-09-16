/**
 * Pulling the two request-scoped values the signup trace needs out of an
 * Express request, in one place.
 *
 * Both are read defensively: these helpers run inside diagnostics, on request
 * shapes that vary between the real server, e2e mocks and unit tests, and a
 * throw here would fail the very signup we are trying to observe.
 */

/** Header the frontend uses to carry the wizard's correlation id. */
export const SIGNUP_CORRELATION_HEADER = 'x-signup-correlation-id';

export function readCorrelationId(req: any): string | undefined {
  const raw = req?.headers?.[SIGNUP_CORRELATION_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : undefined;
}

export function readClientIp(req: any): string | undefined {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof value === 'string' && value.length > 0) {
    // Left-most entry is the original client; the rest are our own proxies.
    return value.split(',')[0].trim();
  }
  return typeof req?.ip === 'string' ? req.ip : undefined;
}
