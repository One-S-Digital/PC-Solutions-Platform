import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useAuthContext } from '../../providers/AuthProvider';
import { SignupTraceEvent, traceSignup } from '../../utils/signupTrace';

/**
 * Shown when someone is signed in to Clerk but the app has no backend user
 * for them.
 *
 * That state means two very different things, and the difference matters:
 *
 *  - **An OAuth user who has not chosen a role.** There genuinely is no account
 *    yet. They need the signup form, and they have typed nothing to lose.
 *  - **Someone whose account was just created and whose session has not caught
 *    up.** The account is complete in the database. Sending them to the signup
 *    form makes them re-enter details the platform already has, and the second
 *    submission is the one that actually costs something.
 *
 * This component used to be a card that assumed the first case and offered the
 * signup form to everyone. So it tries the cheap, non-destructive thing first:
 * ask the server once more. `refreshCurrentUser` already carries a retry budget
 * sized to the provisioning webhook, so a single call here is a real wait, not a
 * token one. Only when that comes back empty do we conclude there is nothing to
 * recover and offer the form.
 */
const AccountProvisioningGate: React.FC = () => {
  const { refreshCurrentUser } = useAuthContext();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRecovering, setIsRecovering] = useState(true);
  const hasAttemptedRef = useRef(false);

  const attemptRecovery = useCallback(async () => {
    setIsRecovering(true);
    try {
      // `quick`: the initial sync already spent the long provisioning budget
      // before this component was rendered at all. Spending it again would
      // stack two ~50s waits and leave the user on a spinner for a minute.
      await refreshCurrentUser({ quick: true });
      // On success this component unmounts: the provider now has a user, so the
      // layout above renders the real page. Nothing else to do here.
      traceSignup(SignupTraceEvent.SESSION_SYNC_RECOVERED, {
        email: clerkUser?.primaryEmailAddress?.emailAddress,
        detail: { recoveredAt: 'protected_route' },
      });
    } catch (err: any) {
      // Expected for an OAuth user with no account yet, so not an error case on
      // its own — the card below is the correct destination for them.
      console.warn('[Auth] Account recovery attempt did not find a backend user', {
        error: err?.message || String(err),
      });
      setIsRecovering(false);
    }
  }, [refreshCurrentUser, clerkUser]);

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;
    void attemptRecovery();
  }, [attemptRecovery]);

  if (isRecovering) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
          <p className="text-gray-600">Finishing your account setup...</p>
          <p className="text-sm text-gray-400 mt-2">This only takes a moment.</p>
        </div>
      </div>
    );
  }

  const hasOAuthAccount = clerkUser?.externalAccounts && clerkUser.externalAccounts.length > 0;
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  const userName = clerkUser?.firstName || userEmail?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-swiss-mint/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-swiss-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">
          Welcome, {userName}!
        </h1>

        <p className="text-gray-600 mb-6">
          {hasOAuthAccount
            ? "You've signed in successfully. To get started, please complete your profile by selecting your role and providing a few details."
            : // Deliberately not "your profile setup wasn't completed" any more.
              // For a user whose account exists and whose session is simply
              // stale, that was false, and it read as an instruction to start
              // over — which is exactly what they should not do.
              "We couldn't load your account details just yet. This is usually temporary — trying again will normally sort it out."}
        </p>

        {userEmail && (
          <p className="text-sm text-gray-500 mb-6">
            Signed in as <span className="font-medium text-swiss-charcoal">{userEmail}</span>
          </p>
        )}

        {/* Retry is the primary action for anyone who already has an account.
            Re-entering details is the fallback, not the first offer. */}
        <button
          onClick={() => void attemptRecovery()}
          className="w-full bg-swiss-mint text-white font-semibold py-3 px-6 rounded-lg hover:bg-swiss-mint/90 transition-colors mb-3"
        >
          Try again
        </button>

        <button
          onClick={() => navigate('/signup', { state: { from: location, isPending: true } })}
          className="w-full bg-white text-swiss-charcoal font-medium py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors mb-4"
        >
          {hasOAuthAccount ? 'Complete Your Profile' : 'Set up my profile instead'}
        </button>

        <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
          <button
            onClick={async () => {
              try {
                await signOut();
                navigate('/login', { replace: true });
              } catch (error) {
                console.error('Sign out failed:', error);
                navigate('/login', { replace: true });
              }
            }}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Sign out and use a different account
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Having trouble? <Link to="/support" className="text-swiss-mint hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  );
};

export default AccountProvisioningGate;
