# PC Solutions Platform — Staffing-Centric Remodel Plan (v2)

> **Companion:** `REMODEL_NOTES.md` (investigation findings). Read it first.
>
> **Objective:** Refocus ProCrèche around **recruitment & staffing for Swiss childcare operators**, with every other feature demoted to a support layer. Upgrade the existing platform in place — no rewrite.
>
> **Scope:** Admin dashboard + Foundation (daycare) dashboard. Plus targeted changes to the Educator supply side. **Do not touch** Parent / Supplier / Service Provider dashboards.
>
> **Working branch:** `claude/plan-dashboard-remodel-DCWWE`.

---

## 0. TL;DR

- **Keep** the stack, the database, the Clerk/Prisma/Nest/React layout, the role system, and the email transport. Nothing is rebuilt from scratch.
- **Add** three Prisma tables (`ReplacementRequest`, `ReplacementMatch`, `Notification`), four enum values on `ApplicationStatus`, and seven new email templates with concrete trigger sites. **Zero new columns on existing tables.**
- **Reuse** existing JSON fields (`User.availabilitySettings`, `Organization` metadata) to avoid column bloat and reuse existing modules (`recruitment`, admin controllers) instead of spawning new Nest skeletons.
- **Remodel** admin + foundation dashboards around action verbs, not modules: *Post a job, Find candidates, Review applications, Find replacement staff.*
- **Demote** HR / parent enquiries / suppliers / e-learning to secondary nav, never on top.
- **Preserve** all live data via additive migrations and feature flags.

---

## 1. Guiding Principles

1. **Action-based design.** Surface "Post a job", "Find replacement staff" — not "Recruitment".
2. **One signal per screen.** What needs attention, what's urgent, what to do next.
3. **No platform bloat.** No HR-suite expansion, no ERP, no deep automation before core flows ship.
4. **Feature gate:** ship only if it improves hiring speed, candidate visibility, replacement pressure, or operator simplicity. Otherwise defer.
5. **Additive-only schema changes** for live-data safety. No destructive migrations, no enum value removals.
6. **Reuse before extend, extend before create.** New table only if no existing table or JSON field can carry the data without UX compromise.

---

## 2. Navigation Order — Locked

### Foundation (frontend) sidebar — new order
1. **Overview** (staffing-led home) — `/foundation/dashboard`
2. **Staffing** (parent group) — `/staffing`
   - Post a job → `/staffing/jobs`
   - Find candidates → `/staffing/candidates`
   - Find replacement staff → `/staffing/replacements`
   - Review applications → `/staffing/applications`
3. **HR & Compliance** (parent) — HR procedures, State policies, E-learning
4. **Parent Enquiries** — `/foundation/leads`
5. **Suppliers & Services** (parent) — `/marketplace/products`, `/marketplace/services`
6. Orders & appointments, Analytics, Messages, Organisation profile, Support (utility, bottom)

### Admin sidebar — new order
1. **Overview** — staffing-signals homepage
2. **Users** (kept second by design)
3. **Staffing** (parent, collapsible) — Job listings, Candidates, Applications (cross-foundation), Replacement requests
4. **HR & Compliance** — Content, Policy crawler
5. **Parent Enquiries** — Parent leads
6. **Suppliers & Services** — Organizations, Partners, Products, Services, Orders
7. **Platform Ops** — Messaging, Subscriptions, Mailing, Support, Discount terminations, Settings

> Rule: this order is strategy-locked. Do not re-sort without a strategy change.

### URL migration table

| From | To | Status during phases 1–6 | After Phase 7 |
|---|---|---|---|
| `/recruitment` | `/staffing` | Both work | Old → 301 redirect |
| `/recruitment/job-listings` | `/staffing/jobs` | Both work | Old → 301 redirect |
| `/recruitment/candidate-pool` | `/staffing/candidates` | Both work | Old → 301 redirect |
| (new) | `/staffing/replacements` | N/A | — |
| (new) | `/staffing/applications` | N/A | — |
| `/admin/content-dashboard` (admin default landing) | admin SPA home | Stop defaulting; page kept reachable | Page kept, no default |

---

## 3. Change Taxonomy — What We Keep / Extend / Rebuild

| Layer | Keep as-is | Extend / refactor | Rebuild / new |
|---|---|---|---|
| **DB schema** | All existing tables, roles, permissions; `ALLOWED_JOB_ROLES` (5 values); `JobListing`, `JobApplication`; `UserNotificationPreferences`. | Extend `ApplicationStatus` enum with 4 new values (SHORTLISTED, INTERVIEW, OFFER, HIRED). | Three new tables: `ReplacementRequest`, `ReplacementMatch`, `Notification`. **No new columns on existing tables** — replacement availability lives in `User.availabilitySettings` JSON; foundation shortlists live as a JSON array on `Organization`. |
| **API (Nest)** | Auth, Clerk webhooks, mailing transport, email cron, subscriptions, support, leads, marketplace. | `recruitment.service.ts` — real candidate scoring; email call sites for application created/status changed/job published. `recruitment.controller.ts` — add replacement endpoints in this controller (no new module). `settings.controller` — `isOpenToReplacement` toggle in `availabilitySettings`. | New `notifications` module (CRUD + socket push). Single new admin endpoint `GET /admin/staffing/signals` (lives in existing admin controller; **no new staffing-signals module**). |
| **Email** | SMTP→Mailgun→SendGrid transport priority, cron dispatcher, category/preference check. | Seed 7 new templates; add billing templates that were missing (`payment_reminder`, `subscription_payment_failed`); fix `sendBulkNotification` ignoring `scheduledAt`. | Nothing new in the transport layer. |
| **Admin FE** | Users.tsx, Mailing, Support, Subscriptions, Content, System pages. | Dashboard.tsx — staffing-signals layout; existing count cards preserved below the fold. Sidebar.tsx — add collapsible parent groups (new pattern; admin sidebar currently flat). | New pages: `Replacements.tsx` (cross-foundation), `Applications.tsx` (cross-foundation pipeline view). Header bell — add `staffing` category. |
| **Foundation FE** | Organisation profile, marketplace, messaging, settings. | FoundationDashboardPage — staffing-led layout (folds in FOUNDATION_PAGES_REBUILD_PLAN Phase 1 mock-data removal). RecruitmentPage — wire `/staffing/*` aliases. Application review modal — replace with two-pane review screen + pipeline-stage dropdown. Sidebar role config — new order. | New pages: `FoundationReplacementsPage` (post urgent need, see matched candidates, fill); `/staffing/applications` (cross-job applications list). |
| **Educator FE** | Profile page, applications page, job board. | EducatorProfilePage — `isOpenToReplacement` + date-window inside availability section. EducatorDashboardPage — "Replacement opportunities" panel. EducatorApplicationsPage — "Replacement offers" tab; replace `alert()` stub with real detail modal. | None. |
| **Parent / Supplier / Provider FE** | Everything. | Nothing. | Nothing. |

---

## 4. Schema Changes (Additive Only)

### 4.1 `ApplicationStatus` enum — extend
```prisma
enum ApplicationStatus {
  PENDING
  REVIEWED
  ACCEPTED      // legacy — kept; new flows use HIRED
  REJECTED
  SHORTLISTED   // new
  INTERVIEW     // new
  OFFER         // new
  HIRED         // new — supersedes ACCEPTED for new transitions
}
```
Migration `v2_application_pipeline_stages`. Existing rows untouched. UI renders `ACCEPTED` and `HIRED` identically for one release.

### 4.2 New model `ReplacementRequest`
```prisma
model ReplacementRequest {
  id             String              @id @default(cuid())
  foundationId   String
  foundation     Organization        @relation(...)
  title          String
  description    String?
  startAt        DateTime
  endAt          DateTime?
  requiredRole   String?             // one of ALLOWED_JOB_ROLES
  requiredSkills String[]
  cities         String[]
  region         String?
  urgency        ReplacementUrgency  @default(MEDIUM)
  status         ReplacementStatus   @default(OPEN)
  fulfilledBy    String?             // userId
  notes          String?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  matches        ReplacementMatch[]
  @@index([status, urgency, startAt])
}
enum ReplacementUrgency { LOW MEDIUM HIGH CRITICAL }
enum ReplacementStatus  { OPEN MATCHED CONFIRMED FULFILLED CANCELLED EXPIRED }
```

### 4.3 New model `ReplacementMatch`
```prisma
model ReplacementMatch {
  id          String                @id @default(cuid())
  requestId   String
  request     ReplacementRequest    @relation(...)
  candidateId String
  candidate   User                  @relation(...)
  status      ReplacementMatchStatus @default(SUGGESTED)
  score       Int                   @default(0)
  reasons     Json                  @default("[]")
  createdAt   DateTime              @default(now())
  respondedAt DateTime?
  @@unique([requestId, candidateId])
  @@index([candidateId, status])
}
enum ReplacementMatchStatus { SUGGESTED OFFERED DECLINED ACCEPTED }
```

### 4.4 New model `Notification`
```prisma
model Notification {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(...)
  type      String    // 'new_application', 'replacement_offer', 'job_match', etc.
  title     String
  body      String?
  link      String?
  metadata  Json?
  readAt    DateTime?
  createdAt DateTime  @default(now())
  @@index([userId, readAt, createdAt])
}
```

### 4.5 Things deliberately NOT added
- ❌ No `SavedCandidate` table — foundation shortlists live as `Organization.savedCandidateIds Json` (or service-side: store in an existing JSON-bearing field). One-shot localStorage migration on first load.
- ❌ No new columns on `User` for replacement availability — keys go inside the existing `User.availabilitySettings` JSON: `isOpenToReplacement`, `replacementFrom`, `replacementTo`, `replacementRadiusKm`. DTO-validated.
- ❌ No new columns on `JobListing` for urgency/fillBy/shiftWindow — those concerns live on `ReplacementRequest` only. `JobListing` keeps its current shape; `contractType=REPLACEMENT` enum value remains usable but is no longer the primary entry point for replacement workflows.
- ❌ No new Nest modules for `replacement` or `staffing-signals` — endpoints live inside existing `recruitment.controller.ts` and existing admin controllers.

### 4.6 Migration safety
- All additive. Defaults safe.
- `ApplicationStatus` extension preserves all existing values; no row update required.
- New tables start empty.
- No data deleted. No columns renamed. No enum values removed. Live users continue unaffected.

---

## 5. Feature Design

### 5.1 Foundation: Staffing-led Overview (`/foundation/dashboard`)
> This layout renders at `/foundation/dashboard` as the **Dashboard tab** of the `Assistant | Dashboard` toggle. It is no longer the default landing page when `v2_assistant_dashboard` is active — see Phase 5 note and `ASSISTANT_DASHBOARD_REDESIGN_PLAN.md`.

Replace mock-heavy dashboard with:
- **Top — three KPI cards**: Open positions, Applications awaiting review, Open replacement requests (clickable).
- **Primary actions row**: Post a job → opens `JobPostModal`; Find replacement staff → `/staffing/replacements/new`; Find candidates → `/staffing/candidates`; Review applications → `/staffing/applications`.
- **Below the fold**: existing recent activity, calendar, quick message; secondary panel with collapsed cards for Parent enquiries, HR alerts, Supplier offers.

### 5.2 Foundation: Replacements (`/staffing/replacements`)
- List: Open / Matched / Confirmed / Fulfilled tabs with urgency badges.
- "New replacement request" form: role (5 options), start/end, urgency (LOW/MEDIUM/HIGH/CRITICAL), cities, notes → creates `ReplacementRequest` + computes initial `ReplacementMatch` rows.
- Detail page: matches table sorted by score with one-click "Offer" (sets match `status=OFFERED`, fires `replacement_request_open` email). On candidate accept → match `status=ACCEPTED`, foundation receives `replacement_matched` email. Foundation confirms → request `status=FULFILLED`, both sides receive `replacement_confirmed`.

### 5.3 Foundation: Application pipeline (`/staffing/applications`)
- Cross-job list with stage filter (`PENDING` / `SHORTLISTED` / `INTERVIEW` / `OFFER` / `HIRED` / `REJECTED`).
- Two-pane review screen replacing `ViewApplicantsModal`: list + drill-in (cover letter, CV link, message button, status dropdown).
- Persistent shortlist: stored in `Organization.savedCandidateIds` JSON; replaces `localStorage` favourites.

### 5.4 Educator: Replacement availability + offers
- Profile page: Availability section with toggle "Available for replacement shifts", date range, radius km — all written to `availabilitySettings` JSON keys.
- Dashboard: "Replacement opportunities" panel — query `GET /recruitment/replacements/matching-for-me`.
- Applications page: new "Replacement offers" tab listing `ReplacementMatch` rows where `status=OFFERED`.
- Replace `alert()` stub on application detail with a real detail modal.

### 5.5 Candidate matching — scoring (service-layer rewrite)
Extend `recruitment.service.ts → findMatchingCandidates`:
```
score =
  (roleMatch              ? 40 : 0) +
  (cityOverlap            ? 25 : 0) +
  (skillsIntersection     * 15 clamp) +
  (availabilityOverlap    ? 15 : 0) +
  (recentActivityBonus    up to 5)
returns: { candidate, score, reasons[] } sorted desc
```
Same scorer powers `ReplacementMatch.score` (with the availability factor weighted on the request's date window).

### 5.6 Admin: Staffing-signals overview (`/dashboard`)
Replace 10-count grid with:
- **Top — Staffing signals (4 cards)**: Urgent replacement requests (count + urgency breakdown), Applications awaiting review > 48h, Low-pool regions, Zero-match jobs > 24h. Powered by single endpoint `GET /admin/staffing/signals`.
- **Next — Users quick actions**: Manage users, Invite user, Pending role changes (enforces "Users sits second" rule).
- **Below the fold — existing counters preserved** (users, foundations, products, parent leads, jobs, applications, e-learning, HR docs, policies, crawler health). Nothing is lost.

### 5.7 Admin: Replacements + Applications pages
- `/replacements` — cross-foundation visibility with urgency/SLA filters, override "mark fulfilled" with audit reason, CSV export.
- `/applications` — cross-foundation application pipeline view (mirrors foundation `/staffing/applications` but unscoped).

### 5.8 In-app notifications (`Notification` table)
- REST: `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`.
- Internal `createNotification()` called alongside every `sendNotification()` call site.
- Socket push via existing `messaging.gateway.ts` — emit `notification.created` on the user's channel. (Decision: extract to `/notifications` namespace later if other transports appear — see Open Questions.)
- Frontend: rewrite `NotificationContext.tsx` — fetch on mount, subscribe via socket, expose `markRead`/`markAllRead`. Bell badge count from `/notifications/unread-count`. Keep transient-toast interface as a layer on top.

---

## 6. Email Notifications Plan

Hooked into existing `EmailNotificationService` + templates.

### 6.1 Seed 7 templates (in `email-template.service.ts#getStarterTemplates` and `prisma/seed.ts`)
| Event key | Category | Recipient | Trigger |
|---|---|---|---|
| `new_application` | `jobRecruitment` | Foundation members | `recruitment.service.createJobApplication` |
| `application_status_update` | `jobRecruitment` | Educator | `recruitment.service.updateJobApplication` (status change) |
| `job_match` | `jobRecruitment` | Top-N matched educators | `recruitment.service.createJobListing` / `updateJobListing` on `DRAFT → PUBLISHED` |
| `replacement_request_open` | `jobRecruitment` | Top-N matched educators (`isOpenToReplacement=true`) | `recruitment.service.createReplacementRequest` |
| `replacement_matched` | `jobRecruitment` | Foundation members | `ReplacementMatch.status → ACCEPTED` |
| `replacement_confirmed` | `jobRecruitment` | Educator + Foundation | `recruitment.service.confirmReplacement` |
| `low_candidate_pool` | `systemAdmin` | Admins (daily digest) | Nightly cron in admin controller |

### 6.2 Fan-out & gating
- Foundation-bound emails: every active user with `organizationId = foundationId` (role FOUNDATION or ADMIN linked to org). Fall back to `Organization.primaryContactEmail`.
- Candidate fan-out (`job_match`, `replacement_request_open`) capped by `STAFFING_MATCH_EMAIL_LIMIT` env var (default 20). Selected by Phase 2 matcher, ranked by score.
- All gated by `UserNotificationPreferences.jobRecruitment` (or `systemAdmin` for the digest). Use `Promise.allSettled` so one bad email never aborts the parent request.

### 6.3 Bug-fix sweep alongside this work
- Fix `sendBulkNotification` ignoring `scheduledAt` — delegate to `scheduleNotification` when a future date is given.
- Seed `payment_reminder` and `subscription_payment_failed` (referenced by billing flow but never seeded — billing emails are silently failing today).
- Defer SendGrid/Mailgun delivery webhook wiring (not required for this phase).

---

## 7. Bug Sweep — caught during audit, fix alongside Phases 1–2

These are not strategic, but they unblock the new IA and admin actions:

1. `frontend/App.tsx:168` — admin default redirect lands on `/admin/content-dashboard`; redirect to admin SPA home (or `/users/all` if admins live mainly in the user SPA).
2. `frontend/components/layout/MainLayout.tsx` — `useTranslation` is called inside a callback; lift to component body.
3. `admin/src/pages/Candidates.tsx` — Delete menu item has no `onClick`; wire to API or remove the menu item.
4. `admin/src/components/AddJobListingModal.tsx` — missing `employmentType`, `workSchedule`, `startDate`, `salaryRange` fields vs the foundation modal; add for parity.
5. `admin/src/pages/JobListings.tsx` — status filter missing `FILLED`; add it.
6. `frontend/pages/educator/EducatorJobBoardPage.tsx` — contract-type filter omits `REPLACEMENT`, `TEMPORARY`, `FREELANCE`; align with `JobContractType` enum.
7. `frontend/pages/educator/EducatorApplicationsPage.tsx` — "View details" is an `alert()` stub; replace with a real detail modal.
8. `api/src/recruitment/recruitment.controller.ts` — missing `@Roles` on 2 endpoints (`GET applications`, `GET candidates/:id`).
9. Duplicate `UpdateJobApplicationDto` (controller imports from `create-job-application.dto.ts` and a parallel `update-job-application.dto.ts` exists unused) — delete the unused file or make it canonical.
10. `admin/src/pages/Messaging.tsx` — `unreadCount` hard-coded to `0`; compute properly.
11. `recruitment.service.ts#findMatchingCandidates` is a stub returning all pool-visible educators — replaced by §5.5 scoring.

---

## 8. Feature Flags (rollout safety)

Reuse existing `FeatureFlag` model. Four flags:

| Flag | Default | Purpose |
|---|---|---|
| `v2_staffing_ia` | off in prod until Phase 1 validated | New nav labels + order on both apps |
| `v2_replacement_module` | off until Phase 3 ships | Hides `/staffing/replacements` route + admin replacements page |
| `v2_staffing_emails` | off until Phase 4 templates verified | Master switch for new email events; per-event override via `STAFFING_EMAIL_DISABLED_EVENTS` env var |
| `v2_in_app_notifications` | off until Phase 4 socket verified | Gates the new `Notification` feed; falls back to existing transient toasts |

Read by `FrontendSettingsManager` on FE and existing `FeatureFlagService` on BE.

---

## 9. Phased Delivery

Each phase is independently shippable. No phase rewrites the previous one.

### Phase 1 — IA + bug sweep [low risk, high signal]
- Sidebar reorder (foundation + admin) per §2; new collapsible parent groups in admin sidebar (new pattern — admin sidebar is flat today).
- Action labels (i18n keys: `sidebar.postJob`, `sidebar.findCandidates`, `sidebar.findReplacements`, `sidebar.reviewApplications`).
- `/staffing` registered as alias of `/recruitment` — both work during transition.
- All 11 bugs in §7 fixed.
- Seed `payment_reminder` + `subscription_payment_failed` templates.
- Feature flag `v2_staffing_ia` controls the visible reorder.
- **No behavior change to recruitment flows yet.** Parent/Supplier/Provider sidebars byte-identical pre/post.

### Phase 2 — Backend wiring + matching + pipeline
- Prisma migration: `ApplicationStatus` enum extension, JSON-key conventions documented (no new tables yet).
- `recruitment.service.ts` — real scoring in `findMatchingCandidates`; email call sites for `new_application`, `application_status_update`, `job_match`.
- Application review UI: two-pane screen, pipeline-stage dropdown, replace `ViewApplicantsModal`.
- Foundation shortlist: `Organization.savedCandidateIds` JSON; one-shot localStorage migration on first load.
- Replace `picsum.photos` placeholders with initials-avatar.
- Foundation `JobPostModal` + admin `AddJobListingModal` field parity.
- `JobListings.tsx` `FILLED` filter wired.

### Phase 3 — Replacement staffing as a first-class feature
- Prisma migration: `ReplacementRequest` + `ReplacementMatch` + their enums.
- Replacement endpoints added inside `recruitment.controller.ts` (no new module):
  - `POST/GET/:id/PATCH /recruitment/replacements`
  - `POST /recruitment/replacements/:id/offer/:candidateId`
  - `POST /recruitment/replacements/:id/accept`
  - `POST /recruitment/replacements/:id/confirm/:candidateId`
  - `GET  /recruitment/replacements/matching-for-me` (EDUCATOR)
- `recruitment.service` extension: `suggestMatches(requestId)` reuses §5.5 scorer with availability weighted on the request window.
- Educator profile: `isOpenToReplacement` + date window in `availabilitySettings`.
- Foundation: `FoundationReplacementsPage` (list + new request form + detail with matches table).
- Admin: `/replacements` cross-foundation page.
- Educator dashboard: "Replacement opportunities" card; applications page: "Replacement offers" tab.
- Feature flag `v2_replacement_module` gates everything.

### Phase 4 — Emails + in-app notifications
- Seed remaining 4 templates (`replacement_request_open`, `replacement_matched`, `replacement_confirmed`, `low_candidate_pool`).
- Trigger sites wired in `recruitment.service` + `notifications.service`.
- Prisma migration: `Notification` table.
- New `notifications` Nest module + REST endpoints + socket push via existing `messaging.gateway`.
- `NotificationContext.tsx` rewrite (fetch + subscribe + markRead).
- `useNotificationData` hook in admin pulls live counts from `Notification` rows.
- Daily admin digest cron (`0 7 * * *`) → `low_candidate_pool` template.
- Fix `sendBulkNotification` → respect `scheduledAt`.
- Feature flags `v2_staffing_emails` + `v2_in_app_notifications` gate rollout.

### Phase 5 — Foundation dashboard homepage

> **Reconciled with `ASSISTANT_DASHBOARD_REDESIGN_PLAN.md`.**
> When `v2_assistant_dashboard` is active, Foundation users land on `/foundation/assistant` (the AI chat workspace). The header toggle's **Dashboard** tab navigates to `/foundation/dashboard` — the existing Foundation dashboard, updated by this phase. The **Assistant** tab returns to `/foundation/assistant`. The two views are independent: this phase updates the dashboard page as planned; the assistant plan builds the chat workspace. The toggle is purely a navigation switch between the two routes.

**What to build (unchanged from §5.1):**
- `FoundationDashboardPage` — three KPI cards (Open positions, Applications awaiting review, Open replacement requests), Primary actions row (Post a job, Find replacement staff, Find candidates, Review applications), below-the-fold panels (recent activity, calendar, parent enquiries, HR alerts, supplier offers). Folds in FOUNDATION_PAGES_REBUILD_PLAN Phase 1 mock-data removal.
- New `foundationStaffingOverviewService` combining existing `foundationDashboardService` with the new staffing counts.

**Route / flag interaction:**
- Flag `v2_assistant_dashboard` **OFF** → `RoleBasedDashboardRedirect` sends Foundation to `/foundation/dashboard` as today (no change).
- Flag `v2_assistant_dashboard` **ON** → redirect sends Foundation to `/foundation/assistant`; Dashboard toggle tab → `/foundation/dashboard`; Assistant toggle tab → `/foundation/assistant`.
- Both routes always registered; the flag only controls the default landing.

**Educator + Parent + Supplier + Provider dashboards:** no structural change; explicit smoke test that staffing labels do not appear on non-core role routes.

### Phase 6 — Admin homepage + parity
- `admin/src/pages/Dashboard.tsx` — staffing-signals layout per §5.6; existing count cards preserved below the fold.
- `GET /admin/staffing/signals` endpoint inside existing admin controller (no new module).
- Admin email preferences expose `jobRecruitment` category explicitly so admins can opt out of digests.

### Phase 7 — Measurement & cleanup
- KPI widgets in admin Staffing Signals: time-to-first-candidate, time-to-hire, replacement fulfilment speed, candidate-pool growth.
- Retire legacy `/recruitment/*` routes (server-side 301 for one release).
- Drop "Recruitment" from user-facing nav; keep in API module name.
- Update `CLAUDE.md` with the v2 context pointer.
- Optional: convert open `contractType=REPLACEMENT` JobListings into `ReplacementRequest` rows (operator decision).

---

## 10. Data Migration & Preservation

### Schema change log
| Phase | Object | Change | Migration name |
|---|---|---|---|
| 2 | `ApplicationStatus` | Extend enum (4 new values, keep all existing) | `v2_application_pipeline_stages` |
| 3 | `ReplacementRequest` | New table | `v2_replacement_request` |
| 3 | `ReplacementMatch` | New table | `v2_replacement_match` |
| 4 | `Notification` | New table | `v2_notification` |
| 4 | `EmailTemplate` | Data-only — 7+ rows via `createMany({ skipDuplicates: true })` | — |

### Backfills
- `ApplicationStatus.HIRED` — not auto-backfilled. Existing `ACCEPTED` rows render identically to `HIRED` for one release; new transitions default to `HIRED`.
- `Organization.savedCandidateIds` — empty default. Optional one-shot migration of `localStorage` favourites on first load.
- `Notification` — empty on migration day (fine).
- `User.availabilitySettings.isOpenToReplacement` — not backfilled; absent = false.

### Per-role smoke test (run before each phase merges)
- PARENT / EDUCATOR / PRODUCT_SUPPLIER / SERVICE_PROVIDER: sidebar and dashboard byte-identical to pre-remodel (Phases 1–2).
- FOUNDATION: sidebar order matches target; old `/recruitment/*` URLs still resolve.
- ADMIN / SUPER_ADMIN: sidebar order matches target; admin SPA loads at login; user-facing `/admin/*` pages still reachable.
- Prisma migration dry-run on a staging copy of prod DB before each schema phase.

---

## 11. Success Metrics (instrumented in Phase 7)

- Time to post a job (click "Post a job" → published).
- Time to first candidate (job published → first application).
- Time to hire (`JobApplication.updatedAt` at HIRED − `JobListing.publishedAt`).
- Replacement fulfilment speed (`ReplacementRequest.updatedAt` at FULFILLED − `createdAt`).
- Active candidates with `candidatePoolVisible=true` AND `availabilitySettings.isOpenToReplacement=true`.
- Application rate per job; job fill rate; candidate profile completion rate.

Surface in admin `Staffing Signals` as a 4-tile rolling-30-day strip.

---

## 12. What We Deliberately Will Not Build

- Generic HR management (timesheets, payroll, leave requests).
- Full onboarding pipelines / candidate DAGs.
- Heavy marketplace features (supplier storefronts, PIM).
- AI-driven matching beyond the linear scoring in §5.5.
- Reporting dashboards beyond the staffing KPIs.
- Parent / Supplier / Provider dashboard changes of any kind.
- Mobile push notifications (deferred).
- SendGrid/Mailgun delivery webhook enrichment (deferred).
- Redis-backed webhook idempotency (deferred — known issue in CLAUDE.md).
- Any feature that doesn't answer "hiring speed, candidate visibility, replacement pressure, operator simplicity".

---

## 13. Risk Register

| Risk | Mitigation |
|---|---|
| Migration on live DB | Additive only, defaults safe, feature-flagged. Run during off-peak. |
| Email throttling on candidate-match blast | Cap via `STAFFING_MATCH_EMAIL_LIMIT` (default 20); fan-out via `Promise.allSettled`; daily digest on cron. |
| Sidebar reorder confuses existing users | One-time info banner in-app for 7 days; old URLs continue to resolve. |
| Foundation users rely on current dashboard widgets | Existing count cards preserved below the fold in Phase 6. |
| i18n regressions | Add new keys only; never rename existing keys; fr/en/de in every new key. |
| Parent/Supplier/Provider touched by mistake | Lint rule / codeowners on their route folders; reviewer checklist; per-role smoke test gate. |
| `localStorage` shortlist data lost | One-shot migration on first load to `Organization.savedCandidateIds`. |
| Notification socket pressure on `messaging.gateway` | Acceptable at current volume; extract to `/notifications` namespace if QPS warrants. |

---

## 14. Open Questions (decide before/during phases — none block Phase 1)

1. **Replacement domain modeling** — kept as separate tables (this plan's choice). Alternative: overload `JobListing` with `urgency` JSON. Locked unless Product objects.
2. **Admin default landing URL** — admin SPA home, `/users/all`, or new `/admin/staffing-signals` mirror in user SPA?
3. **Notification socket channel** — extend existing `messaging.gateway` (this plan's choice) vs. dedicated `/notifications` namespace.
4. **`STAFFING_MATCH_EMAIL_LIMIT` default** — start at 20, monitor opt-out rates.
5. **Subscription entitlements** — same gate as existing recruitment, or higher tier for replacement?
6. **Availability legacy field** — deprecate `User.availability: String?` in Phase 7, or keep both forever?
7. **Admin Notification feed** — admins receive in-app notifications too?
8. **Recruiter ↔ candidate messaging context** — auto-create per-job conversation, or reuse general messaging with `metadata.contextType='staffing'`?
9. **`RecruitmentPage.tsx`** — keep as-is mounted at new routes, or split into `StaffingJobsPage` + `StaffingCandidatesPage`?
10. **E-learning priority** — confirm "leave as-is, just demote in nav".
11. **Auto-expire `ReplacementRequest`** — cron sets `EXPIRED` after `endAt` passes?
12. **Admin override "mark fulfilled"** on behalf of foundation — yes with audit reason (like ElevateToAdmin)?

---

## 15. Acceptance Criteria

- **Phase 1:** Migration applied on staging with zero row change in existing tables; nav reorder visible behind flag; bug list cleared; no feature regressions on non-core roles.
- **Phase 2:** Unit tests for scoring; integration tests for application pipeline; email templates seeded; foundation can shortlist a candidate end-to-end.
- **Phase 3:** Foundation user can post a replacement request → see scored matches → send offer → educator accepts → foundation confirms → both sides receive emails. Admin sees cross-foundation list.
- **Phase 4:** All 7 templates fire in production with `EmailLog` evidence; in-app notification feed populates and persists; bell badge count is live.
- **Phase 5:** `FoundationDashboardPage` (`/foundation/dashboard`) renders the staffing-led KPI layout (§5.1); mock data gone; reachable via the `Assistant | Dashboard` toggle when `v2_assistant_dashboard` is on, or as the direct default when it is off; non-core dashboards untouched (smoke test passes).
- **Phase 6:** Admin Dashboard renders staffing signals on top, count cards preserved below the fold; bell dropdown shows staffing alerts as the first category.
- **Phase 7:** All 4 success metrics populated; legacy `/recruitment/*` routes 301-redirected; e2e smoke passes in fr/en/de.
