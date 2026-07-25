# Gap Analysis — v2 strategy vs. current code

Filter: only gaps that affect the staffing-first pivot. Peripheral module stubs are noted in `01-current-state-inventory.md`.

## A. Replacement staffing (Priority 3 in the brief)

| Requirement (brief) | Reality today | Gap size |
|---|---|---|
| Directors must be able to signal urgent needs | Only by creating a `JobListing` with `contractType = REPLACEMENT`. No urgency flag, no SLA, no shift window. | **Build**: dedicated `ReplacementRequest` entity + workflow. |
| Candidates matched quickly | `findMatchingCandidates` is a stub (pool-visible educators minus applicants). | **Refactor to real match**: skills + region + availability scoring. |
| Dynamic availability | `availabilitySettings` JSON exists; matching doesn't use it. Educator UI exists; admin form doesn't. | **Integrate + consolidate**. |
| Immediate-operational-support feel | No UI for it. Replacement is hidden behind the generic `RecruitmentPage`. | **Build**: dedicated "Find replacement staff" screen in foundation dashboard + admin alert rail. |

## B. Staffing core (Priority 1)

| Requirement | Reality | Gap |
|---|---|---|
| "Post a job" fast and simple | `JobPostModal` in `RecruitmentPage.tsx`. Functional. | **Refactor** into action-first framing; simplify fields, surface defaults, expose from dashboard home. |
| "Find candidates" easy | `candidate-pool` tab; `localStorage` favourites only. | **Refactor**: persist shortlist (`SavedCandidate`), saved-searches, better filters. |
| "Fill a position" clear | Application list has no status pipeline UI, no cover-letter drill-in, no message-from-list. Educator detail button is `alert()`. | **Build** pipeline modal (stages: new / reviewing / shortlisted / interview / offer / hired / rejected). |
| Hiring flow not complex | Reasonable; remove friction, not add. | Light refactor. |

## C. Candidate side (Priority 2)

| Requirement | Reality | Gap |
|---|---|---|
| Structured, fast profile | `EducatorProfilePage` + related tables in Prisma. Real API. | Keep, light polish. |
| Easy discovery | Candidate pool page exists. Matching is naive. | **Refactor** matching service. |
| Clearly-defined availability | Designed, partially implemented. | **Finish** per `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`. |
| Replacement availability visible | Not differentiated from general availability. | **Add** "available for replacement" flag + filter, or reuse availability slots tagged as short-notice. |

## D. Admin dashboard

| Requirement | Reality | Gap |
|---|---|---|
| All roles' features stay, staffing on top | True for functionality; false for IA (sidebar is flat, no staffing hero). | **Restructure** admin homepage + sidebar order. |
| Staffing-focused alerts (urgent replacements, applications to review, low-pool) | Admin Dashboard has a generic stats grid + crawler card. No alert concept. | **Build**: `StaffingSignals` service aggregating urgent state; expose on admin home + in-app notification feed. |
| Default admin landing is staffing-centric | Currently `/admin/content-dashboard` per `App.tsx:168`. | **Fix**: redirect to admin SPA home; keep user-facing content dashboard as a separate tool. |
| Users page remains second | Sidebar order is `dashboard, users, foundations, partners, products, …` — already close. | **Reorder** remaining entries around staffing. |

## E. Email & notifications

| Requirement | Reality | Gap |
|---|---|---|
| Candidate-matching emails on new job post | No recruitment email sites exist. | **Build**: new event `job_match`; fan-out to matching educators on job publish. |
| Daycare emails on new application | Same. | **Build**: event `new_application`; to foundation members. |
| Application status change emails to candidate | Same. | **Build**: event `application_status_update`. |
| Replacement-specific urgency comms | Same. | **Build**: events `replacement_requested_match` + `replacement_confirmed`. |
| In-app notifications | Purely in-memory (`NotificationContext`) | **Build**: `Notification` Prisma model + service + socket push (extend `/messaging` gateway or introduce `/notifications`). |

## F. Foundation dashboard homepage (new Overview)

| Element | Exists? | Gap |
|---|---|---|
| Staffing snapshot (open positions, applications awaiting review, urgent replacements) | Partial KPIs via `foundationDashboardService`, but not staffing-oriented. | **Refactor** to staffing-first overview with three primary widgets + secondary panels. |
| Quick actions (Post job, Find replacement staff, Find candidates) | One "Post job" action link. | **Add**. |
| Secondary panels (parent enquiries, HR alerts, supplier offers) | Scattered across nav. | **Reorganise** under fold. |

## G. Navigation / IA

| Target (brief) | Current | Gap |
|---|---|---|
| Overview → Staffing → HR & Compliance → Parent Enquiries → Suppliers & Services | For FOUNDATION: Dashboard → Marketplace → Orders → Parent leads → Recruitment → HR → E-learning → State policies → Analytics → Messages → Org profile → Support. Order does not match. | **Reorder** + **rename** to action-based labels. Group `recruitment` children under "Staffing" top entry. |
| Admin: Overview → Users → Staffing stack → Other role features → Support | Current admin order is close for first three but splits staffing (`jobListings`, `candidatePool` separate). | **Group under "Staffing"** parent nav with sub-items. |
| Action-based labels ("Post a job", "Find replacement staff") | Current labels are module-named ("Recruitment", "Candidate pool"). | **Rename** sub-items. |

## H. Minor fixes blocking a clean remodel

- `App.tsx:168` admin redirect target.
- `MainLayout.tsx` `useTranslation` mis-placement.
- `Candidates.tsx` dead Delete button.
- Admin `AddJobListingModal` field parity with foundation modal.
- `EducatorJobBoardPage` contract-type filter.
- `JobListings.tsx` missing `FILLED` status filter.
- Duplicate `UpdateJobApplicationDto` in `create-job-application.dto.ts` and `update-job-application.dto.ts`.
- `recruitment.controller.ts` missing `@Roles` on 2 endpoints.
