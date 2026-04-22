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
- **Add** a thin `ReplacementRequest` domain, an educator "available for replacement" signal, a candidate-matching scoring function, and 5 recruitment email templates with call sites.
- **Remodel** admin + foundation dashboards around action verbs, not modules: *Post a job, Find candidates, Fill a position, Find replacement staff.*
- **Demote** HR / parent enquiries / suppliers / e-learning to secondary nav, never on top.
- **Preserve** all live data via additive migrations.

---

## 1. Guiding Principles

1. **Action-based design.** Surface "Post a job", "Find replacement staff" — not "Recruitment".
2. **One signal per screen.** What needs attention, what's urgent, what to do next.
3. **No platform bloat.** No HR-suite expansion, no ERP, no deep automation before core flows ship.
4. **Feature gate:** ship only if it improves hiring speed, candidate visibility, replacement pressure, or operator simplicity. Otherwise defer.
5. **Additive-only schema changes** for live-data safety. No destructive migrations, no enum value removals.

---

## 2. Navigation Order — Locked

### Foundation (frontend) sidebar — new order
1. **Overview** (staffing-led home) — `/foundation/dashboard`
2. **Staffing** — `/staffing` (new parent route, see §5)
   - Jobs
   - Candidates
   - Replacements
   - Applications
3. **HR & Compliance** — existing HR procedures, state policies (grouped)
4. **Parent Enquiries** — existing `/foundation/leads`
5. **Suppliers & Services** — existing marketplace routes
6. **Training / E-Learning** — minimal; existing `/e-learning`
7. Messages / Profile / Support / Settings (utility, bottom)

### Admin sidebar — new order
1. **Dashboard** (overview — all-round platform updates, staffing-led)
2. **Users** (kept as-is; second by design)
3. **Staffing** (new grouped section — Jobs, Candidates, Replacements, Applications, Alerts)
4. **Foundations** (`/organizations`)
5. **HR & Compliance** (Content → HR docs, State policies, Policy Crawler, Policy Review, Cantons)
6. **Parent Enquiries** (`/parent-leads`)
7. **Suppliers & Services** (Partners, Products, Services, Orders)
8. **Mailing** (`/mailing`)
9. **Messaging** (`/messaging`)
10. **Subscriptions**
11. **Support**
12. **Discount Terminations**
13. **System** (System Monitor, Configuration, Translations, Design System)
14. **Settings**

> Rule: this order is strategy-locked. Do not re-sort without a strategy change.

---

## 3. Change Taxonomy — What We Keep / Extend / Rebuild

| Layer | Keep as-is | Extend / refactor | Rebuild / new |
|---|---|---|---|
| **DB schema** | All existing tables, enums, roles, permissions; `ALLOWED_JOB_ROLES` (5 values); `JobListing`, `JobApplication`; `UserNotificationPreferences`. | Add fields to `JobListing` (urgency, fillBy, shiftWindow); add fields to `User` (availableForReplacement, replacementFrom/Until). | New `ReplacementRequest` model + new `CandidateMatchScore` view/materialized query (optional). |
| **API (Nest)** | Auth, Clerk webhooks, mailing transport, email cron, subscriptions, support, leads, marketplace. | `recruitment.service.ts` — add scoring to `findMatchingCandidates`; call `sendNotification()` on application create / status change / new matching job. `settings.controller` — add replacement availability toggle endpoint. | New `replacement.controller.ts` + `replacement.service.ts` under `api/src/recruitment/replacement/`. |
| **Email** | SMTP→Mailgun→SendGrid transport priority, cron dispatcher, category/preference check. | Seed 5 new templates via `email-template.service` and `prisma/seed.ts`. Add `jobRecruitment` call sites. | Nothing new in the transport layer. |
| **Admin FE** | Users.tsx, Mailing, Support, Subscriptions, Content, System pages. | Dashboard.tsx — replace 10 generic cards with staffing-led overview + activity feed + alert column. Sidebar.tsx — reorder nav (§2). | New pages: `StaffingOverview.tsx`, `Replacements.tsx` (admin view), `StaffingAlerts.tsx`. Header bell — add `staffing` category. |
| **Foundation FE** | Organisation profile, marketplace, messaging, settings. | FoundationDashboardPage — rebuild around staffing actions (piggyback on existing FOUNDATION_PAGES_REBUILD_PLAN Phase 1). RecruitmentPage — split into clear tabs. Sidebar role config — new order. | New page: `FoundationReplacementsPage` (post urgent need, see matched candidates, fill). |
| **Educator FE** | Profile page, applications page, job board. | EducatorProfilePage — add "Available for replacement" toggle + date-window picker. EducatorDashboardPage — surface "Urgent roles near you" panel. | None. |
| **Parent / Supplier / Provider FE** | Everything. | Nothing. | Nothing. |

---

## 4. Schema Changes (Additive Only)

### 4.1 `JobListing` — add fields
```prisma
urgency           JobUrgency?     @default(NORMAL)   // NORMAL, URGENT, IMMEDIATE
fillBy            DateTime?
shiftWindow       Json?                              // { from, to, days[] } for short-notice shifts
isReplacement     Boolean         @default(false)    // denormalized from contractType for indexing
```
Add enum `JobUrgency { NORMAL URGENT IMMEDIATE }`.
Index `(status, isReplacement, urgency, fillBy)`.

### 4.2 `User` (educator fields) — add
```prisma
availableForReplacement  Boolean    @default(false)
replacementAvailableFrom DateTime?
replacementAvailableTo   DateTime?
replacementRadiusKm      Int?       @default(20)
```

### 4.3 New model `ReplacementRequest`
```prisma
model ReplacementRequest {
  id            String                   @id @default(cuid())
  foundationId  String
  foundation    Organization             @relation(...)
  jobListingId  String?                  // optional — a replacement can be tracked even without a full job
  jobListing    JobListing?              @relation(...)
  role          String                   // one of ALLOWED_JOB_ROLES
  startAt       DateTime
  endAt         DateTime?
  urgency       JobUrgency               @default(URGENT)
  status        ReplacementStatus        @default(OPEN)     // OPEN, MATCHED, FILLED, CANCELLED, EXPIRED
  filledByUserId String?
  notes         String?
  createdAt     DateTime                 @default(now())
  updatedAt     DateTime                 @updatedAt
  @@index([status, urgency, startAt])
}
enum ReplacementStatus { OPEN MATCHED FILLED CANCELLED EXPIRED }
```

### 4.4 Migration safety
- All additive, all with safe defaults → no backfill required.
- `isReplacement` backfilled in the same migration: `UPDATE job_listings SET is_replacement = (contract_type = 'REPLACEMENT');`
- No data deleted. No columns renamed. No enum values removed. Live users continue unaffected.

---

## 5. Feature Design

### 5.1 Foundation: Staffing-led Overview (`/foundation/dashboard`)
Replace current mock-heavy dashboard with four action cards above the fold:
1. **Post a job** → opens `JobPostModal`
2. **Find candidates** → `/staffing/candidates`
3. **Fill a position** → `/staffing/jobs?status=PUBLISHED`
4. **Find replacement staff** → `/staffing/replacements/new`

Below: three live panels — *Applications awaiting review*, *Open replacement requests*, *Suggested candidates for your newest job*. No generic stat tiles.

### 5.2 Foundation: Replacements (`/staffing/replacements`)
- List: Open / Matched / Filled tabs.
- `New request` form: role (5 options), start/end date, urgency, notes → creates `ReplacementRequest`.
- On create: backend triggers email `urgent_replacement_request` to matching educators (`availableForReplacement=true`, overlapping date, same role, cities overlap).
- Detail page: candidate list with match score, "Invite" button (creates JobApplication shortcut), "Mark as filled" (sets `status=FILLED`, `filledByUserId`).

### 5.3 Educator: Replacement availability
- Profile page: new "Availability" section with:
  - Toggle `Available for replacement shifts`
  - Date range (from/until)
  - Radius km
- Dashboard: new panel `Urgent roles near you` — query `GET /recruitment/replacements/matching-for-me`.

### 5.4 Candidate matching — scoring
Extend `recruitment.service.ts → findMatchingCandidates`:
```
score =
  (roleMatch    ? 40 : 0) +
  (cityMatch    ? 25 : 0) +
  (skillsOverlap * 15 clamp) +
  (availabilityOverlap ? 15 : 0) +
  (recentActivityBonus up to 5)
```
Return `{ candidate, score, reasons[] }` sorted desc. Keep the old list endpoint for non-job candidate browsing.

### 5.5 Admin: Staffing overview (new landing content on `/dashboard`)
Replace current 10-count grid with a 3-column layout:
- **Left — Staffing signals (primary)**
  - Urgent replacement requests (count + top 5, oldest first)
  - Applications awaiting foundation review > 48h
  - Low-candidate-pool alert (foundations with 0 matches on active jobs)
  - Jobs open > 30 days
- **Middle — Platform activity feed** (rolling: new users, new jobs, new applications, new leads, new campaigns)
- **Right — Platform health** (existing system health + crawler status, shrunk)

Keep all the old count cards — move them into a `Platform metrics` section *below the fold*, so nothing is lost.

### 5.6 Admin: Staffing Alerts & Notifications
- Add `staffing` category to `useNotificationData` → sidebar badge + header bell dropdown.
- Populate from new endpoint `GET /admin/staffing/alerts` returning: urgent replacements, stale applications, low-pool foundations, jobs open > 30d.
- Keep the existing five-category notification dropdown; staffing becomes the sixth, shown first.

### 5.7 Admin: Replacements page (`/replacements`)
Admin-side visibility over all foundations' replacement requests — filters, SLA age, override "mark filled", export CSV. Reuses `MailingPreviewTable` / table patterns.

---

## 6. Email Notifications Plan

Hooked into existing `EmailNotificationService` + templates.

### Seed 5 new templates (add to `api/prisma/seed.ts` and `email-template.service.ts`)
| Event key | Category | Recipient | Trigger |
|---|---|---|---|
| `job_application_received` | `jobRecruitment` | Foundation | `POST /recruitment/applications` success |
| `application_status_update` | `jobRecruitment` | Educator | `PATCH /recruitment/applications/:id` status change |
| `candidate_matched_new_job` | `jobRecruitment` | Educator | `POST /recruitment/job-listings` when published AND matching educators |
| `urgent_replacement_request` | `jobRecruitment` | Educator | `POST /recruitment/replacements` (urgency IMMEDIATE/URGENT) |
| `replacement_filled` | `jobRecruitment` | Foundation + filling Educator | Replacement `status → FILLED` |

### Call sites (all inside `recruitment.service.ts` / `replacement.service.ts`)
- After `prisma.jobApplication.create`: enqueue `job_application_received` to foundation.
- After application `status` change: enqueue `application_status_update` to candidate.
- After `jobListing.create` with `status=PUBLISHED`: query matching candidates (score ≥ 40) → enqueue `candidate_matched_new_job` (batch).
- On `replacementRequest.create` with urgency IMMEDIATE/URGENT: enqueue `urgent_replacement_request` to matches; use `ScheduledEmail` + cron to avoid blocking the request.
- On `replacementRequest` → `FILLED`: enqueue `replacement_filled`.

### Preferences
- Already wired: `UserNotificationPreferences.jobRecruitment` gates all five. Respect it; do not use `bypassPreferences` here (except for transactional confirmations to the foundation itself — judgement call: the foundation opted in by posting).

### Batching
- Candidate-match emails must batch per send (max 50 recipients per call, rate-limited) to avoid transport throttling.

---

## 7. Phased Delivery

Each phase is independently shippable. No phase rewrites the previous one.

### Phase 1 — Foundations (Schema + Nav) [~3 days]
- Prisma migration: fields in `JobListing` + `User`, new `ReplacementRequest` model.
- Seed 5 email templates (no call sites yet).
- Admin sidebar reorder + new "Staffing" group (routes point to existing pages until Phase 3).
- Foundation sidebar reorder.
- **No behavior change yet** — safe deploy.

### Phase 2 — Backend wiring [~4 days]
- `recruitment.service.ts`: scoring in `findMatchingCandidates`; email call sites (app created, status changed, new job matching).
- New `replacement.controller/service` + endpoints:
  - `POST /recruitment/replacements` (FOUNDATION/ADMIN)
  - `GET /recruitment/replacements` (filter by foundation / status)
  - `GET /recruitment/replacements/:id`
  - `PATCH /recruitment/replacements/:id` (status, filledByUserId)
  - `GET /recruitment/replacements/:id/matching-candidates`
  - `GET /recruitment/replacements/matching-for-me` (EDUCATOR)
- `settings.controller`: educator replacement-availability toggle endpoints.
- `admin/staffing/alerts` endpoint.

### Phase 3 — Foundation UI remodel [~5 days]
- `FoundationDashboardPage` — staffing-led layout (§5.1). Absorbs FOUNDATION_PAGES_REBUILD_PLAN Phase 1 mock-data removal.
- `/staffing` route tree: Jobs / Candidates / Replacements / Applications as tabs inside a shared shell.
- New `FoundationReplacementsPage` (list + new request form + detail).
- Role-aware Sidebar: show staffing tree for FOUNDATION role.

### Phase 4 — Admin UI remodel [~4 days]
- `admin/src/pages/Dashboard.tsx` — rebuild content (§5.5); keep existing count cards "below the fold".
- New pages: `StaffingOverview.tsx`, `Replacements.tsx` (admin), `StaffingAlerts.tsx`.
- `useNotificationData.ts` + `Header.tsx` — add `staffing` category to bell dropdown and sidebar badges.
- `Sidebar.tsx` — finalize nav order, group into sections.

### Phase 5 — Educator supply-side [~2 days]
- `EducatorProfilePage` — replacement-availability section.
- `EducatorDashboardPage` — `Urgent roles near you` panel.
- i18n keys added to `recruitment` and `dashboard` namespaces (fr/en/de).

### Phase 6 — Polish & metrics [~2 days]
- Admin-side success metrics widget (§8).
- End-to-end smoke: post replacement → candidate receives email → candidate applies → foundation marks filled → both get confirmation.
- Remove dead mock-data imports flagged in FOUNDATION_PAGES_REBUILD_PLAN.md.

**Estimated total: ~20 working days.** No phase requires freezing live traffic; each migration is additive.

---

## 8. Success Metrics (instrumented in Phase 6)

- Time to post a job (click "Post a job" → job published).
- Time to first candidate (job published → first application).
- Time to fill (job published → application accepted).
- Replacement fill-time SLA (request created → filled).
- Candidate profile completion rate.
- Application rate per job.
- Active candidates with `candidatePoolVisible=true` AND `availableForReplacement=true`.

Surface in admin `StaffingOverview` as a 4-tile strip.

---

## 9. What We Deliberately Will Not Build

- Generic HR management (timesheets, payroll, leave requests).
- Full onboarding pipelines / candidate DAGs.
- Heavy marketplace features (supplier storefronts, PIM).
- Deep automation / AI ranking beyond the linear scoring in §5.4.
- Reporting dashboards beyond the 4 staffing KPIs.
- Parent / Supplier / Provider dashboard changes of any kind.
- Any new standalone module that doesn't answer one of: "hiring speed, candidate visibility, replacement pressure, operator simplicity".

---

## 10. Risk Register

| Risk | Mitigation |
|---|---|
| Migration on live DB | All additive, defaults safe. Run in maintenance window, but not required. |
| Email throttling on candidate-match blast | Batch via existing `ScheduledEmail` + cron; cap 50/run. |
| Sidebar reorder confuses existing users | Add one-time info banner in-app for 7 days. |
| Foundation users rely on current dashboard widgets | Keep count cards reachable "below the fold" in Phase 4. |
| i18n regressions | Add new keys only; never rename existing keys; fr/en/de in every new key. |
| Parent/Supplier/Provider touched by mistake | Lint rule / codeowners on their route folders; reviewer checklist. |

---

## 11. Open Questions (flag before Phase 1 kickoff)

1. Should `urgent_replacement_request` notify ALL replacement-available educators in the canton, or only those with 100% overlap on date window? (Proposal: overlap + cities, fall back to canton if <3 matches.)
2. Do we want a weekly digest of stale applications for admins, or only the real-time bell? (Proposal: both; digest opt-in via preferences.)
3. Should `ReplacementRequest` auto-expire when `endAt` passes? (Proposal: cron sets `EXPIRED` nightly.)
4. Is the admin permitted to `Mark as filled` on behalf of a foundation? (Proposal: yes, with audit reason like ElevateToAdmin.)

None of these block the plan; all are Phase 2/3 decisions.

---

## 12. Acceptance Criteria (per phase)

- **Phase 1:** Migration applied on staging with zero row change in existing tables; nav reorder visible; no feature regressions.
- **Phase 2:** Unit tests for scoring; integration test for `ReplacementRequest` CRUD; email template records exist in DB.
- **Phase 3:** Foundation user can post a replacement request end-to-end; mock data gone from dashboard; all existing routes still reachable.
- **Phase 4:** Admin Dashboard renders staffing overview at the top; count cards preserved below; bell dropdown shows staffing alerts.
- **Phase 5:** Educator can toggle replacement availability; matching-for-me endpoint returns ranked results; panel visible on dashboard.
- **Phase 6:** All 4 success metrics populated; e2e smoke passes in fr/en/de.
