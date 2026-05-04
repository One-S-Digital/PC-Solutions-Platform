/**
 * Returns the set of allowed CORS origins for the current environment.
 *
 * Returns `true` (allow all) in non-production, or a `Set<string>` of
 * explicit origins in production. The set is built from the hardcoded
 * production domains plus any extras in the CORS_ORIGINS env var
 * (comma-separated), so Render preview URLs can be whitelisted without
 * a code change.
 *
 * Exported as a function (not a constant) so it is always evaluated at
 * call-time after dotenv has populated process.env.
 */
export function getAllowedOrigins(): true | Set<string> {
  if (process.env.NODE_ENV !== 'production') return true;

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return new Set([
    'https://app.procrechesolutions.com',
    'https://admin.procrechesolutions.com',
    ...envOrigins,
  ]);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  if (allowed === true) return true;
  return allowed.has(origin);
}
