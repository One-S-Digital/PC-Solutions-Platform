export const ALL_REGIONS_OPTION = 'All' as const;

/**
 * Normalize region/canton lists that support the special "All" sentinel.
 *
 * Invariant:
 * - If "All" is present (any casing), it becomes the *only* value persisted: ["All"].
 * - Otherwise values are trimmed, emptied removed, de-duped (preserving order).
 *
 * NOTE: Prisma scalar-list filters like `{ has: 'All' }` are case-sensitive.
 * We enforce canonical casing at write-time to keep queries reliable.
 */
export function normalizeRegionsServed(values?: readonly string[] | null): string[] {
  const list = (Array.isArray(values) ? values : [])
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => (value.toLowerCase() === 'all' ? ALL_REGIONS_OPTION : value));

  if (list.includes(ALL_REGIONS_OPTION)) {
    return [ALL_REGIONS_OPTION];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of list) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

