# Staffing-Centric Remodel — Phased Implementation Tracker

> **Plan source:** `STAFFING_REMODEL_PLAN.md` + `REMODEL_NOTES.md`
> **Working branch:** `claude/prepare-dashboard-remodel-7OHe5`
> **Legend:** ✅ Done · 🔄 In progress · ⬜ Pending

---

## Phase 1 — IA + Bug Sweep `[low risk, high signal]`

**Goal:** Reorder sidebars, add `/staffing` alias, fix 11 confirmed bugs. Zero behavior change to recruitment flows.

### 1A — Feature flag setup
| Status | Task | File |
|---|---|---|
| ⬜ | Add `v2_staffing_ia` feature flag (default off) | `api/prisma/seed.ts` — `FeatureFlag` upserts |
| ⬜ | Read flag in Foundation sidebar (conditional nav order) | `frontend/components/layout/Sidebar.tsx` |

### 1B — Admin sidebar reorder (flat → grouped)
Current flat navigation in `admin/src/components/Sidebar.tsx:36–54`. Target order from plan §2:

| Status | Target position | Item | Current href |
|---|---|---|---|
| ⬜ | 1 | Overview | `/dashboard` |
| ⬜ | 2 | Users | `/users` |
| ⬜ | 3–6 | **Staffing** (group: Job listings, Candidates, Applications†, Replacements†) | `/job-listings`, `/candidates` |
| ⬜ | 7 | **HR & Compliance** (group: Content, Policy crawler) | `/content`, `/policy-crawler` |
| ⬜ | 8 | Parent Enquiries | `/parent-leads` |
| ⬜ | 9–11 | **Suppliers & Services** (group: Organizations, Partners, Products, Services, Orders) | existing |
| ⬜ | 12+ | **Platform Ops** (group: Messaging, Subscriptions, Mailing, Support, Discount, Settings) | existing |

†Applications and Replacements pages are new — added in Phases 2 and 3. Add disabled/hidden entries now with a flag guard so the group shape is correct.

Implementation notes:
- Admin sidebar currently has **no collapsible groups** — this is a new pattern. Add a `NavGroup` sub-component inside `admin/src/components/Sidebar.tsx`.
- i18n keys needed in `packages/translations/locales/{fr,en,de}/admin.json`: `sidebar.staffing`, `sidebar.hrCompliance`, `sidebar.suppliersServices`, `sidebar.platformOps`.

### 1C — Foundation sidebar reorder
Current items in `frontend/components/layout/Sidebar.tsx:62–101`. Target order from plan §2:

| Status | Position | NavItem path | nameKey |
|---|---|---|---|
| ⬜ | 1 | `/foundation/dashboard` | `sidebar.dashboard` |
| ⬜ | 2–5 | **Staffing** group: `/staffing/jobs`, `/staffing/candidates`, `/staffing/replacements`†, `/staffing/applications`† | new keys |
| ⬜ | 6–8 | HR & Compliance: `/hr-procedures`, `/state-policies`, `/e-learning` | existing |
| ⬜ | 9 | Parent Enquiries: `/foundation/leads` | existing |
| ⬜ | 10–11 | Suppliers & Services: `/marketplace/products`, `/marketplace/services` | existing |
| ⬜ | 12+ | Utility (bottom): orders, analytics, messages, org profile, support | existing |

†Replacements and Applications routes hidden behind `v2_replacement_module` flag (Phase 3).

New i18n keys needed: `sidebar.staffing`, `sidebar.postJob`, `sidebar.findCandidates`, `sidebar.findReplacements`, `sidebar.reviewApplications`.

### 1D — Route alias `/staffing` → `/recruitment`
| Status | Task | File |
|---|---|---|
| ⬜ | Register `/staffing/jobs` and `/staffing/candidates` as aliases for existing `/recruitment/*` routes | `frontend/App.tsx` — duplicate `<Route>` entries pointing to same page components |
| ⬜ | Both old and new URLs work during transition (no redirects until Phase 7) | |

### 1E — Bug fixes (all confirmed during audit)

| Status | # | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| ⬜ | 1 | `frontend/App.tsx` | 168 | Admin redirect → `/admin/content-dashboard` | Change `Navigate to` to `/users` (admin SPA) or admin home |
| ⬜ | 2 | `frontend/components/layout/MainLayout.tsx` | 17 | `useTranslation` called inside callback | Lift `const { t } = useTranslation(...)` to component body |
| ⬜ | 3 | `admin/src/pages/Candidates.tsx` | ~406 | Delete menu item missing `onClick` | Wire to a `handleDeleteCandidate` handler or remove the item |
| ⬜ | 4 | `admin/src/components/AddJobListingModal.tsx` | — | Missing `employmentType`, `workSchedule`, `startDate`, `salaryRange` fields | Add fields to match foundation `JobPostModal` |
| ⬜ | 5 | `admin/src/pages/JobListings.tsx` | 166–169 | Status filter missing `FILLED` option | Add `<option value="FILLED">` |
| ⬜ | 6 | `frontend/pages/educator/EducatorJobBoardPage.tsx` | 93 | `contractTypes` array missing `REPLACEMENT`, `TEMPORARY`, `FREELANCE` | Add 3 values |
| ⬜ | 7 | `frontend/pages/educator/EducatorApplicationsPage.tsx` | 55 | `alert()` stub on "View details" | Replace with a detail modal component |
| ⬜ | 8 | `api/src/recruitment/recruitment.controller.ts` | 121, 161 | Missing `@Roles` on `GET /applications` and `GET /applications/:id` | Add `@Roles(...)` decorators |
| ⬜ | 9 | `api/src/recruitment/` (DTOs) | — | Duplicate `UpdateJobApplicationDto` in both `create-job-application.dto.ts` and unused `update-job-application.dto.ts` | Delete unused file; import canonical DTO everywhere |
| ⬜ | 10 | `admin/src/pages/Messaging.tsx` | — | `unreadCount` hard-coded to `0` | Compute from real API / websocket |
| ⬜ | 11 | `api/src/recruitment/recruitment.service.ts` | — | `findMatchingCandidates` stub returns entire pool | Deferred to Phase 2 (scorer rewrite) |
| ⬜ | 12 | Various | — | `picsum.photos` placeholder avatars | Replace with initials-avatar component (Phase 2) |

### 1F — Seed missing billing templates
| Status | Task | File |
|---|---|---|
| ⬜ | Add `payment_reminder` template | `api/prisma/seed.ts` and `api/src/email-notification/email-template.service.ts#getStarterTemplates` |
| ⬜ | Add `subscription_payment_failed` template | Same |

### Phase 1 acceptance criteria
- Migration dry-run on staging: zero existing-row changes.
- Nav reorder visible behind `v2_staffing_ia` flag; old `/recruitment/*` URLs still work.
- All 11 bugs cleared.
- Smoke tests: PARENT / EDUCATOR / PRODUCT_SUPPLIER / SERVICE_PROVIDER sidebars unchanged.

---

## Phase 2 — Backend Wiring + Matching + Pipeline

**Goal:** Real candidate scoring, application pipeline stages, foundation shortlists persisted.

### 2A — Schema: extend `ApplicationStatus` enum
| Status | Task | File |
|---|---|---|
| ⬜ | Add `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED` to `ApplicationStatus` | `api/prisma/schema.prisma` |
| ⬜ | Generate migration `v2_application_pipeline_stages` | `api/prisma/migrations/` |
| ⬜ | Existing `ACCEPTED` rows render same as `HIRED` in UI for one release | Frontend status display components |

### 2B — Candidate scoring (`recruitment.service.ts`)
Scoring formula from plan §5.5:
```
score = (roleMatch ? 40 : 0) + (cityOverlap ? 25 : 0) + (skillsIntersection * 15, clamped) + (availabilityOverlap ? 15 : 0) + (recentActivityBonus up to 5)
```
| Status | Task | File |
|---|---|---|
| ⬜ | Rewrite `findMatchingCandidates` with weighted scorer | `api/src/recruitment/recruitment.service.ts` |
| ⬜ | Return `{ candidate, score, reasons[] }` sorted descending | Same |
| ⬜ | Unit tests for scorer | `api/src/recruitment/recruitment.service.spec.ts` |

### 2C — Email call sites (wired but templated — no send yet)
| Status | Task | File |
|---|---|---|
| ⬜ | Seed templates: `new_application`, `application_status_update`, `job_match` | `api/prisma/seed.ts` + `email-template.service.ts` |
| ⬜ | Call `sendNotification('new_application')` in `createJobApplication` | `api/src/recruitment/recruitment.service.ts` |
| ⬜ | Call `sendNotification('application_status_update')` in `updateJobApplication` (status change) | Same |
| ⬜ | Call `sendNotification('job_match')` on `DRAFT → PUBLISHED` transition (capped by `STAFFING_MATCH_EMAIL_LIMIT` env, default 20) | Same |

### 2D — Application review UI
| Status | Task | File |
|---|---|---|
| ⬜ | Replace `ViewApplicantsModal` with two-pane review screen | `frontend/pages/foundation/RecruitmentPage.tsx` (or new `StaffingApplicationsPage.tsx`) |
| ⬜ | Pipeline-stage dropdown using new statuses | Same |
| ⬜ | Add `/staffing/applications` route | `frontend/App.tsx` |

### 2E — Foundation shortlist persistence
| Status | Task | File |
|---|---|---|
| ⬜ | Store shortlist in `Organization.savedCandidateIds` JSON (no new table) | `api/src/recruitment/recruitment.service.ts` + controller |
| ⬜ | One-shot localStorage migration on first load | `frontend/pages/foundation/RecruitmentPage.tsx` or `useEffect` hook |

### 2F — Field parity
| Status | Task | File |
|---|---|---|
| ⬜ | Add missing fields to `admin/src/components/AddJobListingModal.tsx` (bug 4 from Phase 1) | Same file |
| ⬜ | Replace `picsum.photos` placeholders with initials-avatar | Various files |

### Phase 2 acceptance criteria
- Unit tests pass for scorer.
- Integration test: foundation shortlists a candidate end-to-end.
- Email templates seeded (confirmed in `EmailTemplate` table on staging).

---

## Phase 3 — Replacement Staffing (First-Class Feature)

**Goal:** `ReplacementRequest` + `ReplacementMatch` tables, full UI flow, educator availability.

### 3A — Schema: new tables
| Status | Task | File |
|---|---|---|
| ⬜ | Add `ReplacementRequest` model + enums (`ReplacementUrgency`, `ReplacementStatus`) | `api/prisma/schema.prisma` |
| ⬜ | Add `ReplacementMatch` model + `ReplacementMatchStatus` enum | Same |
| ⬜ | Generate migrations `v2_replacement_request`, `v2_replacement_match` | `api/prisma/migrations/` |

### 3B — API endpoints (inside `recruitment.controller.ts` — no new module)
| Status | Endpoint | Notes |
|---|---|---|
| ⬜ | `POST /recruitment/replacements` | Create `ReplacementRequest`; auto-suggest matches |
| ⬜ | `GET /recruitment/replacements` | List with status/urgency filters (FOUNDATION-scoped) |
| ⬜ | `GET /recruitment/replacements/:id` | Detail with matches |
| ⬜ | `PATCH /recruitment/replacements/:id` | Update status/fields |
| ⬜ | `POST /recruitment/replacements/:id/offer/:candidateId` | Set match `OFFERED`, fire email |
| ⬜ | `POST /recruitment/replacements/:id/accept` | Educator accepts; set match `ACCEPTED`, fire email |
| ⬜ | `POST /recruitment/replacements/:id/confirm/:candidateId` | Foundation confirms; request `FULFILLED`, fire email |
| ⬜ | `GET /recruitment/replacements/matching-for-me` | EDUCATOR — returns matching open requests |

### 3C — Educator: replacement availability
| Status | Task | File |
|---|---|---|
| ⬜ | Add `isOpenToReplacement`, `replacementFrom`, `replacementTo`, `replacementRadiusKm` keys to `availabilitySettings` JSON (DTO-validated) | `api/src/settings/dto/educator-settings.dto.ts` |
| ⬜ | Expose toggle in educator profile Availability section | `frontend/pages/educator/EducatorProfilePage.tsx` |
| ⬜ | "Replacement opportunities" panel on educator dashboard | `frontend/pages/educator/EducatorDashboardPage.tsx` |
| ⬜ | "Replacement offers" tab on applications page | `frontend/pages/educator/EducatorApplicationsPage.tsx` |

### 3D — Foundation: Replacements page
| Status | Task | File |
|---|---|---|
| ⬜ | `FoundationReplacementsPage` with tabs: Open / Matched / Confirmed / Fulfilled | New file: `frontend/pages/foundation/FoundationReplacementsPage.tsx` |
| ⬜ | New request form (role, start/end, urgency, cities, notes) | Same or modal |
| ⬜ | Matches table with score, "Offer" action | Same |
| ⬜ | Register `/staffing/replacements` route | `frontend/App.tsx` |

### 3E — Admin: Replacements page
| Status | Task | File |
|---|---|---|
| ⬜ | Cross-foundation replacements list with urgency/SLA filters | New file: `admin/src/pages/Replacements.tsx` |
| ⬜ | Override "mark fulfilled" with audit reason | Same |
| ⬜ | CSV export | Same |
| ⬜ | Register route in admin `App.tsx` | `admin/src/App.tsx` |
| ⬜ | Add Replacements to admin sidebar (inside Staffing group) | `admin/src/components/Sidebar.tsx` |

### 3F — Feature flag
| Status | Task | File |
|---|---|---|
| ⬜ | Gate all replacement UI behind `v2_replacement_module` flag | Frontend route guards + sidebar |

### Phase 3 acceptance criteria
Full round-trip: Foundation posts request → educator receives email → educator accepts → foundation confirms → both sides receive confirmation emails. Admin sees cross-foundation list.

---

## Phase 4 — Emails + In-App Notifications

**Goal:** All 7 staffing email templates firing, `Notification` table, live bell feed.

### 4A — Schema: `Notification` table
| Status | Task | File |
|---|---|---|
| ⬜ | Add `Notification` model | `api/prisma/schema.prisma` |
| ⬜ | Generate migration `v2_notification` | `api/prisma/migrations/` |

### 4B — Notifications module (NestJS)
| Status | Task | File |
|---|---|---|
| ⬜ | `notifications.module.ts`, `notifications.service.ts`, `notifications.controller.ts` | `api/src/notifications/` |
| ⬜ | REST: `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count` | Same controller |
| ⬜ | Internal `createNotification()` called alongside every `sendNotification()` site | `notifications.service.ts` |
| ⬜ | Socket push: emit `notification.created` via existing `messaging.gateway.ts` | `api/src/messaging/messaging.gateway.ts` |

### 4C — Seed remaining templates
| Status | Template | Trigger |
|---|---|---|
| ⬜ | `replacement_request_open` | `createReplacementRequest` → fan-out to educators with `isOpenToReplacement=true` |
| ⬜ | `replacement_matched` | `ReplacementMatch.status → ACCEPTED` |
| ⬜ | `replacement_confirmed` | `confirmReplacement` — both educator and foundation |
| ⬜ | `low_candidate_pool` | Nightly cron `0 7 * * *` → admin digest |

### 4D — Bug fix: `sendBulkNotification` ignores `scheduledAt`
| Status | Task | File |
|---|---|---|
| ⬜ | Delegate to `scheduleNotification` when future date given | `api/src/email-notification/email-notification.service.ts` |

### 4E — Frontend: `NotificationContext` rewrite
| Status | Task | File |
|---|---|---|
| ⬜ | Fetch on mount from `/notifications` | `frontend/providers/NotificationContext.tsx` or equivalent |
| ⬜ | Subscribe to `notification.created` via socket | Same |
| ⬜ | Expose `markRead(id)`, `markAllRead()` | Same |
| ⬜ | Bell badge count from `/notifications/unread-count` | Same |
| ⬜ | Transient toasts remain as a layer on top | Same |
| ⬜ | `useNotificationData` in admin pulls from `Notification` rows | `admin/src/hooks/useNotificationData.ts` |

### 4F — Feature flags
| Status | Flag | Default |
|---|---|---|
| ⬜ | `v2_staffing_emails` — gates all new email events | off |
| ⬜ | `v2_in_app_notifications` — gates new Notification feed | off |

### Phase 4 acceptance criteria
All 7 templates fire in production with `EmailLog` evidence. Bell badge count live. Feed persists across page reload.

---

## Phase 5 — Foundation Dashboard Homepage

**Goal:** Replace mock-heavy `FoundationDashboardPage` with staffing-led layout. Non-core role dashboards untouched.

### Tasks
| Status | Task | File |
|---|---|---|
| ⬜ | Top KPI cards: Open positions, Applications awaiting review, Open replacement requests | `frontend/pages/foundation/FoundationDashboardPage.tsx` |
| ⬜ | Primary action row: Post a job, Find replacement staff, Find candidates, Review applications | Same |
| ⬜ | Below fold: recent activity, calendar, quick message, collapsed secondary panels | Same |
| ⬜ | Remove mock data (fold FOUNDATION_PAGES_REBUILD_PLAN Phase 1 backlog) | Same + related pages |
| ⬜ | Create `foundationStaffingOverviewService` combining existing dashboard + staffing counts | `api/src/foundation/` |
| ⬜ | Smoke test: PARENT/EDUCATOR/SUPPLIER/PROVIDER dashboards byte-identical to pre-remodel | QA checklist |

### Phase 5 acceptance criteria
Foundation dashboard renders staffing-led layout; mock data removed; non-core dashboards pass smoke test in fr/en/de.

---

## Phase 6 — Admin Dashboard + Parity

**Goal:** Admin `Dashboard.tsx` leads with staffing signals; count cards preserved below the fold.

### Tasks
| Status | Task | File |
|---|---|---|
| ⬜ | 4 Staffing signal cards: Urgent replacement requests, Applications awaiting review >48h, Low-pool regions, Zero-match jobs >24h | `admin/src/pages/Dashboard.tsx` |
| ⬜ | `GET /admin/staffing/signals` endpoint (inside existing admin controller, no new module) | `api/src/admin/admin.controller.ts` or equivalent |
| ⬜ | Existing count cards moved below the fold | `admin/src/pages/Dashboard.tsx` |
| ⬜ | Admin bell dropdown: `jobRecruitment` category shown first | `admin/src/components/Header.tsx` |
| ⬜ | Admin email preferences expose `jobRecruitment` category | `admin/src/pages/EmailNotificationPage.tsx` |

### Phase 6 acceptance criteria
Admin dashboard renders signals on top; existing count cards preserved; bell first category is staffing.

---

## Phase 7 — Measurement & Cleanup

**Goal:** KPI metrics, retire legacy routes, final smoke test fr/en/de.

### Tasks
| Status | Task | File |
|---|---|---|
| ⬜ | KPI widgets: time-to-first-candidate, time-to-hire, replacement fulfilment speed, candidate-pool growth | `admin/src/pages/Dashboard.tsx` |
| ⬜ | Server-side 301 redirects: `/recruitment/*` → `/staffing/*` | NestJS or reverse-proxy config |
| ⬜ | Drop "Recruitment" from user-facing nav labels (keep in API module name) | i18n translation files |
| ⬜ | Update `CLAUDE.md` with v2 context summary | `CLAUDE.md` |
| ⬜ | Final e2e smoke: fr/en/de, all role dashboards, all new flows | QA |

---

## Cross-Phase Decisions (decide before/during implementation — none block Phase 1)

| # | Question | Default in plan |
|---|---|---|
| 1 | Admin default landing after bug fix (Phase 1) | `/users/all` or admin SPA root |
| 2 | Notification socket channel | Reuse `messaging.gateway` (extract to `/notifications` namespace if QPS warrants later) |
| 3 | `STAFFING_MATCH_EMAIL_LIMIT` default | 20 |
| 4 | Subscription entitlements for replacement | Same gate as existing recruitment |
| 5 | `User.availability: String?` legacy field | Keep both until Phase 7 decision |
| 6 | Admin in-app notification feed | Admins receive too (same `Notification` table, `userId`-scoped) |
| 7 | Auto-expire `ReplacementRequest` after `endAt` | Add cron in Phase 3 |
| 8 | `RecruitmentPage.tsx` split | Keep as-is mounted at new routes (no split) |

---

## i18n Keys Required (new — never rename existing keys)

All keys must exist in `fr`, `en`, `de` before the PR merges that introduces them.

### `frontend` — `dashboard` or `recruitment` namespace
```
sidebar.staffing
sidebar.postJob
sidebar.findCandidates
sidebar.findReplacements
sidebar.reviewApplications
sidebar.hrCompliance          (foundation grouping)
```

### `admin` — `admin` namespace
```
sidebar.staffing
sidebar.hrCompliance
sidebar.suppliersServices
sidebar.platformOps
sidebar.replacements
sidebar.applications
jobListings.statusFilter.filled
```

---

## Per-Role Smoke Test Checklist (run before each phase merge)

- [ ] PARENT: sidebar and dashboard identical to pre-remodel
- [ ] EDUCATOR: sidebar identical to pre-remodel (Phase 1); replacement panel added (Phase 3)
- [ ] PRODUCT_SUPPLIER: sidebar identical to pre-remodel
- [ ] SERVICE_PROVIDER: sidebar identical to pre-remodel
- [ ] FOUNDATION: sidebar order matches target; `/recruitment/*` URLs still resolve
- [ ] ADMIN/SUPER_ADMIN: sidebar order matches target; admin SPA loads correctly; all pages reachable
- [ ] Prisma migration dry-run on staging DB copy before each schema phase
