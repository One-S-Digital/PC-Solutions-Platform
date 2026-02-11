/**
 * Shared CORS origin allowlist logic.
 *
 * Why this exists:
 * - `main.ts` configures Nest/Express CORS for normal responses (including OPTIONS preflight).
 * - `AllExceptionsFilter` may send error responses; those should include matching CORS headers.
 *
 * Keep the logic centralized so prod allowlists don't drift.
 */
export function normalizeOrigin(origin?: string | null): string | null {
  if (!origin) return null;
  const trimmed = origin.trim();
  if (!trimmed) return null;
  // Strip trailing slash to reduce accidental mismatches.
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function splitCsv(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => normalizeOrigin(s))
    .filter((v): v is string => !!v);
}

/**
 * Returns the configured allowlist for production deployments.
 *
 * Sources (combined):
 * - hardcoded canonical production domains
 * - env-provided domains (FRONTEND_URL, ADMIN_URL, APP_ORIGIN, ADMIN_ORIGIN)
 * - `CORS_ALLOWED_ORIGINS` (comma-separated)
 * - known Render dev origins for this repo's dev deployments
 */
export function getProductionAllowedOrigins(): string[] {
  const defaults = [
    'https://app.procrechesolutions.com',
    'https://admin.procrechesolutions.com',
    // Render dev deployments (used by admin/frontend dev instances)
    'https://pc-solutions-dev.onrender.com',
    'https://pc-solutions-admin-dev.onrender.com',
  ].map(normalizeOrigin).filter((v): v is string => !!v);

  const envOrigins = [
    normalizeOrigin(process.env.FRONTEND_URL),
    normalizeOrigin(process.env.ADMIN_URL),
    normalizeOrigin(process.env.APP_ORIGIN),
    normalizeOrigin(process.env.ADMIN_ORIGIN),
    ...splitCsv(process.env.CORS_ALLOWED_ORIGINS),
  ].filter((v): v is string => !!v);

  return Array.from(new Set([...defaults, ...envOrigins]));
}

export function isOriginAllowed(origin?: string | null): boolean {
  const normalized = normalizeOrigin(origin);
  // Allow non-browser clients (curl/postman) with no Origin header
  if (!normalized) return true;
  // In non-production, allow all origins for easier testing.
  if (process.env.NODE_ENV !== 'production') return true;
  return getProductionAllowedOrigins().includes(normalized);
}

