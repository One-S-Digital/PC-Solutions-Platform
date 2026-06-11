import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiService } from '../services/api';

type FlagMap = Record<string, boolean>;

// Keyed by Clerk userId so different accounts in the same SPA session
// never share flag state.
const cachedFlags = new Map<string, FlagMap>();
const inflight = new Map<string, Promise<FlagMap>>();

async function fetchFlags(getToken: () => Promise<string | null>): Promise<FlagMap> {
  const token = await getToken();
  if (!token) return {};

  const response = await fetch(`${apiService.apiBaseUrl}/feature-flags/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) return {};

  const json = await response.json().catch(() => null);
  const flags = json?.data?.flags ?? json?.flags;
  if (!flags || typeof flags !== 'object') return {};
  return flags as FlagMap;
}

/**
 * Per-user feature flags from `GET /feature-flags/me`.
 * Any fetch failure resolves to an empty map, so every flag reads as OFF —
 * the safe default (users land on the classic experience).
 */
export function useFeatureFlags(): { flags: FlagMap | null; isLoading: boolean } {
  const { getToken, userId } = useAuth();
  const [flags, setFlags] = useState<FlagMap | null>(
    userId ? (cachedFlags.get(userId) ?? null) : null,
  );

  useEffect(() => {
    if (!userId) return;

    const existing = cachedFlags.get(userId);
    if (existing) {
      setFlags(existing);
      return;
    }

    let cancelled = false;
    if (!inflight.has(userId)) {
      const promise = fetchFlags(getToken)
        .catch(() => ({}) as FlagMap)
        .then((result) => {
          cachedFlags.set(userId, result);
          inflight.delete(userId);
          return result;
        });
      inflight.set(userId, promise);
    }
    void inflight.get(userId)!.then((result) => {
      if (!cancelled) setFlags(result);
    });

    return () => {
      cancelled = true;
    };
    // getToken is not referentially stable across renders (Clerk); the per-user
    // cache and inflight dedup make re-runs harmless.
  }, [getToken, userId]);

  return { flags, isLoading: flags === null };
}

/** Convenience accessor for a single flag key. */
export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { flags, isLoading } = useFeatureFlags();
  return { enabled: Boolean(flags?.[key]), isLoading };
}
