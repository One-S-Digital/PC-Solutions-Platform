# Data Migration & Preservation

> Core promise: **no destructive migrations**. Live users and live data survive the remodel.

## Principles

1. All schema changes are **additive**: new tables, new nullable fields, new enum values. Never drop or rename existing columns in the same migration.
2. Enum extensions are applied via `prisma migrate` and then exploited in code. Old enum values remain usable.
3. API contracts: new routes are added; old routes are deprecated (not removed) for at least one release cycle. Frontends consume either.
4. Deep links: `/recruitment/*` remains a working redirect target throughout Phase 1–6, removed only in Phase 7.
5. i18n keys: new action-based keys are added; old keys remain until Phase 7 cleanup. No keys are deleted while still referenced.

## Schema change log (proposed)

| Phase | Table | Change | Migration name |
|---|---|---|---|
| 2 | `JobApplication` | Extend `ApplicationStatus` enum with `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED`. Existing values `PENDING`, `REVIEWED`, `ACCEPTED`, `REJECTED` preserved. `ACCEPTED` stays valid (legacy). | `v2_application_pipeline_stages` |
| 2 | `SavedCandidate` (new) | `id`, `foundationId`, `userId` (admin who saved), `candidateId`, `createdAt`, `notes?`. Unique `(foundationId, candidateId)`. | `v2_saved_candidate` |
| 3 | `ReplacementRequest` (new) | See `04-phased-plan.md §Phase 3`. | `v2_replacement_request` |
| 3 | `ReplacementMatch` (new) | See `04-phased-plan.md §Phase 3`. | `v2_replacement_match` |
| 3 | `User.availabilitySettings` | No schema change (JSON). Add `isOpenToReplacement: boolean` key at the service / DTO layer. | — |
| 4 | `Notification` (new) | `id`, `userId`, `type`, `title`, `body`, `link?`, `metadata Json?`, `readAt?`, `createdAt`. | `v2_notification` |
| 4 | `EmailTemplate` | Data-only: insert 7 new rows via `getStarterTemplates()` idempotent `createMany({ skipDuplicates: true })`. No schema change. | — |
| 4 | `EmailLog` | Later opportunity to widen `status` enum to include `delivered`, `opened`, `clicked` when a transport webhook is wired. Not required for Phase 4 exit. | deferred |

All Prisma migrations must be generated via `pnpm --filter api prisma migrate dev -n "<name>"` and reviewed before merging.

## Data backfills

- **`SavedCandidate`:** no backfill. Legacy `localStorage` favourites remain on the user's device until the user re-opens the candidate pool; they see the empty persisted list, can re-favourite. Optional: on first load, send any `localStorage` favourites to `POST /recruitment/shortlist/bulk` once (keyed by a one-shot localStorage flag).
- **`ApplicationStatus.HIRED`:** not auto-backfilled. Foundations who previously marked an application `ACCEPTED` keep it as `ACCEPTED`. UI renders `ACCEPTED` and `HIRED` identically for 1 release, then new status transitions default to `HIRED`.
- **`ReplacementRequest`:** no backfill. Jobs previously posted with `contractType=REPLACEMENT` remain as job listings. Optional migration later to convert open REPLACEMENT jobs into `ReplacementRequest` rows if the operator wants.
- **`Notification`:** no backfill (empty table on migration day is fine).

## Feature flags (to de-risk rollout)

Reuse existing `FeatureFlag` model. Flags to introduce:

- `v2_staffing_ia` — controls new nav labels + order. Default off on prod until Phase 1 is validated.
- `v2_replacement_module` — hides replacement routes until Phase 3 is shipped.
- `v2_staffing_emails` — master switch for new email events (per-event override optional via env `STAFFING_EMAIL_DISABLED_EVENTS=job_match,replacement_request_open`).
- `v2_in_app_notifications` — gates the new `Notification` feed; falls back to `NotificationContext` transient toasts.

Flags are read by `FrontendSettingsManager` on frontend and by `FeatureFlagService` (existing) on backend.

## Email deliverability during rollout

- New events rate-limited by `STAFFING_MATCH_EMAIL_LIMIT` (default 20) so a single job post cannot blast an entire pool.
- All new templates respect `jobRecruitment` category preference; users who already opted out are not spammed.
- Admins can preview templates in the existing admin `EmailNotificationPage` before flipping the feature flag.

## Deep-link preservation map

| Old | New | Status during phases 1–6 | After phase 7 |
|---|---|---|---|
| `/recruitment` | `/staffing` | Both work | Old → 301 redirect |
| `/recruitment/job-listings` | `/staffing/jobs` | Both work | Old → 301 redirect |
| `/recruitment/candidate-pool` | `/staffing/candidates` | Both work | Old → 301 redirect |
| `/candidate/:id` | unchanged | — | — |
| `/admin/content-dashboard` (as admin default landing) | admin SPA home | Keep the page; just stop defaulting admins to it | Keep page, no default |

## Test plan for preservation

- Before merging each phase: run the existing E2E suite (`frontend/tests`, admin/e2e if present). E2E login and role-redirect are already covered.
- Manual smoke per role: log in as each of the 7 roles, confirm:
  - PARENT / EDUCATOR / PRODUCT_SUPPLIER / SERVICE_PROVIDER: sidebar and dashboard are **byte-identical** to pre-remodel for non-`FOUNDATION`/`ADMIN` roles in Phases 1–2.
  - FOUNDATION: sidebar order matches target; old URLs still resolve.
  - ADMIN / SUPER_ADMIN: sidebar order matches target; admin SPA loads at login; user-facing `/admin/*` pages still reachable.
- Prisma migration dry-run on a staging copy of prod DB before production.
