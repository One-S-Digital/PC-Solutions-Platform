# Current State Inventory (pre-remodel)

> **Do not re-audit the codebase if this file already answers your question.** Update it
> when things change. All file paths are repo-relative to `/workspace`.

---

## 1. Monorepo layout

| App | Path | Stack |
|---|---|---|
| User SPA | `frontend/` | React + Vite + TypeScript, Tailwind, React Router v6, Clerk, i18next |
| Admin SPA | `admin/` | Same stack, separate Vite config (dev port 5174) |
| API | `api/` | NestJS + Prisma + PostgreSQL |

Shared: `packages/`, `docs/`.

---

## 2. User roles (Prisma `User.role`)

`PARENT`, `EDUCATOR`, `FOUNDATION`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`, `ADMIN`, `SUPER_ADMIN`.

Role → primary dashboard URL (`frontend/App.tsx` `RoleBasedDashboardRedirect`, lines ~151–171):

| Role | Redirect |
|---|---|
| `PRODUCT_SUPPLIER` | `/supplier/dashboard` |
| `SERVICE_PROVIDER` | `/service-provider/dashboard` |
| `FOUNDATION` | `/foundation/dashboard` |
| `EDUCATOR` | `/educator/dashboard` |
| `PARENT` | `/parent/dashboard` |
| `ADMIN` / `SUPER_ADMIN` | `/admin/content-dashboard` *(note: bug smell — should be `/dashboard` or a true admin home; see §9)* |

---

## 3. Recruitment / staffing (the thing being elevated)

### 3.1 API — `api/src/recruitment/`

Files: `recruitment.controller.ts`, `recruitment.service.ts`, `recruitment.module.ts`, `dto/*`.
Guarded by `ClerkAuthGuard` + `RolesGuard`. Controller base path: `recruitment`.

Endpoints (abbreviated):

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `job-listings` | FOUNDATION, ADMIN, SUPER_ADMIN | `foundationId` from `req.user.organizationId`. |
| GET | `job-listings` | all auth | educators/parents/suppliers → `publishedOnly` forced. Filters: `foundationId`, `status`, `location`, `search`, `contractType`, `employmentType`, `lang`. |
| GET | `job-listings/:id` | all auth | translations applied when `lang ≠ en`. |
| PATCH / DELETE | `job-listings/:id` | FOUNDATION (own org), ADMIN, SUPER_ADMIN | |
| GET | `job-listings/:id/applications` | FOUNDATION (own org), ADMIN, SUPER_ADMIN | |
| POST | `applications` | EDUCATOR, ADMIN, SUPER_ADMIN | `candidateId = req.user.id`. |
| GET | `applications` | all auth (no `@Roles`) | **Audit**: missing role gate. |
| GET | `applications/my` | EDUCATOR, ADMIN, SUPER_ADMIN | |
| GET | `applications/job/:id` | FOUNDATION (own org), ADMIN, SUPER_ADMIN | |
| GET | `applications/:id` | all auth | |
| PATCH | `applications/:id` | FOUNDATION, ADMIN, SUPER_ADMIN | Status transitions. |
| DELETE | `applications/:id` | EDUCATOR, ADMIN, SUPER_ADMIN | |
| GET | `candidates` | FOUNDATION, ADMIN, SUPER_ADMIN | Filters: `role`, `skills` (csv), `location`, `search`. Admins see opted-out educators. |
| GET | `candidates/:id` | all auth (no `@Roles`) | Non-admins only if `candidatePoolVisible=true`. **Audit**. |
| GET | `job-listings/:id/matching-candidates` | FOUNDATION, ADMIN, SUPER_ADMIN | Stub: returns all pool-visible educators minus those who already applied. No skill / region / availability scoring. |
| GET | `stats` | ADMIN, SUPER_ADMIN | Aggregate counts. |

**No email side effects** in any recruitment endpoint.

### 3.2 Prisma (`api/prisma/schema.prisma`)

Dedicated recruitment models:

- `JobListing` — `title`, `description`, `requirements[]`, `benefits[]`, `responsibilities[]`, `qualifications[]`, `location`, `salary`, `salaryRange`, `contractType` (enum), `employmentType` (enum), `workSchedule` (`Json?`), `startDate`, `status` (`DRAFT|PUBLISHED|CLOSED|FILLED`), `foundationId`, `publishedAt`. Relation: `applications[]`.
- `JobApplication` — `jobListingId`, `candidateId (User.id)`, `coverLetter`, `cvUrl`, `cvAssetId`, `status` (`PENDING|REVIEWED|ACCEPTED|REJECTED`). Unique `(jobListingId, candidateId)`.

Enums: `JobStatus`, `JobContractType {FULL_TIME, PART_TIME, CDI, CDD, INTERNSHIP, REPLACEMENT, TEMPORARY, FREELANCE}`, `JobEmploymentType {FULL_TIME, PART_TIME, REPLACEMENT}`, `ApplicationStatus`.

Candidate identity lives on `User` (no dedicated `Candidate` / `EducatorProfile` table):

- `skills[]`, `certifications[]`, `availability: String?` (legacy), `availabilitySettings: Json?` (structured, per `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`), `cvUrl`, `shortBio`, `candidatePoolVisible`, `region`, `jobRole`, `jobRoles[]`, `cities[]`, `isActive`, plus `EducatorWorkExperience`, `EducatorEducation`, `EducatorCertification` child tables.

**Missing models:** `Shortlist`, `SavedCandidate`, `Match`, `ReplacementRequest`, `UrgentShift`, `Assignment`, dedicated `EducatorAvailability` (lives as JSON on `User` today).

### 3.3 Frontend staffing UI

- `frontend/pages/RecruitmentPage.tsx` (foundation + admin) — tabs: jobs vs candidate pool. Uses `JobPostModal` and `ViewApplicantsModal`. Favourites are `localStorage` only. No persisted shortlist, no application status pipeline UI.
- `frontend/pages/educator/EducatorJobBoardPage.tsx` — filter dropdown omits `REPLACEMENT`, `TEMPORARY`, `FREELANCE`. Placeholder foundation avatars from `picsum.photos`.
- `frontend/pages/educator/EducatorApplicationsPage.tsx` — "View details" is `alert(...)` stub.
- `frontend/pages/foundation/FoundationDashboardPage.tsx` — 3-column grid (quick stats / today / recent activity / quick actions / quick message). Uses real API via `foundationDashboardService`. Only one staffing hook: a "Post job" quick action link to `/recruitment`.
- `frontend/pages/candidate/CandidateProfilePage.tsx` — candidate detail view.

### 3.4 Admin staffing UI

- `admin/src/pages/JobListings.tsx` — list, search, status filter (`PUBLISHED|DRAFT|CLOSED` — **no `FILLED`**), create/edit via `AddJobListingModal`, delete.
- `admin/src/pages/Candidates.tsx` — list + search + availability string filter. Edit modal; delete menu item has **no `onClick`** (dead button).
- `admin/src/components/AddJobListingModal.tsx` — **missing `employmentType`, `workSchedule`, `startDate`, `salaryRange`** vs. foundation `JobPostModal`.
- `admin/src/components/AddCandidateModal.tsx` — legacy `availability` dropdown, not structured `availabilitySettings`.

### 3.5 Replacement staffing state (critical finding)

Replacement exists only as a **label**:

- `JobContractType.REPLACEMENT` and `JobEmploymentType.REPLACEMENT` enum values.
- `workSchedule` JSON on the listing for part-time / replacement roles.
- Recruitment service maps `REPLACEMENT` contract type → `REPLACEMENT` employment type.

There is **no**:

- `ReplacementRequest` entity.
- Urgency / SLA flagging.
- Shift-level model (start time, end time, days).
- Dynamic availability matching.
- Fulfilment state machine (requested → offered → accepted → filled).
- Direct assignment of a candidate to a shift without a job listing + application.

**In effect: replacement staffing is not a feature. It is an enum tag on the existing "post a job" flow.**

### 3.6 Availability system (`docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`)

Designed (Calendly-style weekly schedule + overrides + employment type). Partially implemented:

- Prisma field `User.availabilitySettings: Json?` exists.
- DTOs in `api/src/settings/dto/educator-availability.dto.ts`.
- Frontend `AvailabilityScheduler`, `types/availability.ts`.
- Candidate pool date filter uses `isDateTimeAvailable` when settings present; falls back for legacy profiles.

Not implemented:

- Dedicated "available on date/time" search API across educators.
- Availability-driven matching in `findMatchingCandidates`.
- Structured availability in admin `AddCandidateModal`.

---

## 4. Peripheral modules (secondary under v2)

### 4.1 Parent leads (`api/src/leads/`)

- Prisma: `ParentLead`, `FoundationLeadResponse`. Real data.
- Controller: public `POST /parent-leads`, foundation/admin listing & updates, parent `/parent/my-leads`, foundation `/foundation/my-leads`, matching, assign, distribution, notify, stats.
- Scheduler `LeadsSchedulerService`: cron-driven lead distribution; auto-disables if `FRONTEND_URL` unset.
- Frontend: `FoundationLeadsPage`, `ParentEnquiriesPage`, `ParentLeadFormPage` — all real API.
- Admin: `ParentLeads.tsx` — real API.

**Remodel verdict:** keep as-is; downgrade in IA ranking. Emits `new_lead` + `parent_lead_confirmation` emails already.

### 4.2 HR / compliance

- Prisma: `Asset` (with `category` / `contentCategory` / crawler fields), `OrganizationDocument`, `Canton`, `CantonSource`, `PolicyCrawlHistory`, `PolicyAlert`.
- API: `policy-alerts`, `content` (HR / e-learning / state-policies), `admin/crawler` (env-gated on `CRAWLER_ENABLED`), `organization-documents`.
- Frontend: `HRProceduresPage`, `StatePoliciesPage`.
- Admin: `Cantons`, `CantonDetail`, `PolicyCrawler`, `PolicyReview`.

**Remodel verdict:** keep. Move behind "HR & Compliance" as position 3 in the nav order.

### 4.3 Marketplace / suppliers / service providers

- Prisma: `Product`, `Catalog`, `Service`, `ServiceProvider`, `Order`, `OrderItem`, `ServiceRequest`, `Inquiry`, `PromoCode`, `Partner`.
- API: `marketplace`, `partners`.
- Frontend: `MarketplacePage`, `supplier/*` (7 pages), `service-provider/*` (7 pages).
- Admin: `Products`, `Services`, `Orders`, `Partners`.

**Remodel verdict:** keep. Supplier + service-provider role dashboards **remain untouched** per the brief. Foundation-side marketplace drops to nav position 5.

### 4.4 E-learning / content

- Prisma: full LMS graph (`Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `LessonProgress`, `CourseQuiz`, `QuizQuestion`, `QuizAnswer`, `QuizAttempt`, `Certificate`, `CourseDiscussion`, `DiscussionReply`) + `ContentItem`, `ContentCategory` + `ContentModeration`, `ModerationAction`.
- API: `elearning`, `content`, `content-management`, `content-moderation` (automated rules endpoints are **stubs returning static data** — `content-moderation.service.ts` `getAutomatedRules` / `updateAutomatedRule`).
- Frontend: `ELearningPage`, `FileGalleryPage`, `admin/ContentManagementDashboardPage`.
- Admin: `Content.tsx` (tabs shell), `content/e-learning`, `content/hr-documents`, `content/state-policies`.

**Remodel verdict:** keep, minimal. Per brief, e-learning is minimal support.

### 4.5 Subscription / billing

- Prisma (dual stack): `Subscription`, `SubscriptionPlan`, `SubscriptionRequest`, `SubscriptionCancellationRequest`, `SubscriptionSettings`, `SubscriptionAction`, `SubscriptionSchedule`, `SubscriptionNote`, `BillingTransaction`, `PricingTier`, `DynamicPricingRule`, `FeatureFlag` — plus legacy Stripe-direct `Plan`, `PlanPrice`, `UserSubscription`, `License`.
- API: `billing` (Stripe + `GET /billing/plans`), `subscription-management` (large admin surface + public `GET /subscriptions/plans`).
- Frontend: `PricingPage` (mixes static `pricingService` data + live `/subscriptions/plans` fetch).
- Admin: `Subscriptions`, `DiscountTerminations` (vendor-clients API).

**Remodel verdict:** keep. Entitlements may gate staffing features in v2 (out of scope here — tracked as open decision).

### 4.6 Support

- Prisma: `SupportTicket`, `TicketResponse`.
- API: `support`.
- Admin: `Support.tsx`, `SupportTicket.tsx`.

**Remodel verdict:** keep. Admin nav rank: low.

### 4.7 Messaging

- Prisma: `Conversation`, `ConversationParticipant`, `Message`.
- API: `messaging` REST + `messaging.gateway.ts` WebSocket (`/messaging` namespace).
- Frontend: `MessagesPage` (`MessagingContext` + `useMessagingSocket`).
- Admin: `Messaging.tsx` (has `unreadCount: 0 // TODO` placeholder).

**Remodel verdict:** keep; deepen for recruiter ↔ candidate comms. Already cross-role.

---

## 5. Email / notification stack

### 5.1 Engine — `api/src/email-notification/`

- `email-notification.service.ts` — `sendNotification(event, recipient, payload, bypassPreferences?, allowUnknownRecipient?)` pipeline:
  1. Look up user + `notificationPreferences`.
  2. Check preferences (unless bypassed). Mandatory events always send.
  3. Resolve template via `EmailTemplateService.getTemplate(event)` — DB first, then `getDefaultTemplate(event)` code fallback.
  4. Send via `MailingTransportService` (SMTP → Mailgun → SendGrid).
  5. Log to `EmailLog` (`sent` / `failed`; no delivered/opened/clicked wiring yet).
- `scheduleNotification()` + `@Cron('0 * * * * *')` `processScheduledEmails()` — drains `ScheduledEmail` rows.
- `sendBulkNotification()` **ignores `scheduledAt`** — pass-through to immediate send. Only `scheduleNotification()` + cron defers.
- Analytics endpoint groups `EmailLog` by `status` and `event` — metrics beyond `sent`/`failed` are currently always 0.

### 5.2 Seeded templates (`email-template.service.ts` `getStarterTemplates()`)

| eventKey | category | vars |
|---|---|---|
| `account_verification` | authentication | `firstName`, `verificationUrl` |
| `password_reset` | authentication | `firstName`, `resetUrl` |
| `welcome_email` | userManagement | `firstName`, `dashboardUrl` |
| `new_message` | messaging | `firstName`, `senderName`, `messagePreview`, `messageUrl` |
| `new_lead` | leadManagement | `foundationName`, `parentName`, `childAge`, `location`, `message`, `leadUrl` |
| `parent_lead_confirmation` | leadManagement | `parentName`, `enquiryReference`, `submittedAt`, `childAge`, `location`, `message`, `accountSetupUrl`, `enquiriesUrl` |

In-code defaults exist for more keys but **billing-critical** events `payment_reminder` and `subscription_payment_failed` have **no fallback** — they fail silently if no DB row is seeded (known issue).

Preference categories (`UserNotificationPreferences`): authentication, userManagement, **jobRecruitment**, messaging, marketplace, leadManagement, subscription, contentModeration, systemAdmin, marketing, plus `mailingListOptOut`, `frequency`, `quietHoursEnabled/Start/End`. `frequency` and quiet hours are **stored but not enforced**.

### 5.3 Current trigger sites

| Where | Event | Trigger |
|---|---|---|
| `clerk-webhook.controller.ts` | `welcome_email` | webhook, fire-and-forget, bypass prefs |
| `leads.service.ts` | `parent_lead_confirmation` | on lead creation |
| `leads-scheduler.service.ts` | `new_lead` | cron every 10 min (to foundation emails) |
| `billing.service.ts` | `payment_reminder`, `subscription_payment_failed` | admin-triggered controllers |
| `maintenance-mode.service.ts` | `system_maintenance` | on toggle / scheduled |
| Cron (every minute) | any | `processScheduledEmails` |

**Recruitment sends zero emails today.** No call site for `job_application_received`, `application_status_update`, `job_match`, or any replacement-related event.

### 5.4 Mailing (campaigns) — `api/src/mailing/`

- Transports: `smtp.transport.ts`, `mailgun.transport.ts`, `sendgrid.transport.ts`, resolved in `mailing-transport.service.ts`.
- Service: segments, custom lists, CSV/XLSX export, batch-sending with cursor + rate-limit + HMAC unsubscribe.
- Controller: full admin surface `/admin/mailing/*`.
- Admin UI: `admin/src/pages/MailingList.tsx` (Build/Lists/Segments/Campaigns tabs) + `MailingCampaignDetail.tsx`.

### 5.5 In-app notifications

- No `Notification` Prisma model. No `api/src/notifications` module.
- `frontend/pages/NotificationsPage.tsx` reads from `NotificationContext` (in-memory state, max 5, lost on refresh).
- WebSockets: `MessagingGateway` for chat; `MaintenanceGateway` (+ admin `websocket.service.ts` on `/platform`) for maintenance + settings broadcasts. **No recruitment / staffing socket channel.**

---

## 6. Frontend navigation (`frontend/components/layout/Sidebar.tsx`)

`navItems` is a single array filtered by `currentUser.role`. Full config at lines 62–141. Per-role flat order:

- **PARENT:** Dashboard home, Browse foundations, Home find crèche, My requests, Messages, Support FAQ, Settings.
- **EDUCATOR:** Dashboard, Job board, My profile, Applications, File gallery, Messages, Support.
- **FOUNDATION:** Dashboard, Marketplace (Products / Services), Orders & appointments, Parent leads, **Recruitment** (Job listings / Candidate pool), HR procedures, E-learning, State policies, Analytics, Messages, Organisation profile, Support.
- **PRODUCT_SUPPLIER:** Dashboard, Orders, Product marketplace, Analytics, Messages, Organisation profile, Support.
- **SERVICE_PROVIDER:** Dashboard, My requests, Service marketplace, Analytics, Messages, Organisation profile, Support, Settings.
- **ADMIN / SUPER_ADMIN:** Dashboard, (also filtered-in: Marketplace, Recruitment, E-learning, Messages), Users subtree, Content subtree, Discount terminations, Partners, Admin support, Design system, Settings.

**Issues identified:**

- Admin `/partners` nav points to the **public** `PublicPartnersPage` (public route registered first in `App.tsx`); authenticated partner directory is `/partners-directory`.
- `MainLayout.tsx` calls `useTranslation` inside a callback (`toggleMobileSidebar`) — should be lifted to component top level; easy fix during layout refactor.

---

## 7. Admin navigation (`admin/src/components/Sidebar.tsx`)

```
dashboard, users, foundations (/organizations), partners, products, services,
jobListings, candidatePool, parentLeads, ordersAppointments, content, messages,
support, discountTerminations, subscriptions, mailingLists, policyCrawler, settings
```

Admin dashboard (`admin/src/pages/Dashboard.tsx`) sections:

1. Header + welcome.
2. System status card (health + policy crawler).
3. Stats grid (4 cards: users / foundations / products / parent leads).
4. Job stats (2 cards: job listings count / applications count).
5. Content management block (E-learning / HR docs / state policies).
6. Quick actions grid (Users / Organizations / Orders / Analytics).
7. Platform summary bullets.
8. `ContentUploadModal`.

**Settings page hosts (as tabs):** `emailTemplates` (`EmailNotificationPage`), `systemMonitoring` (`SystemMonitor`), `translations`, `designSystem`. Redirect routes `/system`, `/translations`, `/design-system` all forward to the relevant settings tab.

---

## 8. Routing map

### 8.1 User SPA (`frontend/App.tsx`)

Public: `/login`, `/signup`, `/pricing`, `/partners`, `/parent-lead-form`, `/reset-password`, `/sso-callback`.

Protected (wrapped in `ProtectedLayout` → `MainLayout`):

- Shared: `/dashboard`, `/dashboard/details/:detailType`, `/marketplace`, `/recruitment`, `/candidate/:id`, `/messages`, `/hr-procedures`, `/state-policies`, `/e-learning`, `/partners-directory`, `/partner/:id`, `/profile`, `/profile/organization/:id`, `/profile/educator/:id`, `/settings`, `/settings/profile`, `/settings/service-provider`, `/file-gallery`, `/notifications`.
- Admin-only subset under protected: `/admin/content-dashboard`, `/admin/discount-terminations`, `/admin/system-monitoring`, `/admin/support`, `/design-system`, `/users/*`.
- Role pages: `/supplier/*` (7), `/service-provider/*` (7), `/foundation/*` (6), `/educator/*` (5), `/parent/*` (4).

### 8.2 Admin SPA (`admin/src/App.tsx`)

Public: `/login`, `/signup`, `/reset-password`, `/access-denied`.

Protected (`AdminProtectedRoute` → `AdminLayout`): `/dashboard`, `/users`, `/users/:id/profile`, `/organizations`, `/organizations/:id/profile`, `/partners`, `/products`, `/services`, `/job-listings`, `/candidates`, `/parent-leads`, `/orders`, `/content`, `/content/e-learning`, `/content/hr-documents`, `/content/state-policies`, `/messaging`, `/support`, `/support/tickets/:id`, `/discount-terminations`, `/subscriptions`, `/mailing`, `/mailing/campaigns/:id`, `/policy-crawler/*`, `/settings`, + legacy redirects `/system`, `/translations`, `/design-system`.

---

## 9. Known bugs / smells caught during audit

| Area | Issue |
|---|---|
| `App.tsx:168` | Admin default redirect points to `/admin/content-dashboard` (content-centric). In v2 this should be a staffing-centric admin home. |
| `App.tsx` route order | `/partners` is public, but admin sidebar entry also uses `/partners` — admins clicking the sidebar may hit the public page. Should target `/partners-directory`. |
| `MainLayout.tsx` | `useTranslation` called inside a callback rather than component body. |
| `admin/src/pages/Candidates.tsx:~400-408` | Delete menu item has no `onClick` handler. |
| `admin/src/pages/JobListings.tsx` | Status filter lacks `FILLED`. |
| `admin/src/components/AddJobListingModal.tsx` | Missing `employmentType`, `workSchedule`, `startDate`, `salaryRange` vs. foundation modal. |
| `admin/src/components/AddCandidateModal.tsx` | Uses legacy string availability, not `availabilitySettings`. |
| `admin/src/pages/Messaging.tsx:~56` | Hard-coded `unreadCount: 0`. |
| `EducatorApplicationsPage.tsx:~55` | `alert()` stub for "View details". |
| `EducatorJobBoardPage.tsx` | Contract-type filter omits `REPLACEMENT`, `TEMPORARY`, `FREELANCE`. |
| `RecruitmentPage.tsx` | Favourites are `localStorage`; no persistence → not a real shortlist feature. |
| `recruitment.controller.ts` | `GET applications` and `GET candidates/:id` lack `@Roles` — behaviour depends on `RolesGuard` default. Audit. |
| `recruitment.service.ts` `findMatchingCandidates` | Not real matching — just all pool-visible educators minus applicants. |
| `email-notification.service.ts` | `frequency` and `quietHours` stored but not enforced; `sendBulkNotification` `scheduledAt` is ignored; only `sent`/`failed` statuses written. |
| `content-moderation.service.ts:374-408` | `getAutomatedRules` / `updateAutomatedRule` return static stubs. |

---

## 10. Environment / deploy

- `CRAWLER_ENABLED=false` by default (crawler turns off).
- `MALWARE_SCANNING_ENABLED=false` by default.
- `FRONTEND_URL` / `APP_URL` required for lead distribution and invite redirect URLs.
- Redis optional (`REDIS_URL` / `REDIS_HOST`) — queues disabled if absent.
- Mailing transport env vars documented in `CLAUDE.md`.
- Stripe keys required for billing (production only).

---

## 11. Live-data reality check (for migration planning)

Tables that **are in production use** and must be preserved end-to-end through the remodel:

- `User`, `Organization`, `UserNotificationPreferences`.
- `JobListing`, `JobApplication`.
- `ParentLead`, `FoundationLeadResponse`.
- `Product`, `Service`, `Order`, `OrderItem`, `ServiceRequest`, `Inquiry`, `Partner`.
- `Conversation`, `ConversationParticipant`, `Message`.
- `SupportTicket`, `TicketResponse`.
- `Subscription`, `SubscriptionPlan`, `BillingTransaction` (+ legacy Stripe-direct `UserSubscription`, `Plan`, `PlanPrice`).
- `EmailTemplate`, `EmailLog`, `ScheduledEmail`, `MailingSegment`, `MailingCampaign`, `MailingCustomList`, `MailingCustomListMember`.
- `Asset`, `OrganizationDocument`, `Canton`, `CantonSource`, `PolicyCrawlHistory`, `PolicyAlert`.
- LMS: `Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `LessonProgress`, `Certificate`.

No destructive migration is planned.
