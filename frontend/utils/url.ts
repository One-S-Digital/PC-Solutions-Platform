/**
 * Convert a user-entered URL into an absolute http(s) URL that can be opened safely.
 *
 * Examples:
 * - "www.example.com" -> "https://www.example.com"
 * - "example.com" -> "https://example.com"
 * - "https://example.com" -> "https://example.com"
 *
 * Returns null for empty/invalid/unsupported schemes.
 */
export function toExternalUrl(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  // Allow protocol-relative URLs: //example.com
  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  // Allow http(s) as-is
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  // Reject other explicit schemes (e.g. javascript:, data:, file:)
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return null;
  }

  // Default to https for plain host/path inputs
  return `https://${raw}`;
}

export function openExternalUrl(input: string | null | undefined): void {
  const href = toExternalUrl(input);
  if (!href) return;
  window.open(href, '_blank', 'noopener,noreferrer');
}

