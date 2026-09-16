// How long the app waits for the Clerk `user.created` webhook to provision a
// backend account.
//
// Extracted from AuthProvider so the schedule can be reasoned about and tested
// on its own: getting it wrong is not a visible crash, it is a user being asked
// to sign up twice, which nothing in the type system catches.

/**
 * Delay before each successive retry when a webhook is plausibly in flight.
 *
 * Progressive, not fixed: most webhooks land within a second or two, and the
 * long tail is a cold-started backend, which needs seconds rather than
 * milliseconds. Total budget ≈ 49s, deliberately comparable to the signup
 * wizard's own 60s provisioning wait so the two cannot disagree about whether
 * an account exists.
 */
export const WEBHOOK_RETRY_DELAYS_MS = [1000, 2000, 3000, 5000, 8000, 10000, 10000, 10000];

/**
 * The budget for an account that is NOT mid-signup.
 *
 * Here "no backend user" almost always means an OAuth user who has not picked a
 * role yet. No webhook is coming, so a long wait would only stall them in front
 * of a spinner on the way to the role picker.
 */
export const ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS = [1000, 2000];

/**
 * A Clerk account younger than this is treated as mid-signup.
 *
 * Comfortably longer than the wizard's 60s provisioning budget, so the two
 * cannot disagree, and far shorter than any real session — someone returning
 * days later is never mistaken for someone still being provisioned.
 */
export const FRESH_ACCOUNT_WINDOW_MS = 3 * 60 * 1000;

/**
 * Could this account still have a provisioning webhook in flight?
 *
 * An unknown creation time counts as fresh: waiting a few extra seconds for a
 * user who turns out to be established is a far smaller harm than sending a
 * mid-signup user back to re-enter everything they just typed.
 */
export function isFreshAccount(
  createdAt: Date | string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!createdAt) return true;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return now - created < FRESH_ACCOUNT_WINDOW_MS;
}

/**
 * Delay before retry number `attempt` (0-based), or `null` when the budget is
 * spent and the caller should stop retrying.
 */
export function webhookRetryDelayMs(attempt: number, accountIsFresh: boolean): number | null {
  const schedule = accountIsFresh
    ? WEBHOOK_RETRY_DELAYS_MS
    : ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS;
  return attempt >= 0 && attempt < schedule.length ? schedule[attempt] : null;
}

/** Total time a full run of retries can take, for reasoning about budgets. */
export function totalRetryBudgetMs(accountIsFresh: boolean): number {
  const schedule = accountIsFresh
    ? WEBHOOK_RETRY_DELAYS_MS
    : ESTABLISHED_ACCOUNT_RETRY_DELAYS_MS;
  return schedule.reduce((sum, delay) => sum + delay, 0);
}
