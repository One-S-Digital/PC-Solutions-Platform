# Phased Implementation Plan

> Phases are ordered by dependency. Nothing here is dated — promotion between phases is gated by the acceptance criteria at the end of each phase. Each phase should ship on its own branch + PR so the remodel is incremental and reversible.

**Legend (per task):**
`[Refactor]` = edit existing code. `[New]` = net-new code/data. `[Rename/IA]` = navigation, labels, routing. `[Fix]` = bug fix discovered during audit. `[Config]` = env / seed / migration.

---

## Phase 0 — Preparation (this PR)

- `[New]` Land persistent notes + this plan under `docs/v2-staffing-remodel/`.
- Register the branch and open a draft PR for visibility.

Exit criteria: this folder exists on `Main` (or a merged PR). Future sessions start by reading `00-README.md`.

---

## Phase 1 — Foundation IA + admin IA restructure (low risk, high signal)

Goal: navigation order and labels match v2 strategy **without changing any business logic**.

Tasks:

1. `[Refactor]` `frontend/components/layout/Sidebar.tsx`
   - Reorder FOUNDATION items to: Overview (`/foundation/dashboard`), **Staffing** (`/staffing` with sub-items `Job listings`, `Candidate pool`, **`Replacements`** placeholder), **HR & Compliance** (HR procedures, State policies, E-learning), **Parent Enquiries** (existing `/foundation/leads`), **Suppliers & Services** (`/marketplace/products`, `/marketplace/services`), Messages, Analytics, Organisation profile, Support.
   - Rename labels to action-based i18n keys (`sidebar.postJob`, `sidebar.findCandidates`, `sidebar.findReplacements`). Keep existing `nameKey` fallbacks to avoid missing translations during the transition.
2. `[Rename/IA]` Register `/staffing` as an alias of `/recruitment` in `frontend/App.tsx` (both work during transition). Keep the existing `/recruitment/*` routes for 1 release cycle.
3. `[Refactor]` `admin/src/components/Sidebar.tsx` reorder groups:
   - Overview, Users, Staffing (Jobs, Candidates, Applications, **Replacements** placeholder), HR & Compliance (Content, Policy crawler), Parent Enquiries (Parent leads), Suppliers & Services (Organizations, Partners, Products, Services, Orders, Discount terminations), Platform Ops (Messaging, Subscriptions, Mailing, Support, Settings).
   - Group `Staffing` children under a collapsible parent (admin Sidebar currently has no sub-items — add that pattern; mirror user frontend's `subItems` shape).
4. `[Fix]` Admin default redirect. In `frontend/App.tsx:168` change `ADMIN`/`SUPER_ADMIN` landing to a staffing-oriented location. Options:
   - (a) Send admins to the admin SPA URL if deployed separately (preferred — admins normally work there).
   - (b) If admins routinely use the user SPA, send to `/users/all` (admin first task is user management anyway) and remove the content-dashboard shortcut from role default.
   - Document the chosen URL in `07-navigation-ia-target.md`.
5. `[Fix]` Admin sidebar `partners` target — change to `/partners-directory` (authenticated `PartnersPage`), or drop the admin partners entry if Admin SPA `PartnersPage` covers it.
6. `[Fix]` `MainLayout.tsx` — lift `useTranslation` to component body.
7. `[Rename/IA]` Breadcrumb / page titles updated to the new label set.

Exit criteria: foundation sidebar order matches brief; admin sidebar order matches brief (with Users on top); no new features yet; **parent / supplier / service-provider sidebars untouched**; existing deep links still work.

---

## Phase 2 — Staffing core polish (under the hood, no new entity)

Goal: make today's recruitment features actually usable for the new positioning.

Tasks:

1. `[Refactor]` Rewrite `recruitment.service.ts#findMatchingCandidates`:
   - Score candidates on: region / canton match, city overlap, skills intersection, certifications, language, role match, and availability (reuse `isDateTimeAvailable` when `availabilitySettings` present; fall back to `availability` string).
   - Exclude already-applied candidates. Return sorted + include `matchScore` + `matchedOn[]` breakdown.
   - Add unit tests in `api/src/recruitment/`.
2. `[Fix]` `recruitment.controller.ts` — add `@Roles(FOUNDATION, ADMIN, SUPER_ADMIN)` to `GET applications` (org-scope filter in service). Add `@Roles` to `GET candidates/:id` matching `GET candidates`.
3. `[Fix]` Deduplicate `UpdateJobApplicationDto` (controller imports from `create-job-application.dto.ts`; delete the unused `update-job-application.dto.ts` or make it the canonical source).
4. `[Refactor]` Application pipeline UI:
   - Replace `ViewApplicantsModal` with a two-pane review screen: list + drill-in (cover letter, CV link, message button, status dropdown PATCH).
   - Extend `ApplicationStatus` enum (see §5 for migration): add `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED` alongside existing `PENDING`, `REVIEWED`, `ACCEPTED`, `REJECTED`. Backfill: treat `ACCEPTED` as `HIRED` for display, keep enum member for BC.
   - Replace `alert()` stub in `EducatorApplicationsPage.tsx` with a detail modal.
5. `[Refactor]` Persistent shortlist. New Prisma model `SavedCandidate { id, foundationId, userId, candidateId, createdAt, notes? }`. Replace `localStorage` favourites in `RecruitmentPage.tsx`. Expose endpoints in `recruitment.controller.ts`.
6. `[Refactor]` Foundation `JobPostModal` — expose `employmentType`, `workSchedule`, `startDate`, `salaryRange` already on the API; simplify defaults; keep the action label "Post a job" primary.
7. `[Refactor]` Admin `AddJobListingModal` — field parity with foundation modal.
8. `[Fix]` `JobListings.tsx` — add `FILLED` to status filter; add `FILLED` transition action.
9. `[Fix]` `EducatorJobBoardPage.tsx` — contract-type filter aligned with `JobContractType` enum (include replacement/temporary/freelance).
10. `[Fix]` `Candidates.tsx` delete menu wired to a proper API call (or removed if delete is not desired at admin level).
11. `[Refactor]` Replace `picsum.photos` avatars with initials-avatar.

Exit criteria: hiring an educator from a posted job is a clean end-to-end flow; admin mirrors foundation capability; shortlist persists; all listed bugs from `02-gap-analysis.md §H` resolved.

---

## Phase 3 — Replacement staffing as a first-class feature

Goal: directors can post urgent replacement needs and see available educators in minutes.

Tasks:

1. `[New]` Prisma models (`api/prisma/schema.prisma`):
   - `ReplacementRequest { id, foundationId, title, description?, startAt, endAt, requiredSkills[], requiredRole?, cities[], region?, urgency (enum LOW|MEDIUM|HIGH|CRITICAL), status (OPEN|MATCHED|CONFIRMED|FULFILLED|CANCELLED), createdAt, updatedAt, fulfilledByUserId?, notes? }`.
   - `ReplacementMatch { id, requestId, candidateId, status (SUGGESTED|OFFERED|DECLINED|ACCEPTED), score, createdAt, respondedAt? }` — scoped unique per `(requestId, candidateId)`.
   - Additive only. No changes to `JobListing` / `JobApplication`.
   - Migration: `prisma migrate dev -n "v2_replacement_staffing"`.
2. `[New]` `api/src/staffing/replacement/` module:
   - Service: CRUD + `suggestMatches(requestId)` using the Phase 2 matching algorithm (weight availability on the date/time of the request).
   - Controller:
     - `POST /staffing/replacements` (FOUNDATION, ADMIN) — create request.
     - `GET /staffing/replacements` (FOUNDATION own-org, ADMIN all) — filter by status, urgency.
     - `GET /staffing/replacements/:id` — detail including matches.
     - `PATCH /staffing/replacements/:id` — update / cancel.
     - `POST /staffing/replacements/:id/offer/:candidateId` — change match status to `OFFERED`, email the candidate.
     - `POST /staffing/replacements/:id/accept` (EDUCATOR) — candidate accepts.
     - `POST /staffing/replacements/:id/confirm/:candidateId` (FOUNDATION) — confirm fulfilment.
   - Guards: `ClerkAuthGuard` + `RolesGuard`; own-org enforcement in service.
3. `[New]` Foundation UI:
   - `/staffing/replacements` page — list + urgency badges + filters + "New replacement request" primary CTA.
   - Detail page with suggested candidates (sorted by match score) and one-click "Offer" action.
4. `[New]` Admin UI:
   - `/staffing/replacements` (admin SPA) — cross-foundation view. Same detail surface.
5. `[New]` Availability polish:
   - Finish `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md` (finish the `/educators/available` search endpoint; use it for `suggestMatches`).
   - Add `isOpenToReplacement: boolean` to `availabilitySettings` JSON, editable in `EducatorProfilePage`.
6. `[New]` Candidate-side UI:
   - `EducatorDashboardPage` gains a "Replacement opportunities" card (only when `isOpenToReplacement` is true).
   - `EducatorApplicationsPage` gains a "Replacement offers" tab.
7. `[Rename/IA]` Promote "Replacements" from the Phase 1 placeholder to a real sub-nav entry in both foundation and admin sidebars.

Exit criteria: a foundation user can post a replacement need, see sorted matches, send an offer, and record fulfilment; educators can accept/decline; admin has cross-foundation visibility.

---

## Phase 4 — Emails + in-app notifications (staffing events)

Goal: the platform talks to its users about staffing events.

Tasks:

1. `[New]` Seed new `EmailTemplate` rows in `email-template.service.ts#getStarterTemplates`:
   - `new_application` → foundation members: `{foundationName, candidateName, jobTitle, applicationUrl}`.
   - `application_status_update` → candidate: `{candidateName, jobTitle, foundationName, status, applicationUrl}`.
   - `job_match` → candidate: `{candidateName, jobTitle, foundationName, location, jobUrl}`.
   - `replacement_request_open` → matched candidates: `{candidateName, foundationName, startAt, endAt, cities, offerUrl}`.
   - `replacement_matched` → foundation: `{foundationName, candidateName, requestTitle, requestUrl}`.
   - `replacement_confirmed` → candidate and foundation: confirmation details.
   - `low_candidate_pool` → admins (daily summary): `{region, openJobs, activeCandidates, gap}`.
2. `[New]` Trigger sites:
   - `recruitment.service.ts#createJobApplication` — emit `new_application` to foundation members.
   - `recruitment.service.ts#updateJobApplication` — emit `application_status_update` on status change.
   - `recruitment.service.ts#createJobListing` (on publish transition) — emit `job_match` to top-N matching candidates (use Phase 2 matcher; cap via env `STAFFING_MATCH_EMAIL_LIMIT`; respect `jobRecruitment` preference).
   - `replacement.service.ts#create` — emit `replacement_request_open` to top matches.
   - `replacement.service.ts#confirm` — emit `replacement_confirmed`.
3. `[New]` Prisma `Notification` model + `api/src/notifications/` module:
   - `Notification { id, userId, type, title, body, link, metadata Json?, readAt?, createdAt }`.
   - REST endpoints: `GET /notifications`, `POST /notifications/mark-read`, `POST /notifications/mark-all-read`.
   - Socket push: extend existing `/messaging` gateway with a `notification` event, or add a `/notifications` gateway (decision in `08-open-decisions.md`).
4. `[Refactor]` `frontend/contexts/NotificationContext.tsx` — load from API, subscribe via socket, keep the in-memory fallback for transient toasts.
5. `[New]` Admin "Staffing signals" panel on admin home:
   - Cards: Open replacement requests (count + urgency breakdown), Applications awaiting review > 48h, Low-pool regions (0 active candidates for an active job's region), Candidate-pool growth (WoW), Jobs with 0 matches > 24h.
   - Service `api/src/staffing/signals/` aggregates these counts for `ADMIN`/`SUPER_ADMIN`.
6. `[New]` Admin daily digest email: reuse `scheduleNotification` with a generated payload → `low_candidate_pool` template. Or run a nightly cron in `staffing-signals.service.ts` posting to `/admin/mailing/custom-lists/admins`.
7. `[Fix]` While here: fix the two known engine flaws — `sendBulkNotification` respecting `scheduledAt` (delegate to `scheduleNotification`), and seeding `payment_reminder` / `subscription_payment_failed` templates so billing flow doesn't fail silently.

Exit criteria: emails on the 5 staffing events fire in production with log evidence; admin homepage surfaces staffing signals; in-app notifications have backing persistence and real-time delivery.

---

## Phase 5 — Foundation dashboard homepage (Overview)

Goal: the foundation "Overview" page reflects staffing-first operational clarity.

Tasks:

1. `[Refactor]` `frontend/pages/foundation/FoundationDashboardPage.tsx`:
   - Hero block: three KPI cards — **Open positions**, **Applications awaiting review**, **Open replacement requests** (each clickable).
   - Primary CTA row: Post a job, Find replacement staff, Find candidates, Review applications.
   - Below the fold: Recent activity (existing), today's calendar (existing), quick message (existing), plus a "Secondary" row with collapsed cards for Parent enquiries, HR alerts (from `policy-alerts`), Supplier promotions.
   - Data loader: new `foundationStaffingOverviewService` combining existing `foundationDashboardService` with the new staffing counts.
2. `[Refactor]` `educator` and `parent` dashboards: **no structural change**. Educators gain the "Replacement opportunities" card from Phase 3. Parents untouched.
3. `[Refactor]` `supplier` and `service-provider` dashboards: **untouched**. Explicit test: no staffing labels appear on their routes.

Exit criteria: a foundation user lands on `/foundation/dashboard` and immediately sees staffing state + three primary actions; the rest of the platform is reachable but visually secondary.

---

## Phase 6 — Admin homepage + user-management parity

Goal: admin lands on a staffing signals page; user management stays one click away.

Tasks:

1. `[Refactor]` `admin/src/pages/Dashboard.tsx`:
   - Top: **Staffing signals** cards (from Phase 4).
   - Next: **Users quick actions** (manage users, invite, pending requests) — this enforces the "Users sits second" rule.
   - Then: existing Jobs / Applications / Content / Platform counters.
2. `[Refactor]` `admin/src/components/Sidebar.tsx` badge system — wire existing `useNotificationData` to the new `Notification` model for live counts (jobs awaiting moderation, urgent replacements, support tickets).
3. `[New]` Admin email preferences — expose the `jobRecruitment` category explicitly on the admin profile so admins can opt in/out of staffing digests.

Exit criteria: admin homepage shows operational signals first, user management second, everything else below. Badge counts are live.

---

## Phase 7 — Measurement & cleanup

Goal: close the feedback loop and remove deprecated surfaces.

Tasks:

1. `[New]` Add metrics collection (all derived from existing tables, no new telemetry stack required):
   - Time-to-first-candidate: `JobApplication.createdAt - JobListing.publishedAt`.
   - Time-to-hire: `JobApplication.updatedAt (status=HIRED) - JobListing.publishedAt`.
   - Replacement fulfilment speed: `ReplacementRequest.updatedAt (status=FULFILLED) - createdAt`.
   - Expose on admin "Staffing signals" page as a rolling 30-day panel.
2. `[Rename/IA]` Remove legacy `/recruitment/*` routes (keep a server-side redirect for 1 release).
3. `[Rename/IA]` Retire the label "Recruitment" from user-facing nav; keep in the API module name (no reason to rename the Nest module).
4. `[Fix]` `Messaging.tsx` `unreadCount` hard-coded `0` — compute properly.
5. `[Config]` `CLAUDE.md` updated with v2 context pointer to this folder.

Exit criteria: staffing KPIs visible, legacy paths retired, docs coherent.

---

## Out of scope (explicit)

- Rebuilding billing, Stripe, Clerk, or messaging.
- Reworking supplier / service-provider / parent UIs.
- Deep automation (auto-offer AI, auto-match bots).
- Video interviewing or scheduling integrations.
- New marketplace features.
- Standalone onboarding wizard.

These may be revisited after the staffing core is proven (metrics from Phase 7).
