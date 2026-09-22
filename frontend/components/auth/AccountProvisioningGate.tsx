import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
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
export type RecoveryOutcome =
  /** Still asking the server. */
  | 'recovering'
  /** The server answered, and there is genuinely no backend account. */
  | 'missing'
  /** We could not get an answer. Says nothing about whether an account exists. */
  | 'transient';

/**
 * Decide what a failed recovery actually proved.
 *
 * This distinction is the whole point of the screen. `refreshCurrentUser`
 * rejects for a missing account, but equally for a dropped connection, a
 * cold-started backend returning 502, an expired token, or an account still
 * being provisioned. Treating all of those as "no account" is how a user with a
 * perfectly good account gets invited to create a second one — the exact
 * failure this component was added to prevent.
 *
 * Only a 404 is proof of absence. Everything else stays retryable.
 */
export function classifyRecoveryFailure(err: any): Exclude<RecoveryOutcome, 'recovering'> {
  // 202 / user_pending: the account is mid-provisioning. That is the opposite
  // of missing — it is about to exist.
  if (err?.code === 'user_pending' || err?.status === 202) return 'transient';
  if (err?.status === 404) return 'missing';
  // Network (status 0), auth (401), server (5xx), anything unrecognised.
  return 'transient';
}

const AccountProvisioningGate: React.FC = () => {
  const { t } = useTranslation('common');
  const { refreshCurrentUser } = useAuthContext();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const [outcome, setOutcome] = useState<RecoveryOutcome>('recovering');
  const hasAttemptedRef = useRef(false);

  const attemptRecovery = useCallback(async () => {
    setOutcome('recovering');
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
      const next = classifyRecoveryFailure(err);
      console.warn('[Auth] Account recovery attempt failed', {
        outcome: next,
        status: err?.status,
        code: err?.code,
        error: err?.message || String(err),
      });
      setOutcome(next);
    }
  }, [refreshCurrentUser, clerkUser]);

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;
    void attemptRecovery();
  }, [attemptRecovery]);

  if (outcome === 'recovering') {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
          <p className="text-gray-600">{t('accountSetup.finishing')}</p>
          <p className="text-sm text-gray-400 mt-2">{t('accountSetup.finishingHint')}</p>
        </div>
      </div>
    );
  }

  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  // No hardcoded "there" fallback: it produced "Willkommen, there!" and
  // "Bienvenue, there !". With no name to use, greet without one.
  const userName = clerkUser?.firstName || userEmail?.split('@')[0] || null;

  // The profile form is offered ONLY when the server confirmed there is no
  // account. On a transient failure we have no idea whether one exists, and
  // inviting a signup there is how a user ends up creating a second account.
  const accountConfirmedMissing = outcome === 'missing';

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-swiss-mint/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-swiss-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">
          {userName
            ? t('accountSetup.welcome', { name: userName })
            : t('accountSetup.welcomeNoName')}
        </h1>

        <p className="text-gray-600 mb-6">
          {/* Deliberately no longer "your profile setup wasn't completed".
              For a user whose account exists and whose session is simply stale,
              that was false, and it read as an instruction to start over —
              which is exactly what they should not do. */}
          {accountConfirmedMissing
            ? t('accountSetup.oauthPrompt')
            : t('accountSetup.loadFailed')}
        </p>

        {userEmail && (
          <p className="text-sm text-gray-500 mb-6">
            {t('accountSetup.signedInAs')}{' '}
            <span className="font-medium text-swiss-charcoal">{userEmail}</span>
          </p>
        )}

        {/* Retry is the primary action for anyone who already has an account.
            Re-entering details is the fallback, not the first offer. */}
        <button
          onClick={() => void attemptRecovery()}
          className="w-full bg-swiss-mint text-white font-semibold py-3 px-6 rounded-lg hover:bg-swiss-mint/90 transition-colors mb-3"
        >
          {t('accountSetup.tryAgain')}
        </button>

        {accountConfirmedMissing && (
          <button
            onClick={() => navigate('/signup', { state: { from: location, isPending: true } })}
            className="w-full bg-white text-swiss-charcoal font-medium py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors mb-4"
          >
            {t('accountSetup.completeProfile')}
          </button>
        )}

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
            {t('accountSetup.signOutDifferent')}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          {t('accountSetup.havingTrouble')}{' '}
          <Link to="/support" className="text-swiss-mint hover:underline">
            {t('accountSetup.contactSupport')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AccountProvisioningGate;
