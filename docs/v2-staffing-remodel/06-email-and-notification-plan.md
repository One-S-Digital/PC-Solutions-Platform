# Staffing Email & Notification Plan

Builds on the existing `api/src/email-notification/` + `api/src/mailing/` stack. All additions reuse the same pipeline — no new transport, no new auth, no new delivery infrastructure.

## 1. New transactional events

Each event has a DB template (seeded in `getStarterTemplates()`), an in-code default (for failure tolerance), and is gated by `UserNotificationPreferences.jobRecruitment` (except `welcome`-type ones).

| eventKey | Category | Recipient | Trigger | Variables | Respects prefs? |
|---|---|---|---|---|---|
| `new_application` | jobRecruitment | Foundation members | `recruitment.service.createJobApplication` | `foundationName`, `candidateName`, `jobTitle`, `applicationUrl` | Yes |
| `application_status_update` | jobRecruitment | Candidate | `recruitment.service.updateJobApplication` when `status` changes | `candidateName`, `jobTitle`, `foundationName`, `status`, `applicationUrl` | Yes |
| `job_match` | jobRecruitment | Top-N matched candidates | `recruitment.service.updateJobListing` when transitioning `DRAFT → PUBLISHED`, and `recruitment.service.createJobListing` if created already `PUBLISHED` | `candidateName`, `jobTitle`, `foundationName`, `location`, `contractType`, `jobUrl` | Yes |
| `replacement_request_open` | jobRecruitment | Top-N matched candidates with `isOpenToReplacement=true` | `replacement.service.create` (and on requalification) | `candidateName`, `foundationName`, `startAt`, `endAt`, `cities`, `offerUrl` | Yes |
| `replacement_matched` | jobRecruitment | Foundation members | When a `ReplacementMatch` flips to `ACCEPTED` | `foundationName`, `candidateName`, `requestTitle`, `requestUrl` | Yes |
| `replacement_confirmed` | jobRecruitment | Candidate + foundation | `replacement.service.confirm` | role-specific variables | Yes |
| `low_candidate_pool` | systemAdmin | Admins | Nightly cron in `staffing-signals.service` | `region`, `openJobs`, `activeCandidates`, `gap`, `dashboardUrl` | Yes |

## 2. Fan-out rules

- Foundation-bound emails send to **every active user whose `organizationId` matches the foundation** (filter `role ∈ {FOUNDATION}` or `role = ADMIN` linked to that org). If there are none, fall back to the foundation's billing / primary contact email (already a field on `Organization`).
- Candidate-bound emails go to the candidate's email on file (`User.email`), with the existing `sendNotification` preference gate.
- Bulk match fan-out (`job_match`, `replacement_request_open`) is capped by `STAFFING_MATCH_EMAIL_LIMIT` (default 20). Candidates are selected by the Phase 2 matcher ranked by score.

## 3. Wiring points (where code goes)

- `api/src/recruitment/recruitment.service.ts`
  - Inject `EmailNotificationService` (already exported from `email-notification.module`).
  - After successful `prisma.jobApplication.create`, `await this.emailNotificationService.sendNotification({ event: 'new_application', recipient: <foundationMemberEmail>, payload })` — one per recipient; wrap in `Promise.allSettled` so one bad email doesn't abort the request.
  - In `updateJobApplication`, compare `prevStatus` vs `newStatus` and emit `application_status_update` to the candidate.
  - In `createJobListing` / `updateJobListing`, if status transitions to `PUBLISHED`, compute matches via the new matcher and call `sendNotification` per top-N candidate using event `job_match`.
- `api/src/staffing/replacement/replacement.service.ts`
  - On `create`: compute matches with availability scoring; fan-out `replacement_request_open`.
  - On `accept`: emit `replacement_matched` to foundation.
  - On `confirm`: emit `replacement_confirmed` to both sides.
- `api/src/staffing/signals/staffing-signals.service.ts` (new)
  - `@Cron('0 7 * * *')` daily at 07:00: compute low-pool by region, bulk-send `low_candidate_pool` to admins.

## 4. Why `sendNotification` and not `mailing` campaigns

Transactional staffing emails are:

- Per-user, payload-driven (templated variables differ per recipient).
- Preference-gated at the user level.
- Log-critical (`EmailLog` ties back to `userId` for auditing).

That's the `email-notification` pipeline, not the `mailing` (bulk campaign) pipeline. Campaigns stay reserved for marketing/newsletter use.

## 5. In-app notifications

New Prisma model `Notification`:

```prisma
model Notification {
  id         String   @id @default(uuid())
  userId     String
  type       String
  title      String
  body       String?
  link       String?
  metadata   Json?
  readAt     DateTime?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
  @@map("notifications")
}
```

API (`api/src/notifications/`):

- `GET /notifications?unread=true&limit=50` — current user's notifications.
- `POST /notifications/:id/read`, `POST /notifications/read-all`.
- Internal service method `createNotification({ userId, type, title, body, link, metadata })` called alongside every `sendNotification` site listed in §3.

Socket push:

- Extend existing `messaging.gateway.ts` (simpler than a second gateway) to relay `notification.created` events on the user's channel. Alternative: new `/notifications` namespace — see `08-open-decisions.md` for trade-offs.

Frontend:

- `frontend/contexts/NotificationContext.tsx` — rewrite to:
  - Fetch `GET /notifications?unread=true` on mount.
  - Subscribe to `notification.created` socket event.
  - Expose `markRead` / `markAllRead`.
  - Keep the existing transient-toast interface (add the `Notification` to in-memory toast list too).
- `frontend/pages/NotificationsPage.tsx` — swap data source from context-only to the list returned by API + context merge.
- `frontend/components/layout/Navbar.tsx` — unread badge count comes from `GET /notifications?unread=true&limit=0` (return count only) or from a new `/notifications/unread-count` endpoint.

## 6. Admin staffing signals panel

`GET /admin/staffing/signals` returns:

```json
{
  "openReplacementRequests": { "total": number, "byUrgency": { "LOW": n, "MEDIUM": n, "HIGH": n, "CRITICAL": n } },
  "applicationsAwaitingReview": { "total": number, "over48h": number },
  "lowPoolRegions": [ { "region": string, "openJobs": n, "activeCandidates": n } ],
  "zeroMatchJobs": [ { "jobId": string, "title": string, "hoursSincePosted": n } ],
  "candidatePoolGrowth": { "weekOverWeekPct": number }
}
```

Rendered as cards on `admin/src/pages/Dashboard.tsx` above the existing counters.

## 7. Known issues to fix in the same effort

- `email-notification.service.ts#sendBulkNotification` currently ignores `scheduledAt` — fix to forward to `scheduleNotification` when a future date is given.
- Seed `payment_reminder` and `subscription_payment_failed` into `EmailTemplate` (already referenced by billing but not seeded).
- `EmailLog.status` only ever becomes `sent` or `failed`. If SendGrid webhook is available, wire `delivered`/`opened`/`clicked` in a later pass — **deferred**.

## 8. Acceptance checklist for the email/notification phase

- [ ] All 7 new templates exist in DB after a fresh seed.
- [ ] Unit tests: `recruitment.service.spec.ts` covers the 3 recruitment trigger points with a mocked `EmailNotificationService`.
- [ ] Integration test: posting a job → matching candidates receive an email (or an `EmailLog` row is created; transport mocked).
- [ ] Admin can opt-out of `low_candidate_pool` via existing preference UI.
- [ ] `STAFFING_MATCH_EMAIL_LIMIT` enforced.
- [ ] `v2_staffing_emails` feature flag toggles fan-out.
