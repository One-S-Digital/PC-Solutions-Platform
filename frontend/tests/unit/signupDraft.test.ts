import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readWizardState,
  writeWizardState,
  clearWizardState,
  readEducatorDraft,
  writeEducatorDraft,
  clearSignupDrafts,
} from '../../utils/signupDraft';

const EDU_KEY = 'procreche.signup.educatorDraft.v2';
const WIZARD_KEY = 'procreche.signup.wizard.v2';

describe('signupDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('wizard state', () => {
    it('round-trips the wizard state', () => {
      writeWizardState({
        selectedRole: 'EDUCATOR',
        currentStep: 2,
        formData: { email: 'a@example.com', contactPerson: 'Ada Lovelace' },
      });

      expect(readWizardState()).toMatchObject({
        selectedRole: 'EDUCATOR',
        currentStep: 2,
        formData: { email: 'a@example.com', contactPerson: 'Ada Lovelace' },
      });
    });

    it('never persists credentials', () => {
      writeWizardState({
        selectedRole: 'EDUCATOR',
        currentStep: 2,
        formData: { email: 'a@example.com', password: 'hunter2', confirmPassword: 'hunter2' },
      });

      const raw = window.localStorage.getItem(WIZARD_KEY) ?? '';
      expect(raw).not.toContain('hunter2');
      expect(readWizardState()?.formData).not.toHaveProperty('password');
      expect(readWizardState()?.formData).not.toHaveProperty('confirmPassword');
    });

    it('clears the wizard state', () => {
      writeWizardState({ selectedRole: 'EDUCATOR', currentStep: 2 });
      clearWizardState();
      expect(readWizardState()).toBeNull();
    });
  });

  describe('educator draft', () => {
    it('survives a closed tab (written to localStorage, not sessionStorage only)', () => {
      writeEducatorDraft('edu@example.com', { shortBio: 'I love teaching' });

      // Simulate a new tab: sessionStorage is gone, localStorage remains.
      window.sessionStorage.clear();

      expect(readEducatorDraft('edu@example.com')).toEqual({ shortBio: 'I love teaching' });
      expect(window.localStorage.getItem(EDU_KEY)).toBeTruthy();
    });

    it('is returned regardless of email casing or surrounding whitespace', () => {
      writeEducatorDraft('Edu@Example.com', { city: 'Zurich' });
      expect(readEducatorDraft('  edu@example.com ')).toEqual({ city: 'Zurich' });
    });

    it('is not returned before the owning email is known', () => {
      writeEducatorDraft('edu@example.com', { city: 'Zurich' });
      expect(readEducatorDraft(undefined)).toBeNull();
      expect(readEducatorDraft('')).toBeNull();
    });

    it('is not handed to a different account on a shared device', () => {
      writeEducatorDraft('first@example.com', { shortBio: 'first user' });
      expect(readEducatorDraft('second@example.com')).toBeNull();
    });

    it('is never written without an email, since it could not be matched back', () => {
      writeEducatorDraft(undefined, { shortBio: 'orphan' });
      expect(window.localStorage.getItem(EDU_KEY)).toBeNull();
    });

    it('expires after the TTL', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      writeEducatorDraft('edu@example.com', { shortBio: 'stale' });

      vi.setSystemTime(new Date('2026-01-06T00:00:00Z')); // 5 days — still valid
      expect(readEducatorDraft('edu@example.com')).toEqual({ shortBio: 'stale' });

      vi.setSystemTime(new Date('2026-01-09T00:00:00Z')); // 8 days — expired
      expect(readEducatorDraft('edu@example.com')).toBeNull();
    });

    it('clearSignupDrafts removes both the wizard state and the educator draft', () => {
      writeWizardState({ selectedRole: 'EDUCATOR', currentStep: 3 });
      writeEducatorDraft('edu@example.com', { shortBio: 'done' });

      clearSignupDrafts('edu@example.com');

      expect(readWizardState()).toBeNull();
      expect(readEducatorDraft('edu@example.com')).toBeNull();
    });

    it('ignores corrupted storage instead of throwing', () => {
      window.localStorage.setItem(EDU_KEY, '{not json');
      expect(() => readEducatorDraft('edu@example.com')).not.toThrow();
      expect(readEducatorDraft('edu@example.com')).toBeNull();
    });
  });
});
