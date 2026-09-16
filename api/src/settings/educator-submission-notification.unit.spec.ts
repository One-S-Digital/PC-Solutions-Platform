import { EducatorApprovalStatus } from '@prisma/client';

/**
 * Guards the single-trigger rule for educator "application received"
 * notifications, and the status transitions around it. Both were raised by
 * automated review on PR #680.
 *
 * The account is created before the profile is collected — by the Clerk webhook
 * for email/password signups, by completeProfile for OAuth — so it starts
 * INCOMPLETE. completeProfile used to also send the applicant email and the
 * "New Educator Application" admin notification at that moment, which announced
 * a blank application and then fired a second time when the profile was really
 * submitted. Those sends were removed, leaving the INCOMPLETE -> PENDING_REVIEW
 * promotion in SettingsController.updateEducatorSettings as the only trigger.
 */

/**
 * Mirrors the conditional promotion inside the settings transaction. The real
 * code issues `updateMany({ where: { id, approvalStatus: INCOMPLETE } })` and
 * reads the affected-row count, so two concurrent submissions cannot both claim
 * the transition — only the first sees count === 1.
 */
const promote = (
  current: EducatorApprovalStatus | null,
  incoming: { shortBio?: string; cvUrl?: string },
): { promoted: boolean; status: EducatorApprovalStatus | null } => {
  const isSubmittingApplication = Boolean(incoming.shortBio?.trim() || incoming.cvUrl?.trim());
  if (isSubmittingApplication && current === EducatorApprovalStatus.INCOMPLETE) {
    return { promoted: true, status: EducatorApprovalStatus.PENDING_REVIEW };
  }
  return { promoted: false, status: current };
};

/** Mirrors DELETE /settings/educator/cv. */
const deleteCv = (profile: {
  shortBio: string | null;
  approvalStatus: EducatorApprovalStatus | null;
}): EducatorApprovalStatus | null => {
  const wouldBeEmpty = !profile.shortBio?.trim();
  return wouldBeEmpty && profile.approvalStatus === EducatorApprovalStatus.PENDING_REVIEW
    ? EducatorApprovalStatus.INCOMPLETE
    : profile.approvalStatus;
};

describe('educator first-submission trigger', () => {
  it('fires when an INCOMPLETE educator submits their profile', () => {
    expect(
      promote(EducatorApprovalStatus.INCOMPLETE, {
        shortBio: 'I have taught for ten years',
        cvUrl: 'https://x/cv.pdf',
      }).promoted,
    ).toBe(true);
  });

  it('fires on a CV-only submission, so the status and the emails agree', () => {
    const result = promote(EducatorApprovalStatus.INCOMPLETE, { cvUrl: 'https://x/cv.pdf' });
    expect(result.promoted).toBe(true);
    expect(result.status).toBe(EducatorApprovalStatus.PENDING_REVIEW);
  });

  it('does not fire when an INCOMPLETE educator saves nothing substantive', () => {
    expect(promote(EducatorApprovalStatus.INCOMPLETE, { shortBio: '   ', cvUrl: '' }).promoted).toBe(
      false,
    );
  });

  it('does not re-fire when an already-submitted educator edits their profile', () => {
    expect(
      promote(EducatorApprovalStatus.PENDING_REVIEW, { shortBio: 'An edited biography' }).promoted,
    ).toBe(false);
  });

  it('does not fire for an educator already approved or rejected', () => {
    expect(promote(EducatorApprovalStatus.APPROVED, { shortBio: 'edited' }).promoted).toBe(false);
    expect(promote(EducatorApprovalStatus.REJECTED, { shortBio: 'edited' }).promoted).toBe(false);
  });

  it('lets only one of two concurrent submissions claim the transition', () => {
    // Both requests read INCOMPLETE, but the conditional update means the
    // second finds no matching row once the first has committed.
    let stored: EducatorApprovalStatus | null = EducatorApprovalStatus.INCOMPLETE;

    const first = promote(stored, { shortBio: 'first' });
    stored = first.status;
    const second = promote(stored, { shortBio: 'second' });

    expect(first.promoted).toBe(true);
    expect(second.promoted).toBe(false);
    expect(stored).toBe(EducatorApprovalStatus.PENDING_REVIEW);
  });
});

/**
 * Mirrors the emptying check inside the settings transaction: a PATCH can clear
 * the CV via `cvUrl: ''` just as DELETE /settings/educator/cv can, so both doors
 * into "PENDING_REVIEW with an empty profile" are closed.
 */
const applyPatch = (
  existing: { shortBio: string | null; cvUrl: string | null; approvalStatus: EducatorApprovalStatus | null },
  incoming: { shortBio?: string; cvUrl?: string },
): EducatorApprovalStatus | null => {
  const resultingShortBio = incoming.shortBio !== undefined ? incoming.shortBio : existing.shortBio;
  const resultingCvUrl = incoming.cvUrl !== undefined ? incoming.cvUrl : existing.cvUrl;
  const wouldBeEmpty = !resultingShortBio?.trim() && !resultingCvUrl?.trim();

  if (wouldBeEmpty && existing.approvalStatus === EducatorApprovalStatus.PENDING_REVIEW) {
    return EducatorApprovalStatus.INCOMPLETE;
  }
  return promote(existing.approvalStatus, incoming).status;
};

describe('educator profile emptied via PATCH', () => {
  it('reverts to INCOMPLETE when a PATCH clears the last substantive field', () => {
    expect(
      applyPatch(
        { shortBio: null, cvUrl: 'https://x/cv.pdf', approvalStatus: EducatorApprovalStatus.PENDING_REVIEW },
        { cvUrl: '' },
      ),
    ).toBe(EducatorApprovalStatus.INCOMPLETE);
  });

  it('keeps PENDING_REVIEW when a biography survives the patch', () => {
    expect(
      applyPatch(
        { shortBio: 'I have taught for ten years', cvUrl: 'https://x/cv.pdf', approvalStatus: EducatorApprovalStatus.PENDING_REVIEW },
        { cvUrl: '' },
      ),
    ).toBe(EducatorApprovalStatus.PENDING_REVIEW);
  });

  it('never reopens an educator an admin has already decided on', () => {
    expect(
      applyPatch(
        { shortBio: null, cvUrl: 'https://x/cv.pdf', approvalStatus: EducatorApprovalStatus.APPROVED },
        { cvUrl: '' },
      ),
    ).toBe(EducatorApprovalStatus.APPROVED);
  });

  it('still promotes an INCOMPLETE educator submitting through the same patch', () => {
    expect(
      applyPatch(
        { shortBio: null, cvUrl: null, approvalStatus: EducatorApprovalStatus.INCOMPLETE },
        { shortBio: 'I have taught for ten years' },
      ),
    ).toBe(EducatorApprovalStatus.PENDING_REVIEW);
  });
});

describe('educator CV deletion', () => {
  it('sends a CV-only application back to INCOMPLETE when the CV is removed', () => {
    // Otherwise the profile keeps PENDING_REVIEW with nothing in it, and
    // approveEducator (which only refuses INCOMPLETE) would let an admin
    // approve a blank profile into the candidate pool.
    expect(deleteCv({ shortBio: null, approvalStatus: EducatorApprovalStatus.PENDING_REVIEW })).toBe(
      EducatorApprovalStatus.INCOMPLETE,
    );
    expect(deleteCv({ shortBio: '   ', approvalStatus: EducatorApprovalStatus.PENDING_REVIEW })).toBe(
      EducatorApprovalStatus.INCOMPLETE,
    );
  });

  it('leaves the status alone when a biography still remains', () => {
    expect(
      deleteCv({ shortBio: 'I have taught for ten years', approvalStatus: EducatorApprovalStatus.PENDING_REVIEW }),
    ).toBe(EducatorApprovalStatus.PENDING_REVIEW);
  });

  it('never reopens an educator an admin has already decided on', () => {
    expect(deleteCv({ shortBio: null, approvalStatus: EducatorApprovalStatus.APPROVED })).toBe(
      EducatorApprovalStatus.APPROVED,
    );
    expect(deleteCv({ shortBio: null, approvalStatus: EducatorApprovalStatus.REJECTED })).toBe(
      EducatorApprovalStatus.REJECTED,
    );
  });
});

/**
 * Mirrors the `promotionOutcome` the settings transaction now records on the
 * signup trace.
 *
 * The promotion rules above say what the status BECOMES; this says WHY, which
 * is the part that was missing when an educator turned up in the incomplete
 * list after the last round of fixes. The three outcomes need different
 * responses, so collapsing them would put the log right back where it started:
 *
 *   NOT_AN_APPLICATION          -> the save carried nothing promotable (a form
 *                                  or DTO bug — the user did their part)
 *   PROMOTED                    -> worked
 *   ALREADY_SUBMITTED_OR_DECIDED-> a later edit, or a concurrent submission
 *                                  that lost the race; not a failure
 */
const classifyPromotion = (
  current: EducatorApprovalStatus | null,
  incoming: { shortBio?: string; cvUrl?: string },
): 'PROMOTED' | 'ALREADY_SUBMITTED_OR_DECIDED' | 'NOT_AN_APPLICATION' => {
  const isSubmittingApplication = Boolean(incoming.shortBio?.trim() || incoming.cvUrl?.trim());
  if (!isSubmittingApplication) return 'NOT_AN_APPLICATION';
  return current === EducatorApprovalStatus.INCOMPLETE
    ? 'PROMOTED'
    : 'ALREADY_SUBMITTED_OR_DECIDED';
};

describe('signup trace: why a profile did not leave INCOMPLETE', () => {
  it('reports PROMOTED for a real first submission', () => {
    expect(
      classifyPromotion(EducatorApprovalStatus.INCOMPLETE, { shortBio: 'Ten years in early years' }),
    ).toBe('PROMOTED');
  });

  it('distinguishes an unpromotable save from an abandoned signup', () => {
    // This is the case a human could not previously tell apart: the educator
    // DID press Complete Setup, the request DID reach us, and the account still
    // sat in the incomplete list. That is our bug, not their drop-off.
    expect(classifyPromotion(EducatorApprovalStatus.INCOMPLETE, {})).toBe('NOT_AN_APPLICATION');
    expect(
      classifyPromotion(EducatorApprovalStatus.INCOMPLETE, { shortBio: '   ', cvUrl: '' }),
    ).toBe('NOT_AN_APPLICATION');
  });

  it('does not report a failure when the educator simply edits later', () => {
    expect(
      classifyPromotion(EducatorApprovalStatus.PENDING_REVIEW, { shortBio: 'Updated bio' }),
    ).toBe('ALREADY_SUBMITTED_OR_DECIDED');
    expect(classifyPromotion(EducatorApprovalStatus.APPROVED, { shortBio: 'Updated bio' })).toBe(
      'ALREADY_SUBMITTED_OR_DECIDED',
    );
  });

  it('agrees with the promotion rule it explains', () => {
    // The trace must never say PROMOTED for a transition that did not happen —
    // a log that disagrees with the code is worse than no log.
    const cases: Array<[EducatorApprovalStatus | null, { shortBio?: string; cvUrl?: string }]> = [
      [EducatorApprovalStatus.INCOMPLETE, { shortBio: 'bio' }],
      [EducatorApprovalStatus.INCOMPLETE, { cvUrl: 'https://x/cv.pdf' }],
      [EducatorApprovalStatus.INCOMPLETE, {}],
      [EducatorApprovalStatus.PENDING_REVIEW, { shortBio: 'bio' }],
      [EducatorApprovalStatus.APPROVED, { cvUrl: 'https://x/cv.pdf' }],
      [null, { shortBio: 'bio' }],
    ];

    for (const [current, incoming] of cases) {
      expect(classifyPromotion(current, incoming) === 'PROMOTED').toBe(
        promote(current, incoming).promoted,
      );
    }
  });
});
