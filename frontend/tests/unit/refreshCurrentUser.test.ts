import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, waitFor, cleanup } from '@testing-library/react';

/**
 * A mutable stand-in for Clerk. The real one is a singleton whose `user` flips
 * from null to the signed-in user inside `setActive()` — independently of any
 * React render, which is exactly what the signup wizard runs into.
 */
const clerkState: { user: { id: string; createdAt: Date } | null; loaded: boolean } = {
  user: null,
  loaded: true,
};

vi.mock('@clerk/clerk-react', () => {
  // One handle for the whole session, like the real `useClerk()`.
  const clerkInstance = {
    get user() {
      return clerkState.user;
    },
    get loaded() {
      return clerkState.loaded;
    },
  };

  return {
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    useUser: () => ({ user: clerkState.user, isLoaded: clerkState.loaded }),
    useAuth: () => ({
      isSignedIn: Boolean(clerkState.user),
      signOut: async () => undefined,
      getToken: async () => (clerkState.user ? 'session-token' : null),
    }),
    useClerk: () => clerkInstance,
  };
});

import { AuthProvider, useAuthContext } from '../../providers/AuthProvider';

type AuthContext = ReturnType<typeof useAuthContext>;

const BACKEND_USER = {
  id: 'backend-user-1',
  clerkId: 'user_123',
  email: 'educator@example.com',
  firstName: 'Ed',
  lastName: 'Ucator',
  role: 'EDUCATOR',
  isActive: true,
  organizations: [],
};

/** Mounts the real provider and records the context of every render. */
function mountProvider() {
  const renders: AuthContext[] = [];

  const Probe: React.FC = () => {
    renders.push(useAuthContext());
    return null;
  };

  render(React.createElement(AuthProvider, null, React.createElement(Probe)));
  return {
    renders,
    latest: () => renders[renders.length - 1],
  };
}

/**
 * The signup wizard captures `refreshCurrentUser` while the visitor is signed
 * out and calls it after `setActive()` has signed them in. Before this was
 * fixed, the callback had closed over the signed-out `null` and threw "No
 * authenticated user to refresh" for an account that existed — on every
 * educator signup, which is how it was found: `client.session_sync_failed`
 * fired 5 times in 5 journeys.
 */
describe('refreshCurrentUser', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clerkState.user = null;
    clerkState.loaded = true;
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_unit');
    vi.stubEnv('VITE_E2E_TEST', 'false');
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ success: true, data: BACKEND_USER }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('works from a reference captured before the visitor signed in', async () => {
    const { renders, latest } = mountProvider();

    // Signed out: nothing to fetch, and the wizard grabs its reference here.
    await waitFor(() => expect(latest().isLoading).toBe(false));
    const capturedWhileSignedOut = renders[0].refreshCurrentUser;
    expect(fetchMock).not.toHaveBeenCalled();

    // `setActive()` resolves: Clerk now has a user, no render has happened yet.
    clerkState.user = { id: 'user_123', createdAt: new Date() };

    await act(async () => {
      await expect(capturedWhileSignedOut({ quick: true })).resolves.toBeUndefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer session-token');
    await waitFor(() => expect(latest().currentUser?.email).toBe('educator@example.com'));
  });

  it('works from the very first render, not just a later one', async () => {
    // The oldest reference there is: the one handed out before Clerk loaded.
    clerkState.loaded = false;
    const { renders, latest } = mountProvider();
    const first = renders[0].refreshCurrentUser;

    clerkState.loaded = true;
    clerkState.user = { id: 'user_123', createdAt: new Date() };

    await act(async () => {
      await expect(first()).resolves.toBeUndefined();
    });
    await waitFor(() => expect(latest().currentUser?.id).toBe('backend-user-1'));
  });

  it('still refuses when nobody is signed in', async () => {
    const { renders, latest } = mountProvider();
    await waitFor(() => expect(latest().isLoading).toBe(false));

    await expect(renders[0].refreshCurrentUser({ quick: true })).rejects.toThrow(
      'No authenticated user to refresh',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still refuses while Clerk has not loaded', async () => {
    clerkState.loaded = false;
    const { renders } = mountProvider();

    await expect(renders[0].refreshCurrentUser()).rejects.toThrow('Clerk is not loaded yet');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
