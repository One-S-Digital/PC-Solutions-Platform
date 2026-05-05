# PC Solutions Platform — Staffing-Centric Remodel: Investigation Notes

> **Purpose:** Persistent record of the codebase investigation done on 2026-04-22 for the v2 staffing-focused remodel. Read this first before re-analyzing anything below. Update this file as new findings are made; do not redo the same exploration.
>
> **Scope of remodel:** Admin dashboard + Foundation (daycare) dashboard only. Parent / Supplier / Service Provider dashboards are out of scope and must remain untouched. Live data must be preserved.

---

## 1. Branch & Docs Hygiene

- Working branch: `claude/plan-dashboard-remodel-DCWWE`
- Project docs to **reuse**:
  - `FOUNDATION_PAGES_REBUILD_PLAN.md` — mock-data replacement plan (still partially open)
  - `ADMIN_GUIDE.md` — current admin nav & page purposes
  - `ADMIN_MOCK_DATA_ANALYSIS.md` — admin mock data status (mostly resolved; Dashboard uses `/admin/analytics/overview`)
  - `COMPLETE_PROFILE_PAGES_ANALYSIS.md` / `FRONTEND_FACING_PROFILE_IMPLEMENTATION_ANALYSIS.md` — profile routing gaps
  - `docs/ROLE_SYSTEM_OVERHAUL.md` + `docs/_inventory/ROLES_AND_PERMISSIONS.md` — role truth source (Postgres)
  - `docs/ADMIN_DIRECT_USER_CREATION_PLAN.md` — direct educator creation by admin
  - `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md` — availability schema design
  - `docs/email-notification-system-guide.md` — email framework
- Project docs that are **stale / complete** (do not cite as current state):
  - `BROWSER_COMPATIBILITY_*` (×7), `SENTRY_*` (×4), `BUILD_*`, `RENDER_*`, `PRISMA_MIGRATION_BUILD_FIX`, `FIX_SUMMARY*`, `FINAL_SUMMARY_ALL_FIXES`, `CODERABBIT_REVIEW_FIXES`, `PRICING_PAGE_*`, `SUBSCRIPTION_*`.

---

## 2. Current Admin Dashboard (`/admin`)

### Entry & routing
- `admin/src/App.tsx` — routes for 18 pages, Clerk-gated via `AdminProtectedRoute` + `AdminLayout`.

### Sidebar (`admin/src/components/Sidebar.tsx`, nav items lines 36–55)
Current order (18 items):
1. Dashboard → `/dashboard`
2. Users → `/users`
3. Foundations → `/organizations`
4. Partners → `/partners`
5. Products → `/products`
6. Services → `/services`
7. Job Listings → `/job-listings`
8. Candidate Pool → `/candidates`
9. Parent Leads → `/parent-leads`
10. Orders/Appointments → `/orders`
11. Content → `/content`
12. Messages → `/messaging`
13. Support → `/support`
14. Discount Terminations → `/discount-terminations`
15. Subscriptions → `/subscriptions`
16. Mailing → `/mailing`
17. Policy Crawler → `/policy-crawler`
18. Settings → `/settings`

### Pages (admin/src/pages) — 36 files, key ones
| File | Purpose |
|---|---|
| `Dashboard.tsx` (550 LOC) | 10 generic count cards (users, orgs, products, parent leads, jobs, applications, e-learning, HR docs, policies) + policy crawler health + upload modals. **No staffing alerts/urgency signals today.** |
| `Users.tsx` (2027 LOC) | List + AddUserModal (3 tabs: single invite / bulk invite / direct create) + Elevate + Delete with `SUDO DELETE USER`. |
| `Organizations.tsx` (1194 LOC) | 2 tabs: foundations / organisations. |
| `JobListings.tsx` (346 LOC) | CRUD jobs, title search, status filter. |
| `Candidates.tsx` (466 LOC) | CRUD candidates, search, status filter. |
| `ParentLeads.tsx` (343 LOC) | Lead list & status. |
| `MailingList.tsx` (788 LOC) | 4 tabs: Build / Lists / Segments / Campaigns. |
| `EmailNotificationPage.tsx` (919 LOC) | Template editor (inside Settings tabs). |
| `Subscriptions.tsx` (4387 LOC) | Role-scoped subscription analytics, pause/resume/refund. |
| `SystemMonitor.tsx`, `SystemConfigurationPage.tsx`, `Translations.tsx`, `DesignSystem.tsx`, `PolicyCrawler.tsx`, `PolicyReview.tsx`, `Cantons.tsx`, `CantonDetail.tsx`, `Support.tsx`, `SupportTicket.tsx`, `Messaging.tsx`, `DiscountTerminations.tsx`, `Partners.tsx`, `Products.tsx`, `Services.tsx`, `Orders.tsx`, `Content.tsx` + 3 sub-pages |

### Shared
- `admin/src/components/Header.tsx` — notification bell (dropdown with up to 5 items per category: support/users/products/services/subscriptions), language switcher, dynamic favicon badge.
- `admin/src/hooks/useNotificationData.ts` — aggregates sidebar badge counts.
- `admin/src/services/api.ts` — axios + Clerk; `apiService.getDashboardCounts()`, `getSystemHealth()`, plus all CRUD methods.
- Real-time: `websocket.service.ts`, `useSupportSocket.ts` (support only).

---

## 3. Current Frontend Role Dashboards (`/frontend`)

### Role routing (frontend/App.tsx:151–172 `RoleBasedDashboardRedirect`)
| Role | Route |
|---|---|
| FOUNDATION | `/foundation/dashboard` |
| EDUCATOR | `/educator/dashboard` |
| PARENT | `/parent/dashboard` |
| PRODUCT_SUPPLIER | `/supplier/dashboard` |
| SERVICE_PROVIDER | `/service-provider/dashboard` |
| ADMIN / SUPER_ADMIN | `/admin/content-dashboard` |

### Foundation (REMODEL)
| Route | Page | Notes |
|---|---|---|
| `/foundation/dashboard` | `FoundationDashboardPage` | Quick stats, activity feed, quick actions — heavy mock data still (per FOUNDATION_PAGES_REBUILD_PLAN.md). |
| `/recruitment` → `/recruitment/job-listings`, `/recruitment/candidate-pool` | `RecruitmentPage` | Shared component. Tabs switch. `JobPostModal`, `ViewApplicantsModal`. |
| `/foundation/leads` | `FoundationLeadsPage` | Mock arrays. |
| `/foundation/orders-appointments` | `FoundationOrdersAppointmentsPage` | Mock data. |
| `/foundation/analytics` | `FoundationAnalyticsPage` | Placeholder charts. |
| `/foundation/organisation-profile` | `FoundationOrganisationProfilePage` | Real API. |
| `/foundation/support` | `FoundationSupportPage` | Placeholder. |
| Shared | `/marketplace/*`, `/hr-procedures`, `/state-policies`, `/e-learning`, `/messages` | |

### Educator (SUPPLY SIDE — remodel lightly)
| Route | Notes |
|---|---|
| `/educator/dashboard` | Profile-completion bar, application status counters, job recommendations. |
| `/educator/job-board` | Browse & apply; filters by location, contract type, org. |
| `/educator/profile` | Has `candidatePoolVisible` toggle. **No replacement-availability toggle yet.** |
| `/educator/applications` | Application table with status. |
| `/educator/support` | FAQ. |

### Parent / Supplier / Service Provider (UNTOUCHED)
- Parent: `/parent/dashboard`, `/parent/enquiries`, `/parent/foundations`, `/parent/support`, `/parent-lead-form` (public).
- Supplier: `/supplier/dashboard`, `/supplier/orders`, `/supplier/product-listings`, `/supplier/analytics`, profile, support.
- Service Provider: `/service-provider/dashboard`, `/service-provider/requests`, `/service-provider/service-listings`, analytics, profile, support, settings.

### Shared layout
- `frontend/components/layout/MainLayout.tsx` + `Sidebar.tsx` — Sidebar is role-aware (switches nav items per `currentUser.role`).

### i18n
- Auto-discovers namespaces from `packages/translations/locales/{lang}/{namespace}.json`.
- Languages: `fr` (default), `en`, `de`. Foundation/Educator pages use `dashboard`, `common`, `recruitment`, `profile`, `settings`.

---

## 4. Backend Recruitment State (`/api`)

### Prisma models (api/prisma/schema.prisma)
- **JobListing** (lines 847–876): title, description, requirements[], responsibilities[], qualifications[], benefits[], location, salary, salaryRange, `contractType`, `employmentType`, `workSchedule` (JSON), `status`, `publishedAt`, `startDate`, `foundationId`. Relations: `foundation`, `applications[]`.
- **JobApplication** (878–895): `jobListingId`, `candidateId`, `coverLetter`, `cvUrl`, `cvAssetId`, `status`. Unique `[jobListingId, candidateId]`.
- **User** (195–320) — candidate-relevant: `candidatePoolVisible`, `jobRole` (legacy), `jobRoles[]`, `region`, `cities[]`, `availability` (legacy), `availabilitySettings` (JSON, Calendly-style), `skills[]`, `certifications[]`, `cvUrl`, `shortBio`.
- **EducatorWorkExperience**, **EducatorEducation**, **EducatorCertification** — structured profile.
- **UserNotificationPreferences** — `jobRecruitment Boolean @default(true)` at line 1766.

### Enums
- `JobStatus`: DRAFT, PUBLISHED, CLOSED, FILLED.
- `JobContractType`: FULL_TIME, PART_TIME, CDI, CDD, INTERNSHIP, **REPLACEMENT**, TEMPORARY, FREELANCE.
- `JobEmploymentType`: FULL_TIME, PART_TIME, **REPLACEMENT**.
- `ApplicationStatus`: PENDING, REVIEWED, ACCEPTED, REJECTED.

### Role restriction (PR #571)
`api/src/settings/dto/educator-settings.dto.ts:15`:
```
ALLOWED_JOB_ROLES = ['Direction', 'EDE', 'ASE', 'Auxiliaire', 'Cleaning']
```
Enforced in educator-settings.dto, admin-profiles.controller, settings.controller.

### Recruitment module (`api/src/recruitment/`)
- `recruitment.controller.ts` (234 LOC) + `recruitment.service.ts` (758 LOC) + DTOs.
- Endpoints:
  - Jobs: `POST/GET/:id/PATCH/:id/DELETE/:id /recruitment/job-listings` (+`:id/applications`).
  - Applications: `POST /recruitment/applications`, `GET /recruitment/applications`, `GET /recruitment/applications/my`, `GET /recruitment/applications/job/:id`, `PATCH /recruitment/applications/:id`, `DELETE /recruitment/applications/:id`.
  - Candidates: `GET /recruitment/candidates` (filters: `role`, `skills`, `location`, `search`), `GET /recruitment/candidates/:id`.
  - Matching: `GET /recruitment/job-listings/:id/matching-candidates` — returns ALL active + pool-visible educators except prior applicants. **No scoring, no availability filter, no skill weighting.**
  - Stats: `GET /recruitment/stats` (ADMIN only).
- Replacement auto-map: recruitment.service.ts:36–42 — if `contractType === REPLACEMENT`, also sets `employmentType = REPLACEMENT`. No other differentiated behavior.

### Gaps (confirmed absent today)
- No `ReplacementRequest` / `UrgentRequest` / `FillRequest` model.
- No urgency / SLA fields on JobListing.
- No "available immediately" flag on User.
- No ranking/scoring on candidate matching.
- `availabilitySettings` is stored but **never** read by matching queries.
- No emails sent from recruitment.service (nothing fires on application create or status change).

---

## 5. Email Notification State

### Files
- `api/src/email-notification/email-notification.service.ts` — `sendNotification()` + category map.
- `api/src/email-notification/email-template.service.ts` — CRUD + seeds starter templates.
- `api/src/mailing/mailing-transport.service.ts` — picks active transport (SMTP → Mailgun → SendGrid).

### Seeded templates (api/prisma/seed.ts:37–217)
- `account_verification`, `password_reset`, `welcome_email`, `new_message`, `new_lead`, `parent_lead_confirmation`.

### Category map (email-notification.service.ts:354)
`jobRecruitment` → `['job_application_received', 'application_status_update', 'job_match']`.
Preference check (`shouldSendNotification`) is wired. But **no seed templates for these events and no call sites in recruitment.service.ts** — so no email currently fires on jobs/applications.

### Billing-critical templates NOT seeded (silent failure today)
- `payment_reminder` and `subscription_payment_failed` — referenced by billing flow, never inserted into `EmailTemplate`. Seed alongside the staffing remodel.

### Engine bugs caught during audit
- `email-notification.service.ts#sendBulkNotification` ignores `scheduledAt` — should delegate to `scheduleNotification` when a future date is given.

### Cron
`@Cron('0 * * * * *')` in EmailNotificationService dispatches due `ScheduledEmail` rows every minute.

---

## 6. Gap Summary → What the Remodel Must Add

| Area | Gap | Remodel action |
|---|---|---|
| Admin overview | No staffing-first signals/alerts | Replace 10 count cards with staffing-led overview; existing cards preserved below the fold |
| Admin nav order | Role-agnostic flat sidebar (no sub-items pattern) | Reorder + add collapsible parent groups (new pattern for admin sidebar) |
| Foundation overview | Heavy mock data, not action-led | Replace with action-first dashboard (Post a job / Find candidates / Find replacement / Review applications) |
| Replacement staffing | No model, no UI | Add `ReplacementRequest` + `ReplacementMatch` tables (separate state machine: SUGGESTED → OFFERED → ACCEPTED). Endpoints inside existing `recruitment.controller` — no new module. |
| Educator availability | Stored but not used | Add `isOpenToReplacement` + date window as JSON keys inside existing `availabilitySettings` (no new User columns). Use in matching. |
| Candidate matching | Returns everyone (stub) | Add weighted scoring (role 40 / city 25 / skills 15 / availability 15 / recency 5) |
| Application pipeline | Only 4 statuses, no real hiring stages | Extend `ApplicationStatus` enum: + SHORTLISTED, INTERVIEW, OFFER, HIRED |
| Foundation shortlists | localStorage only | Persist as `Organization.savedCandidateIds` JSON (no new SavedCandidate table) |
| In-app notifications | Purely transient (`NotificationContext` in-memory) | New `Notification` Prisma table; reuse `messaging.gateway` for socket push |
| Emails | Templates for recruitment events not seeded; no call sites | Seed 7 templates + wire into recruitment.service. Plus seed 2 missing billing templates while there. |
| Feature flags | None planned for rollout | 4 flags: `v2_staffing_ia`, `v2_replacement_module`, `v2_staffing_emails`, `v2_in_app_notifications` |
| Foundation pages mock data | Already documented in FOUNDATION_PAGES_REBUILD_PLAN.md | Fold same backlog into Phase 5 of this remodel |

## 6b. Bugs caught during audit (fix in Phase 1–2)

| # | File | Issue |
|---|---|---|
| 1 | `frontend/App.tsx:168` | Admin default redirect lands on `/admin/content-dashboard` (content-centric) — should land on staffing |
| 2 | `frontend/components/layout/MainLayout.tsx` | `useTranslation` called inside a callback — lift to component body |
| 3 | `admin/src/pages/Candidates.tsx` | Delete menu item has no `onClick` handler |
| 4 | `admin/src/components/AddJobListingModal.tsx` | Missing `employmentType`, `workSchedule`, `startDate`, `salaryRange` vs. foundation modal |
| 5 | `admin/src/pages/JobListings.tsx` | Status filter missing `FILLED` |
| 6 | `frontend/pages/educator/EducatorJobBoardPage.tsx` | Contract-type filter omits REPLACEMENT, TEMPORARY, FREELANCE |
| 7 | `frontend/pages/educator/EducatorApplicationsPage.tsx` | "View details" is an `alert()` stub |
| 8 | `api/src/recruitment/recruitment.controller.ts` | Missing `@Roles` on 2 endpoints (`GET applications`, `GET candidates/:id`) |
| 9 | DTOs | Duplicate `UpdateJobApplicationDto` (in both `create-job-application.dto.ts` and `update-job-application.dto.ts`) |
| 10 | `admin/src/pages/Messaging.tsx` | `unreadCount` hard-coded to `0` |
| 11 | `recruitment.service.ts#findMatchingCandidates` | Stub — replaced by §5.5 scoring in plan |
| 12 | Various | `picsum.photos` placeholder avatars throughout; replace with initials-avatar |

---

## 7. Hard Constraints (from requester)

1. Preserve all live users and data — any schema change MUST be an additive migration with backfill where needed.
2. Parent / Supplier / Service Provider dashboards stay as-is (their roles, pages, nav).
3. Admin keeps all current features — staffing just sits *on top*.
4. Reuse existing architecture (NestJS + Prisma + Clerk + React + i18n). Do not swap stacks.
5. Update this notes file before re-investigating any area.
