// Persistence helpers for the sign-up wizard.
//
// Why this exists: for educators the backend AppUser/User record is created by
// the Clerk `user.created` webhook at the END of step 2 (email verification),
// while the educator profile details (bio, city, job role, experience, CV) are
// only saved in step 3 via PATCH /settings/educator. Step 3 is pure in-memory
// React state, so anything that discards that state after step 2 — a refresh,
// the verification link opening in a different tab/webview, Safari suspending a
// backgrounded tab — silently loses everything the user typed in step 3 and
// leaves an account with no profile information.
//
// Persisting the wizard + step-3 draft to sessionStorage lets us restore the
// user's input and resume them at step 3 instead of dropping them on the
// dashboard with their data gone.

const WIZARD_KEY = 'procreche.signup.wizard.v1';
const EDU_DRAFT_PREFIX = 'procreche.signup.educatorDraft.v1';

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    // Access can throw in private-mode / sandboxed contexts.
    return null;
  }
}

export interface PersistedWizardState {
  selectedRole?: string | null;
  currentStep?: number;
  // Never contains password/confirmPassword — those are stripped before writing.
  formData?: Record<string, unknown>;
}

export function readWizardState(): PersistedWizardState | null {
  const store = safeSession();
  if (!store) return null;
  try {
    const raw = store.getItem(WIZARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PersistedWizardState) : null;
  } catch {
    return null;
  }
}

export function writeWizardState(state: PersistedWizardState): void {
  const store = safeSession();
  if (!store) return;
  try {
    const formData = { ...(state.formData ?? {}) };
    // Defensive: never persist credentials, even if a caller forgets to strip them.
    delete (formData as Record<string, unknown>).password;
    delete (formData as Record<string, unknown>).confirmPassword;
    store.setItem(WIZARD_KEY, JSON.stringify({ ...state, formData }));
  } catch {
    // Quota / serialization errors are non-fatal — persistence is best-effort.
  }
}

export function clearWizardState(): void {
  const store = safeSession();
  if (!store) return;
  try {
    store.removeItem(WIZARD_KEY);
  } catch {
    /* best-effort */
  }
}

function eduKey(email?: string): string {
  return `${EDU_DRAFT_PREFIX}:${(email ?? '').trim().toLowerCase()}`;
}

export function readEducatorDraft<T = Record<string, unknown>>(email?: string): T | null {
  const store = safeSession();
  if (!store) return null;
  try {
    const raw = store.getItem(eduKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function writeEducatorDraft(email: string | undefined, data: Record<string, unknown>): void {
  const store = safeSession();
  if (!store) return;
  try {
    store.setItem(eduKey(email), JSON.stringify(data));
  } catch {
    /* best-effort */
  }
}

export function clearEducatorDraft(email?: string): void {
  const store = safeSession();
  if (!store) return;
  try {
    store.removeItem(eduKey(email));
  } catch {
    /* best-effort */
  }
}

// Clear everything once the signup has actually been completed/saved.
export function clearSignupDrafts(email?: string): void {
  clearWizardState();
  clearEducatorDraft(email);
}
