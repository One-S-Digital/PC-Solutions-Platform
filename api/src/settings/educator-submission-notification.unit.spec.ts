import { EducatorApprovalStatus } from '@prisma/client';

/**
 * Guards the single-trigger rule for educator "application received"
 * notifications, reported by automated review on PR #680.
 *
 * The account is created before the profile is collected — by the Clerk webhook
 * for email/password signups, by completeProfile for OAuth — so it starts
 * INCOMPLETE. completeProfile used to also send the applicant email and the
 * "New Educator Application" admin notification at that moment, which announced
 * a blank application and then fired a second time when the profile was really
 * submitted. Those sends were removed, leaving the INCOMPLETE -> PENDING_REVIEW
 * promotion in SettingsController.updateEducatorSettings as the only trigger.
 *
 * This mirrors that decision so the promotion and the notifications can never
 * drift apart again: one flag drives both.
 */
const decideFirstSubmission = (
  existing: { approvalStatus: EducatorApprovalStatus | null },
  incoming: { shortBio?: string; cvUrl?: string },
): boolean => {
  const isSubmittingApplication = Boolean(incoming.shortBio?.trim() || incoming.cvUrl?.trim());
  return isSubmittingApplication && existing.approvalStatus === EducatorApprovalStatus.INCOMPLETE;
};

describe('educator first-submission trigger', () => {
  it('fires when an INCOMPLETE educator submits their profile', () => {
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.INCOMPLETE },
        { shortBio: 'I have taught for ten years', cvUrl: 'https://x/cv.pdf' },
      ),
    ).toBe(true);
  });

  it('fires on a CV-only submission, so the status and the emails agree', () => {
    // The promotion and the notification read the same flag; if this returned
    // false the profile would sit in the review queue with nobody told.
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.INCOMPLETE },
        { cvUrl: 'https://x/cv.pdf' },
      ),
    ).toBe(true);
  });

  it('does not fire when an INCOMPLETE educator saves nothing substantive', () => {
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.INCOMPLETE },
        { shortBio: '   ', cvUrl: '' },
      ),
    ).toBe(false);
  });

  it('does not re-fire when an already-submitted educator edits their profile', () => {
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.PENDING_REVIEW },
        { shortBio: 'An edited biography' },
      ),
    ).toBe(false);
  });

  it('does not fire for an educator already approved or rejected', () => {
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.APPROVED },
        { shortBio: 'An edited biography' },
      ),
    ).toBe(false);
    expect(
      decideFirstSubmission(
        { approvalStatus: EducatorApprovalStatus.REJECTED },
        { shortBio: 'An edited biography' },
      ),
    ).toBe(false);
  });
});
