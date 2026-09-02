// Persistence helpers for the sign-up wizard.
//
// Why this exists: for educators the backend AppUser/User record is created by
// the Clerk `user.created` webhook at the END of step 2 (email verification),
// while the educator profile details (bio, city, job role, experience, CV) are
// only saved in step 3 via PATCH /settings/educator. Step 3 is pure in-memory
// React state, so anything that discards that state after step 2 — a refresh,
// a closed tab, Safari suspending a backgrounded tab, a transient error while
// provisioning — silently loses everything the user typed in step 3 and leaves
// an account with no profile information.
//
// Persisting the wizard + step-3 draft lets us restore the user's input and
// resume them at step 3 instead of dropping them on the dashboard with their
// data gone.
//
// Storage choice: `localStorage`, not `sessionStorage`. sessionStorage is
// scoped to a single tab and is destroyed the moment that tab is closed, which
// is precisely the most common way this data was being lost ("I'll finish this
// later"). localStorage survives tab close and browser restart. Entries carry
// an explicit TTL so an abandoned draft does not linger forever, and the
// wizard draft never contains credentials.

const WIZARD_KEY = 'procreche.signup.wizard.v2';
const EDU_DRAFT_KEY = 'procreche.signup.educatorDraft.v2';

// Legacy v1 keys (sessionStorage, email-suffixed) — cleared on completion so
// upgrading users do not keep stale drafts around.
const LEGACY_WIZARD_KEY = 'procreche.signup.wizard.v1';
const LEGACY_EDU_DRAFT_PREFIX = 'procreche.signup.educatorDraft.v1';

// Drafts older than this are ignored (and dropped on next read).
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Envelope<T> = {
  savedAt?: number;
  email?: string;
  data: T;
};

function safeLocal(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Access can throw in private-mode / sandboxed contexts.
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// localStorage first; fall back to sessionStorage where localStorage is
// unavailable (some in-app webviews, strict privacy modes) so we still get
// refresh-survival rather than nothing at all.
function stores(): Storage[] {
  return [safeLocal(), safeSession()].filter(Boolean) as Storage[];
}

function readEnvelope<T>(key: string): Envelope<T> | null {
  for (const store of stores()) {
    let raw: string | null = null;
    try {
      raw = store.getItem(key);
    } catch {
      continue;
    }
    if (!raw) continue;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.data) continue;

    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      try {
        store.removeItem(key);
      } catch {
        /* best-effort */
      }
      continue;
    }

    return parsed as Envelope<T>;
  }
  return null;
}

function writeEnvelope<T>(key: string, envelope: Envelope<T>): void {
  const payload = JSON.stringify({ ...envelope, savedAt: Date.now() });
  for (const store of stores()) {
    try {
      store.setItem(key, payload);
    } catch {
      // Quota / serialization errors are non-fatal — persistence is best-effort.
    }
  }
}

function removeKey(key: string): void {
  for (const store of stores()) {
    try {
      store.removeItem(key);
    } catch {
      /* best-effort */
    }
  }
}

export interface PersistedWizardState {
  selectedRole?: string | null;
  currentStep?: number;
  // Never contains password/confirmPassword — those are stripped before writing.
  formData?: Record<string, unknown>;
}

export function readWizardState(): PersistedWizardState | null {
  const envelope = readEnvelope<PersistedWizardState>(WIZARD_KEY);
  const state = envelope?.data;
  return state && typeof state === 'object' ? state : null;
}

export function writeWizardState(state: PersistedWizardState): void {
  const formData = { ...(state.formData ?? {}) };
  // Defensive: never persist credentials, even if a caller forgets to strip them.
  delete (formData as Record<string, unknown>).password;
  delete (formData as Record<string, unknown>).confirmPassword;
  writeEnvelope(WIZARD_KEY, { data: { ...state, formData } });
}

export function clearWizardState(): void {
  removeKey(WIZARD_KEY);
  removeKey(LEGACY_WIZARD_KEY);
}

/**
 * Read the educator step-3 draft.
 *
 * The draft is stored under a single key (not one key per email) because the
 * email is frequently not known yet at the moment the step-3 form mounts — the
 * authenticated user is still loading — and an email-suffixed key written
 * before the email arrived could never be found again afterwards.
 *
 * To keep a shared device safe, the owning email is stored inside the draft and
 * the caller must pass the email it expects. A draft is only returned when the
 * emails match (or the draft predates knowing one).
 */
export function readEducatorDraft<T = Record<string, unknown>>(email?: string): T | null {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) return null; // Never hand a draft back before we know whose it is.

  const envelope = readEnvelope<T>(EDU_DRAFT_KEY);
  if (!envelope) return null;

  const owner = (envelope.email ?? '').trim().toLowerCase();
  if (owner && owner !== normalized) return null;

  return envelope.data && typeof envelope.data === 'object' ? envelope.data : null;
}

export function writeEducatorDraft<T extends object>(email: string | undefined, data: T): void {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) return; // Anonymous drafts can never be safely restored.
  writeEnvelope(EDU_DRAFT_KEY, { email: normalized, data });
}

export function clearEducatorDraft(email?: string): void {
  removeKey(EDU_DRAFT_KEY);
  const legacy = `${LEGACY_EDU_DRAFT_PREFIX}:${(email ?? '').trim().toLowerCase()}`;
  removeKey(legacy);
}

// Clear everything once the signup has actually been completed/saved.
export function clearSignupDrafts(email?: string): void {
  clearWizardState();
  clearEducatorDraft(email);
}
