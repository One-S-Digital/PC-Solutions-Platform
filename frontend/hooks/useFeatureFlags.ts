import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiService } from '../services/api';

type FlagMap = Record<string, boolean>;

// Flags are evaluated per user on the backend and don't change mid-session,
// so one fetch is shared across every consumer (redirects, pages, toggles).
let cachedFlags: FlagMap | null = null;
let inflight: Promise<FlagMap> | null = null;

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
  const { getToken } = useAuth();
  const [flags, setFlags] = useState<FlagMap | null>(cachedFlags);

  useEffect(() => {
    if (cachedFlags) {
      setFlags(cachedFlags);
      return;
    }

    let cancelled = false;
    if (!inflight) {
      inflight = fetchFlags(getToken)
        .catch(() => ({}) as FlagMap)
        .then((result) => {
          cachedFlags = result;
          inflight = null;
          return result;
        });
    }
    void inflight.then((result) => {
      if (!cancelled) setFlags(result);
    });

    return () => {
      cancelled = true;
    };
    // getToken is not referentially stable across renders (Clerk); the cache
    // and inflight dedupe make re-runs harmless.
  }, [getToken]);

  return { flags, isLoading: flags === null };
}

/** Convenience accessor for a single flag key. */
export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { flags, isLoading } = useFeatureFlags();
  return { enabled: Boolean(flags?.[key]), isLoading };
}
