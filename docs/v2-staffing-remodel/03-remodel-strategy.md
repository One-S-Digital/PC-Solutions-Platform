# Remodel Strategy

## Guiding principle

**Upgrade, don't rebuild.** The Prisma schema, NestJS modules, and React routing shell are all production and must stay. We remodel by:

1. **Elevating** staffing to the top of the information architecture.
2. **Renaming** modules to action-based labels.
3. **Extending** (not replacing) the recruitment domain to cover replacement staffing properly.
4. **Wiring** transactional email + in-app notifications into existing recruitment events.
5. **Downgrading** secondary modules in navigation only — their data and APIs stay intact.

## Non-negotiables (from the brief)

- Foundation + admin dashboards are remodelled.
- **Parent, Product Supplier, Service Provider dashboards are untouched.** Nothing staffing-related should leak into their UIs or their role dashboards.
- Live users and data are preserved. All data-model changes are additive (new tables, new nullable fields, new enum values).
- Nav order is fixed: Overview → Staffing → HR & Compliance → Parent Enquiries → Suppliers & Services (admin inserts Users between Overview and Staffing).
- Feature acceptance test: a change is in scope only if it improves hiring speed, candidate visibility, replacement fulfilment, or operator workflow.

## What stays the same

- Auth (Clerk), role model, organisation model.
- Billing / subscription plumbing.
- Messaging, support tickets.
- Marketplace, supplier, service-provider domains end-to-end.
- Parent enquiries domain (leads service + scheduler).
- HR / state policies / canton policies backends.
- E-learning backend.
- Mailing / campaign infrastructure.
- Frontend design system, routing shell, Clerk SSO flow.

## What changes (high level)

1. **New domain extension: replacement staffing.**
   - New Prisma models (all additive): `ReplacementRequest`, `SavedCandidate` (persisted shortlists), `StaffingAlert` (or generic `Notification`). Optional: `AvailabilitySlot` materialisation for fast search.
   - New API module `api/src/staffing/` composing recruitment + new replacement pieces (or extend `recruitment` — see open decisions).
   - Matching service upgrade: real scoring on skills, cities/region, availability-on-date, language, certifications.

2. **Foundation dashboard remodel.**
   - Sidebar renamed + reordered to action-first labels.
   - Homepage (`/foundation/dashboard`) becomes a staffing overview.
   - `/recruitment` rebranded to `/staffing` (keep `/recruitment/*` as redirects for preserved links and old deep-links).
   - Replacement staffing gets its own surface: `/staffing/replacements` with urgency rail and quick-match.
   - Secondary items (HR procedures, state policies, e-learning, marketplace, parent leads, analytics, org profile, support) are demoted in nav, not removed.

3. **Admin dashboard remodel.**
   - Sidebar reordered: Overview → Users → Staffing (Jobs / Candidates / Replacements / Applications) → HR & Compliance (Content, Policy crawler) → Parent Enquiries (Parent leads) → Suppliers & Services (Organizations, Partners, Products, Services, Orders) → Platform Ops (Subscriptions, Mailing, Support, Discount terminations, Settings).
   - Admin homepage becomes a **staffing signals** page: urgent replacement requests, applications awaiting review, low-candidate-pool alerts, new-job-fanout status — with classic platform counters below.
   - Fix the admin-default-redirect: ADMIN/SUPER_ADMIN land on the admin SPA, not the user SPA's `/admin/content-dashboard`.

4. **Email & notification layer (staffing).**
   - Seed new templates: `new_application`, `application_status_update`, `job_match`, `replacement_request_open`, `replacement_matched`, `replacement_confirmed`, `low_candidate_pool`.
   - Wire triggers in `recruitment.service.ts` and new `staffing.service.ts`.
   - Introduce a real in-app notification system (Prisma `Notification` model + service + socket push) — gated behind a feature flag in early phases so we can ship email first.

5. **Candidate-side polish.**
   - Finish the availability system per `docs/EDUCATOR_AVAILABILITY_SYSTEM_DESIGN.md`.
   - Add "available for replacement" affordance (either a flag on `availabilitySettings` or an explicit `replacementAvailability` field).
   - Replace `picsum.photos` placeholders with initials-avatar or real asset URL fallback.
   - Replace `alert()` stub for educator application detail with a real modal / detail page.

6. **Minor bugfix sweep** (listed in `02-gap-analysis.md §H`) — do these alongside the IA changes as they unblock the new navigation and admin actions.

## What we will NOT do

- We will not migrate `JobListing` → a new table. We extend it.
- We will not re-key existing `EmailTemplate` rows. New flows use **new** event keys.
- We will not change routes for parent / supplier / service-provider users.
- We will not re-platform auth, billing, messaging, or marketplace.
- We will not build "HR software" features beyond what already exists. HR & Compliance stays as the current content+policy set.

## Principles driving UI redesign

- **Action labels over module labels:** "Post a job", "Find replacement staff", "Find candidates", "Review applications".
- **One action per screen primary.** If there are two, one must be clearly secondary.
- **Urgent state surfaced at Overview level.** A foundation user should see "3 replacement requests open · 7 applications awaiting review · 2 candidates ready to hire" without navigating.
- **No duplicate destinations.** Marketplace is `/marketplace` only; admin sidebar should not route admins to the user-facing public page by accident.
- **Subscription gates stay.** Staffing core remains behind the same `SubscriptionGatedRoute` wrapper foundations already hit — entitlement model is unchanged (tracked as an open decision if plans need to be re-bundled).

## Success metrics (what this remodel must improve)

From the brief, measured via new dashboards (Phase 4):

- Time to post a job.
- Time to first candidate.
- Time to hire.
- Active candidate count.
- Replacement request fulfilment speed.
- Job fill rate.
- Candidate profile completion.
- Application rate.

These metrics require the `Notification` + `StaffingSignals` plumbing, so they land in the later phases.
