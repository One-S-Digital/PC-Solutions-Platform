# Target Navigation & Information Architecture

## Fixed ordering rule (all staffing-oriented roles)

```
Overview → Staffing → HR & Compliance → Parent Enquiries → Suppliers & Services → (everything else)
```

Admin-only variation:

```
Overview → Users → Staffing → HR & Compliance → Parent Enquiries → Suppliers & Services → Platform Ops
```

## 1. Foundation sidebar (target)

| # | Label (user-visible) | i18n key | Path | Source of truth |
|---|---|---|---|---|
| 1 | Overview | `sidebar.overview` | `/foundation/dashboard` | `FoundationDashboardPage` |
| 2 | Staffing | `sidebar.staffing` | `/staffing` (redirect to first sub) | — |
| 2.1 | Post a job | `sidebar.postJob` | `/staffing/jobs` | `RecruitmentPage` jobs tab |
| 2.2 | Find candidates | `sidebar.findCandidates` | `/staffing/candidates` | `RecruitmentPage` candidates tab |
| 2.3 | Find replacement staff | `sidebar.findReplacements` | `/staffing/replacements` | *new page (Phase 3)* |
| 2.4 | Review applications | `sidebar.reviewApplications` | `/staffing/applications` | *new cross-job list + detail* |
| 3 | HR & Compliance | `sidebar.hrCompliance` | parent, no route | — |
| 3.1 | HR procedures | `sidebar.hrProcedures` | `/hr-procedures` | existing page |
| 3.2 | State policies | `sidebar.statePolicies` | `/state-policies` | existing page |
| 3.3 | E-learning | `sidebar.eLearning` | `/e-learning` | existing page |
| 4 | Parent enquiries | `sidebar.parentEnquiries` | `/foundation/leads` | existing `FoundationLeadsPage` |
| 5 | Suppliers & Services | `sidebar.suppliersServices` | parent, no route | — |
| 5.1 | Products | `sidebar.products` | `/marketplace/products` | existing |
| 5.2 | Services | `sidebar.services` | `/marketplace/services` | existing |
| 6 | Orders & appointments | `sidebar.ordersAppointments` | `/foundation/orders-appointments` | existing |
| 7 | Analytics | `sidebar.analytics` | `/foundation/analytics` | existing |
| 8 | Messages | `sidebar.messages` | `/messages` | existing |
| 9 | Organisation profile | `sidebar.organisationProfile` | `/foundation/organisation-profile` | existing |
| 10 | Support | `sidebar.support` | `/foundation/support` | existing |

## 2. Admin sidebar (target)

| # | Label | Path | Notes |
|---|---|---|---|
| 1 | Overview | `/dashboard` | Admin homepage (Staffing Signals first — see §4) |
| 2 | Users | `/users` | Unchanged CRUD |
| 3 | Staffing | parent | Collapsible group |
| 3.1 | Job listings | `/job-listings` | existing |
| 3.2 | Candidates | `/candidates` | existing |
| 3.3 | Applications | `/applications` | *new admin page — cross-foundation* |
| 3.4 | Replacement requests | `/replacements` | *new page (Phase 3)* |
| 4 | HR & Compliance | parent | |
| 4.1 | Content | `/content` | existing tabs shell |
| 4.2 | Policy crawler | `/policy-crawler` | existing |
| 5 | Parent enquiries | `/parent-leads` | existing |
| 6 | Suppliers & Services | parent | |
| 6.1 | Organizations | `/organizations` | existing |
| 6.2 | Partners | `/partners` | existing |
| 6.3 | Products | `/products` | existing |
| 6.4 | Services | `/services` | existing |
| 6.5 | Orders | `/orders` | existing |
| 7 | Platform Ops | parent | |
| 7.1 | Messaging | `/messaging` | existing |
| 7.2 | Subscriptions | `/subscriptions` | existing |
| 7.3 | Discount terminations | `/discount-terminations` | existing |
| 7.4 | Mailing | `/mailing` | existing |
| 7.5 | Support | `/support` | existing |
| 7.6 | Settings | `/settings` | existing (hosts system monitoring, translations, email templates, design system tabs) |

## 3. Unchanged sidebars (per brief)

- **Parent** — unchanged (see `01-current-state-inventory.md §6`).
- **Educator** — adds "Replacement opportunities" tab inside `EducatorApplicationsPage`, no sidebar change.
- **Product Supplier** — unchanged.
- **Service Provider** — unchanged.

## 4. Foundation `Overview` page (target layout)

```
┌─────────────────────────────────────────────────────────────┐
│  Staffing Snapshot (3 KPI cards — clickable)                │
│  [Open positions] [Applications to review] [Replacements]   │
├─────────────────────────────────────────────────────────────┤
│  Primary actions                                            │
│  [Post a job]  [Find replacement staff]                     │
│  [Find candidates]  [Review applications]                   │
├─────────────────────────────────────────────────────────────┤
│  Activity & calendar (existing FoundationDashboardPage)     │
├─────────────────────────────────────────────────────────────┤
│  Secondary (collapsed by default)                           │
│  • Parent enquiries waiting                                 │
│  • HR / policy alerts                                       │
│  • Suppliers & services offers                              │
└─────────────────────────────────────────────────────────────┘
```

## 5. Admin `Overview` page (target layout)

```
┌─────────────────────────────────────────────────────────────┐
│  Staffing Signals (4 cards)                                 │
│  [Urgent replacements] [Apps > 48h] [Low-pool regions]      │
│  [Zero-match jobs]                                          │
├─────────────────────────────────────────────────────────────┤
│  Users Quick Actions                                        │
│  [Manage users] [Invite user] [Pending role changes]        │
├─────────────────────────────────────────────────────────────┤
│  Platform counters (existing)                               │
│  users / foundations / products / parent leads              │
├─────────────────────────────────────────────────────────────┤
│  System status + policy crawler (existing)                  │
├─────────────────────────────────────────────────────────────┤
│  Content management summary (existing — smaller)            │
└─────────────────────────────────────────────────────────────┘
```

## 6. Route reorganisation (URL migrations)

| From | To | Keep old as redirect? |
|---|---|---|
| `/recruitment` | `/staffing` | Yes (Phase 1–6), drop in Phase 7 |
| `/recruitment/job-listings` | `/staffing/jobs` | Yes |
| `/recruitment/candidate-pool` | `/staffing/candidates` | Yes |
| (new) | `/staffing/replacements` | N/A |
| (new) | `/staffing/applications` | N/A |
| admin default redirect → `/admin/content-dashboard` | admin SPA home (or `/users/all`) | Replace outright |

## 7. Language / label rules

- Use action verbs: "Post a job" not "Recruitment".
- Never expose the word "Module" or the i18n-key identifier to users.
- Keep English as the canonical source. i18n sync runs on the existing `pnpm i18n:*` scripts.

## 8. Responsive behaviour

- Mobile: the Overview page collapses the KPI cards to a horizontal scroller; primary actions become a 2x2 grid; secondary section collapses behind a "Show secondary" toggle.
- Admin sidebar: existing collapse/expand pattern remains; parent groups start expanded for ADMIN, collapsed for SUPER_ADMIN user preference (stored in localStorage — already implemented pattern).
