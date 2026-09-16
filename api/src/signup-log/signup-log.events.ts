/**
 * The signup event catalogue.
 *
 * One flat, stable list of names, because the whole point of this log is that
 * someone can look at a failed signup and read down the timeline. Ad-hoc
 * strings scattered across five controllers would defeat that, so every writer
 * picks a name from here.
 *
 * Naming: `<source>.<what_happened>`. Past tense, one event per real thing that
 * happened — never "about to".
 */
export const SignupEvent = {
  // ---- WIZARD (browser, before any account exists) ----------------------
  /** A role was chosen on step 1. This is where the correlation id is minted. */
  CLIENT_WIZARD_STARTED: 'client.wizard_started',
  /** Step 2 form validated and submitted to Clerk. */
  CLIENT_ACCOUNT_SUBMITTED: 'client.account_submitted',
  /** Clerk accepted the signup and sent the verification code. */
  CLIENT_VERIFICATION_SENT: 'client.verification_sent',
  /** The emailed code was submitted. */
  CLIENT_VERIFICATION_SUBMITTED: 'client.verification_submitted',
  /** Clerk rejected something on step 2 (weak password, taken email, bad code). */
  CLIENT_ACCOUNT_FAILED: 'client.account_failed',

  // ---- PROFILE (browser, educator step 3) -------------------------------
  /** Step 3 mounted — the educator is now looking at the profile form. */
  CLIENT_STEP3_ENTERED: 'client.step3_entered',
  /** A step-3 draft was written to localStorage. */
  CLIENT_DRAFT_SAVED: 'client.draft_saved',
  /** A step-3 draft was found and restored. */
  CLIENT_DRAFT_RESTORED: 'client.draft_restored',
  /**
   * Step 3 was re-entered but no draft came back. If this shows up a lot, the
   * persistence layer — not the user — is losing the data.
   */
  CLIENT_DRAFT_MISSING: 'client.draft_missing',
  /** "Complete Setup" pressed. One row per attempt, with the attempt number. */
  CLIENT_PROFILE_SUBMIT_ATTEMPT: 'client.profile_submit_attempt',
  /** A single attempt failed and will be retried. Carries status/error. */
  CLIENT_PROFILE_SUBMIT_RETRY: 'client.profile_submit_retry',
  /** All retries exhausted, or a non-retryable error. The educator is stuck. */
  CLIENT_PROFILE_SUBMIT_FAILED: 'client.profile_submit_failed',
  /** The PATCH returned 2xx. */
  CLIENT_PROFILE_SUBMIT_SUCCEEDED: 'client.profile_submit_succeeded',
  /**
   * The tab was hidden or closed while step 3 still had unsaved content.
   * Sent with `navigator.sendBeacon`, so it survives the page going away —
   * this is the single most important event for the reported bug, because it
   * is the only trace an abandoning user leaves anywhere.
   */
  CLIENT_WIZARD_ABANDONED: 'client.wizard_abandoned',

  // ---- ACCOUNT (Clerk webhook) ------------------------------------------
  /** `user.created` arrived at the webhook endpoint. */
  WEBHOOK_USER_CREATED_RECEIVED: 'webhook.user_created_received',
  /** Which metadata slot the role came from, or that none carried one. */
  WEBHOOK_ROLE_RESOLVED: 'webhook.role_resolved',
  /**
   * No role in any metadata slot, so no account was created. Expected for
   * OAuth; a red flag for email/password, where it means the wizard's
   * metadata never reached Clerk.
   */
  WEBHOOK_ROLE_MISSING: 'webhook.role_missing',
  /** The User/AppUser rows were written. Carries the initial approvalStatus. */
  WEBHOOK_ACCOUNT_CREATED: 'webhook.account_created',
  /** `applySignupIntent` ran. Carries which step-2 fields actually survived. */
  WEBHOOK_INTENT_APPLIED: 'webhook.intent_applied',
  /** The webhook transaction threw. The account may not exist at all. */
  WEBHOOK_FAILED: 'webhook.failed',

  // ---- ACCOUNT (OAuth / recovery path) ----------------------------------
  API_COMPLETE_PROFILE_RECEIVED: 'api.complete_profile_received',
  API_COMPLETE_PROFILE_SUCCEEDED: 'api.complete_profile_succeeded',
  API_COMPLETE_PROFILE_FAILED: 'api.complete_profile_failed',
  /** `PrincipalService` bootstrapped a profile that the webhook never made. */
  API_PRINCIPAL_BOOTSTRAPPED: 'api.principal_bootstrapped',

  // ---- PROFILE (server side of step 3) ----------------------------------
  /** PATCH /settings/educator arrived. Carries field presence, not values. */
  API_EDUCATOR_PATCH_RECEIVED: 'api.educator_patch_received',
  /** INCOMPLETE -> PENDING_REVIEW. The transition that ends a signup well. */
  API_EDUCATOR_PROMOTED: 'api.educator_promoted',
  /**
   * The PATCH landed but did NOT promote, with the reason. This is the event
   * that distinguishes "never submitted" from "submitted and we dropped it".
   */
  API_EDUCATOR_PROMOTION_SKIPPED: 'api.educator_promotion_skipped',
  /** PENDING_REVIEW -> INCOMPLETE because the profile was emptied out. */
  API_EDUCATOR_REVERTED_TO_INCOMPLETE: 'api.educator_reverted_to_incomplete',
  /** DELETE /settings/educator/cv emptied a CV-only application. */
  API_EDUCATOR_CV_DELETED: 'api.educator_cv_deleted',

  // ---- REVIEW (admin) ---------------------------------------------------
  ADMIN_EDUCATOR_APPROVED: 'admin.educator_approved',
  ADMIN_EDUCATOR_REJECTED: 'admin.educator_rejected',
  /** An admin tried to decide on an INCOMPLETE account and was blocked. */
  ADMIN_DECISION_BLOCKED_INCOMPLETE: 'admin.decision_blocked_incomplete',

  // ---- SYSTEM (sweeper) -------------------------------------------------
  /**
   * Daily sweep: an educator has been sitting at INCOMPLETE past the grace
   * window. Turns a silent backlog into a dated, attributable event, and is
   * what you grep for to find cases like the 12/09 one without being told.
   */
  SYSTEM_STUCK_INCOMPLETE: 'system.stuck_incomplete',
} as const;

export type SignupEventName = (typeof SignupEvent)[keyof typeof SignupEvent];

export const SignupStage = {
  WIZARD: 'WIZARD',
  ACCOUNT: 'ACCOUNT',
  PROFILE: 'PROFILE',
  REVIEW: 'REVIEW',
  SYSTEM: 'SYSTEM',
} as const;
export type SignupStageName = (typeof SignupStage)[keyof typeof SignupStage];

export const SignupSource = {
  CLIENT: 'CLIENT',
  WEBHOOK: 'WEBHOOK',
  API: 'API',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;
export type SignupSourceName = (typeof SignupSource)[keyof typeof SignupSource];

export const SignupOutcome = {
  OK: 'OK',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
} as const;
export type SignupOutcomeName = (typeof SignupOutcome)[keyof typeof SignupOutcome];

/**
 * Events a browser is allowed to report.
 *
 * The beacon endpoint is unauthenticated (it has to be — most of these fire
 * before the user has a session), so anything a client sends is untrusted.
 * Restricting it to this set stops the table being used as free-form storage.
 */
export const CLIENT_REPORTABLE_EVENTS: ReadonlySet<string> = new Set([
  SignupEvent.CLIENT_WIZARD_STARTED,
  SignupEvent.CLIENT_ACCOUNT_SUBMITTED,
  SignupEvent.CLIENT_VERIFICATION_SENT,
  SignupEvent.CLIENT_VERIFICATION_SUBMITTED,
  SignupEvent.CLIENT_ACCOUNT_FAILED,
  SignupEvent.CLIENT_STEP3_ENTERED,
  SignupEvent.CLIENT_DRAFT_SAVED,
  SignupEvent.CLIENT_DRAFT_RESTORED,
  SignupEvent.CLIENT_DRAFT_MISSING,
  SignupEvent.CLIENT_PROFILE_SUBMIT_ATTEMPT,
  SignupEvent.CLIENT_PROFILE_SUBMIT_RETRY,
  SignupEvent.CLIENT_PROFILE_SUBMIT_FAILED,
  SignupEvent.CLIENT_PROFILE_SUBMIT_SUCCEEDED,
  SignupEvent.CLIENT_WIZARD_ABANDONED,
]);

/** Which stage a client-reported event belongs to. */
export const CLIENT_EVENT_STAGE: Record<string, SignupStageName> = {
  [SignupEvent.CLIENT_WIZARD_STARTED]: SignupStage.WIZARD,
  [SignupEvent.CLIENT_ACCOUNT_SUBMITTED]: SignupStage.ACCOUNT,
  [SignupEvent.CLIENT_VERIFICATION_SENT]: SignupStage.ACCOUNT,
  [SignupEvent.CLIENT_VERIFICATION_SUBMITTED]: SignupStage.ACCOUNT,
  [SignupEvent.CLIENT_ACCOUNT_FAILED]: SignupStage.ACCOUNT,
  [SignupEvent.CLIENT_STEP3_ENTERED]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_DRAFT_SAVED]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_DRAFT_RESTORED]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_DRAFT_MISSING]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_PROFILE_SUBMIT_ATTEMPT]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_PROFILE_SUBMIT_RETRY]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_PROFILE_SUBMIT_FAILED]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_PROFILE_SUBMIT_SUCCEEDED]: SignupStage.PROFILE,
  [SignupEvent.CLIENT_WIZARD_ABANDONED]: SignupStage.PROFILE,
};
