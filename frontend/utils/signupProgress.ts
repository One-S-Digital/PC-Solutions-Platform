/**
 * How full the signup progress bar is.
 *
 * The bar measures progress toward a finished account, so the success screen
 * counts as the last step: educators go role → account → profile → done (four),
 * everyone else role → account → done (three). Educators used to be drawn with
 * the three-step scale, which put the bar at 100% on step 3 — the longest and
 * only form they still had to fill in — and told them they were finished.
 *
 * Rounded down so the bar is never ahead of the user: 2 of 3 is 66%, not 67%.
 */
export function signupProgressPercent(step: 1 | 2 | 3 | 4, isEducator: boolean): number {
  const totalSteps = isEducator ? 4 : 3;
  const clamped = Math.min(Math.max(step, 1), totalSteps);
  return Math.floor((clamped / totalSteps) * 100);
}
