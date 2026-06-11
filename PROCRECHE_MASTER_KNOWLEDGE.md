---
title: ProCrèche Solutions — Master Knowledge Base
aliases:
  - ProCreche
  - PCS
  - ProCrèche Master
tags:
  - project/procreche
  - saas
  - early-childhood
  - swiss
  - platform
  - second-brain
created: 2026-06-11
updated: 2026-06-11
status: active
type: master-reference
---

# ProCrèche Solutions — Master Knowledge Base

> [!quote] One-Line Value Statement
> "ProCrèche Solutions centralises procurement, HR, policies, recruitment, e-learning, and parent lead-management for the Swiss early-childhood sector — secure, multilingual, and built for real-world daycare operations."

---

## Table of Contents

- [[#1. Executive Overview]]
- [[#2. Core Audiences & Value Proposition]]
- [[#3. Product Pillars — Feature Modules]]
- [[#4. Role-Based Operations — Day-to-Day Flows]]
- [[#5. UX & UI Design System]]
- [[#6. Architecture & Tech Stack]]
- [[#7. Pricing & Revenue Model]]
- [[#8. Retention Strategy]]
- [[#9. Compliance, Legal & Policy]]
- [[#10. Assets & Deliverables]]
- [[#11. Open Items & Next Steps]]
- [[#12. Codebase Reference (Implementation)]]

---

## 1. Executive Overview

**ProCrèche Solutions** is a **Swiss, multi-role SaaS platform** that connects and streamlines the entire early-childhood ecosystem in one compliant, multilingual environment.

| Attribute | Detail |
|---|---|
| **Market** | Switzerland — early-childhood / daycare sector |
| **Model** | Multi-role SaaS (B2B + B2C hybrid) |
| **Languages** | EN / FR / DE |
| **Compliance** | GDPR + Swiss DPA |
| **Core mission** | Centralise procurement, HR, policies, recruitment, e-learning, and parent lead-management |

### What It Replaces / Unifies

```
Scattered spreadsheets  →  Centralised procurement dashboard
Paper HR templates      →  Digital, version-controlled document library
Phone-based hiring      →  Structured recruitment pipeline
Manual parent enquiries →  Smart auto-routed lead system
In-person training      →  Bundled e-learning (PDF/video)
```

---

## 2. Core Audiences & Value Proposition

### 2.1 Role Map

```
┌─────────────────────────────────────────────────────┐
│                 ProCrèche Platform                  │
│                                                     │
│  FOUNDATIONS ◄──────────────────────► SUPPLIERS     │
│  (Daycares)        Marketplace         (Products)   │
│       │                                    │        │
│       │◄──── Recruitment ────►  EDUCATORS  │        │
│       │                       (Job-seekers)│        │
│       │                                    │        │
│  PARENTS ──── Lead System ──► Foundations  │        │
│                                            │        │
│         SERVICE PROVIDERS ◄────────────────┘        │
│         (Legal/IT/Coaching)                         │
│                                                     │
│  ════════════ ADMIN / SUPER-ADMIN ══════════════    │
└─────────────────────────────────────────────────────┘
```

### 2.2 Value by Role

> [!info] Foundations / Daycares
> - Save admin time on procurement
> - Source vetted suppliers and services
> - Hire faster with structured recruitment
> - Access HR templates & policy updates
> - Receive and manage parent enquiries
> - Track staff training and completions

> [!info] Product Suppliers
> - List products without forced ecommerce/pricing
> - Receive structured order requests (qty, date, notes)
> - Issue and track promo codes
> - View engagement analytics (impressions, clicks, redemptions)

> [!info] Service Providers
> - List multiple services (legal, accounting, IT, coaching)
> - Receive appointment/quote requests
> - Integrate scheduling links (Cal.com / Calendly)
> - Track pipeline and request volume by canton

> [!info] Educators / Job-Seekers
> - Create a professional profile
> - Browse and apply to jobs in one click
> - Set availability preferences
> - Optionally access e-learning via the foundation's plan

> [!info] Parents
> - Submit a single, privacy-safe childcare enquiry
> - Get auto-matched to nearby crèches
> - Track enquiry status in real time
> - Receive quick responses with booking links

> [!info] Admins / Super-Admins
> - Manage all users, orgs, and content
> - Moderate listings and job postings
> - Maintain platform health, audit logs, and compliance
> - Control billing and system settings

---

## 3. Product Pillars — Feature Modules

### Module A — Marketplace

> [!abstract] Marketplace connects Foundations with Suppliers and Service Providers

#### Products Sub-module
| Feature | Detail |
|---|---|
| Supplier cards | Logo, short description, tags, brochures/PDFs |
| Order requests | Foundations submit requests (no checkout; pricing optional) |
| Promo codes | Suppliers offer codes; redemptions tracked in analytics |

#### Services Sub-module
| Feature | Detail |
|---|---|
| Service cards | Specialties, regions, delivery modes (remote/on-site/hybrid) |
| Appointment requests | Foundations send quote/appointment requests |
| Scheduling integration | Embedded Cal.com / Calendly booking links |

---

### Module B — Recruitment

> [!abstract] Full hiring pipeline from job post to hire

| Actor | Capability |
|---|---|
| **Daycares** | Post jobs, filter applicants, move through stages |
| **Educators** | Create profile, set availability, one-click apply |
| **Admin** | Moderate postings, feature/promote roles |

**Application Stages (v2 Staffing Remodel):**
`SHORTLISTED` → `INTERVIEW` → `OFFER` → `HIRED`

*See also: [[#12. Codebase Reference]] for `ApplicationStatus` enum and `ReplacementRequest` / `ReplacementMatch` Prisma tables.*

---

### Module C — Parent Leads

> [!abstract] Smart lead routing from parent enquiry to daycare response

**Flow:**
```
Parent submits smart form
  → fields: child age, start date, canton, specific needs
      ↓
Auto-routing to matching daycares by region
      ↓
Daycare receives lead in inbox
  → quick-reply templates available
  → one-click "Interested" sends parent a booking link
      ↓
Parent sees real-time status tracker in "My Requests"
      ↓
Visit scheduled → resolution
```

**Key capabilities:**
- Response tracking and automated reminders
- Privacy-safe enquiry (parents are not spammed)
- Regional matching algorithm by canton

---

### Module D — HR Procedures & Templates

> [!abstract] Curated, version-controlled document library for daycare operations

| Document Category | Examples |
|---|---|
| Staff onboarding | Induction checklists, contracts templates |
| Parent registration | Enrolment forms, consent documents |
| Daily operations | Routines, incident reports, meal plans |
| Legal | Compliance checklists, regulatory forms |

**How it works:**
- Admin uploads and version-controls documents
- Foundations always see and download the **latest version**
- Notifications sent to foundations on new uploads

---

### Module E — State Policies & Information Hub

> [!abstract] Canton-level policy and news distribution

| Feature | Access |
|---|---|
| Policy/news items | Admin publishes by canton |
| Public policies | Foundations AND Parents (read-only) |
| Critical alerts | `isCritical` flag → banner displayed at top |
| Urgency system | Standard vs Critical classification |

---

### Module F — E-Learning

> [!abstract] Bundled staff training — included in Premium Foundation plan

| Feature | Detail |
|---|---|
| Course cards | PDF and video formats |
| Enrolment | Foundations enrol specific staff members |
| Progress tracking | Completion percentage, status per staff member |
| Badges | Completion badges optionally displayed on educator profiles |
| Pricing | **No per-seat charges** — included in Premium plan |

---

### Module G — Admin Backend

> [!abstract] Platform governance and content management

| Capability | Detail |
|---|---|
| User & org management | Full CRUD, role assignment, soft-disable / hard-delete |
| Content moderation | Supplier/service listings, job postings |
| Notifications config | Per-audience notification triggers |
| Content Management Dashboard | Counts by type, latest uploads, quick "Add New", status flags (draft/published/critical) |
| Audit logging | All destructive actions logged |

**Soft-disable vs Hard-delete:**
- **Admin:** Can soft-disable user accounts
- **Super-Admin:** Only role with hard-delete access

---

## 4. Role-Based Operations — Day-to-Day Flows

### 4.1 Parent Journey

```
1. Submit enquiry form (child age, start date, canton, needs)
2. Auto-matched to nearby daycares
3. Daycare responds OR requests more info
4. Parent schedules a visit
5. Status updates visible in "My Requests"
```

---

### 4.2 Foundation / Daycare Journey

```
PROCUREMENT
├── Browse Marketplace (suppliers + services)
├── Send order requests / appointment requests
└── Manage Orders & Appointments (with status tracking)

LEADS
├── Receive parent enquiries in inbox
├── Triage and prioritise
└── One-click "Interested" → emails parent with booking link

RECRUITMENT
├── Post job listings
├── View and filter candidates
└── Move applicants through stages: Shortlisted → Interview → Offer → Hired

HR / POLICIES / E-LEARNING
├── Download HR templates (always latest version)
├── Read canton policy updates
└── Enrol staff in e-learning courses → track completion

ANALYTICS DASHBOARD
├── New leads tile
├── Pending orders tile
├── Training progress tile
└── Job pipeline tile
```

---

### 4.3 Product Supplier Journey

```
LISTINGS
├── Add/edit products with media and brochures
├── Set optional public pricing
└── Tag by region and category

ORDERS
├── Receive structured requests (qty, delivery date, notes)
├── Accept or Decline
├── Update fulfilment status
└── Export to CSV

PROMO / ANALYTICS
├── Create and manage promo codes
└── View: impressions, clicks, requests, redemptions
```

---

### 4.4 Service Provider Journey

```
LISTINGS
├── Add multiple services per account
│   └── Each with: category, delivery mode, languages, regions, optional price
└── Manage listing visibility and status

REQUESTS
├── Receive appointment/quote requests from foundations
├── Integrate Cal.com or Calendly link
└── Accept → Complete flow

ANALYTICS
├── Profile views
├── Request volume by canton
└── Promo code usage
```

---

### 4.5 Admin Journey

```
CONTENT
├── Upload HR docs, policies, e-learning content
└── Instant visibility to relevant audience + notification trigger

MODERATION
├── Review and approve/reject supplier listings
├── Review service listings
└── Review and feature job postings

GOVERNANCE
├── Audit log review
└── Soft-disable user accounts
```

---

### 4.6 Super-Admin Journey

```
SYSTEM
├── System-wide settings
├── Roles and permissions management
└── i18n packs (EN/FR/DE) maintenance

SECURITY
├── Row-level data isolation policy
└── Security policy configuration

BUSINESS
├── Billing controls
├── Data exports
└── High-level analytics across all orgs
```

---

## 5. UX & UI Design System

### 5.1 Design Language

| Token | Value | Use |
|---|---|---|
| Primary (mint) | `#48CFAE` | CTAs, active states, brand |
| Destructive (coral) | `#FE6D73` | Delete, cancel, errors |
| Deep teal accent | — | Secondary highlights |
| Aesthetic | Clean Swiss | Minimal, professional |
| Accessibility | Contrast + focus rings | WCAG compliance |

### 5.2 Key UX Patterns

> [!tip] Dynamic Signup
> Role selector (Foundation / Supplier / Service Provider / Parent) → form morphs to role-specific fields automatically. No generic one-size-fits-all registration.

> [!tip] Role Dashboards
> Every role gets its own dashboard with **KPI tiles** (numeric summaries) and **action panels** (quick-access workflows). No cluttered "everything" view.

> [!tip] Multilingual UI
> - Languages: EN / FR / DE
> - Sticky language switcher visible at all times
> - Locale routing (URL or session-based)

### 5.3 Settings Panels (Suppliers & Service Providers)

| Settings Tab | Contents |
|---|---|
| Company Profile | Name, logo, description |
| Contact & Booking | Contact details, Cal.com/Calendly link |
| Notifications | Email/in-app preferences |
| Defaults | Default regions, delivery mode |
| Promo Codes | Create, activate, deactivate codes |
| Billing | Plan, invoices, payment method |
| Analytics Prefs | Dashboard metric preferences |
| Team | Invite and manage team members |
| Privacy | Data visibility and consent settings |

---

## 6. Architecture & Tech Stack

> [!warning] Note on Stack Divergence
> The original master summary describes Next.js + Express. The **actual codebase** uses **React (Vite) + NestJS + Prisma** — see [[#12. Codebase Reference]] for the real implementation stack.

### 6.1 Intended Architecture (from master summary)

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript (SSR/ISR), Tailwind CSS |
| Backend | Node.js + Express (TypeScript) |
| Database | PostgreSQL + Prisma (row-level security) |
| Storage | S3 or equivalent (media, PDFs) |
| Email | SendGrid |
| Payments | Stripe (plans/checkout) |
| Scheduling | Cal.com / Calendly |
| i18n | next-i18next (EN/FR/DE) |
| Hosting | Vercel (frontend) + managed Postgres/S3 (backend) |

### 6.2 Actual Codebase Stack

| Layer | Technology |
|---|---|
| Frontend (user) | React + Vite + TypeScript + Tailwind + React Router v6 |
| Frontend (admin) | Separate React + Vite SPA |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Clerk (OAuth, email/password, invites, webhooks) |
| Storage | Local or Cloudflare R2 (`UPLOAD_MODE` env var) |
| Shared packages | `/packages` — shared UI components + translations |

### 6.3 Security Model

| Concern | Approach |
|---|---|
| Auth | Role-based middleware (Clerk + backend guards) |
| Data isolation | Row-level security patterns (multi-tenant) |
| Audit trail | Audit logging on all destructive actions |
| Account lifecycle | Soft-delete (Admin) / Hard-delete (Super-Admin only) |
| Data privacy | GDPR-aligned; encryption at rest + in transit |
| Webhook idempotency | In-memory Set *(known issue — needs Redis)* |

---

## 7. Pricing & Revenue Model

### 7.1 Foundation / Daycare Plans

| Tier | Includes | Price (est.) |
|---|---|---|
| **Lower / Starter** | Marketplace access only | ~CHF 59/mo |
| **Premium** | Full suite: HR, policies, leads, recruitment, e-learning | ~CHF 129–159/mo |
| **Enterprise** | Multi-site, white-label parent app (CrècheConnect), SSO | Custom |

### 7.2 Supplier & Service Provider Plans

| Component | Detail |
|---|---|
| Onboarding | One-time fee |
| Monthly subscription | ~CHF 189–349/mo depending on tier/visibility |
| Add-ons | Featured placements, Data Insights reports |

### 7.3 Revenue Milestones

```
CHF 10k MRR Target
├── ~40 Foundations on Premium
├── ~10 Product Suppliers
├── ~15 Service Providers
└── Limited featured placement slots

CHF 50k–100k MRR Scale Path
├── White-label parent app "CrècheConnect"
│   └── Push notifications, calendar, custom branding
├── Data products
│   └── Benchmarks, compliance trackers
├── Payments layer
│   └── Tuition collection, BNPL partner
└── Enterprise plans (multi-site, SSO)
```

---

## 8. Retention Strategy

> [!abstract] Goal: Lock in Suppliers and Service Providers for multi-year relationships

### 8.1 Contractual Levers

- **12-month renewable contracts** with early-exit fee
- Non-solicitation clauses protecting platform relationships
- **Loyalty discounts** in Year 2 and Year 3

### 8.2 Product Lock-In

| Mechanism | How it creates stickiness |
|---|---|
| Promo-code analytics | Suppliers rely on PCS data to measure ROI |
| Market benchmarks | Unique data not available elsewhere |
| ERP / API hooks | Integration into supplier's own systems |
| Verified badges | Trust signal displayed on listings; motivates compliance |

### 8.3 Community & Prestige

- Quarterly roundtables with industry peers
- Annual awards recognising top performers
- Case-study spotlights — visibility and PR value for suppliers

### 8.4 Financial Levers

- **Bonus leads** for suppliers/providers maintaining high SLA response rates
- **Multi-year prepay discounts** incentivising 2–3 year commitments

---

## 9. Compliance, Legal & Policy

### 9.1 Data Access by Role

| Data Type | Access |
|---|---|
| Public canton policies | Foundations + Parents (read-only) |
| Internal HR documents | Foundations only |
| User PII | Admin / Super-Admin with audit log |
| Billing data | Super-Admin + account holder |

### 9.2 Legal Framework

| Document | Status |
|---|---|
| **LICENSE v1.0** | Proprietary/hosted SaaS; Swiss law; "AS IS, NO WARRANTY"; trademarks protected; third-party OSS acknowledgments (MIT libraries) |
| **GDPR / Swiss DPA** | Separate Data Processing Addendum; data minimisation; encryption at rest and in transit |
| **DPA + SLA appendices** | Pending — open item |

### 9.3 Security Policies

- Row-level data isolation for multi-tenant architecture
- Encryption at rest and in transit
- Soft-delete for standard accounts; hard-delete Super-Admin only
- Audit logging on all critical actions

> [!warning] Known Gap
> Webhook idempotency currently uses an **in-memory Set** — this is lost on server restart. Redis persistence needed for production reliability.

---

## 10. Assets & Deliverables

| Asset | Description |
|---|---|
| Development brief | Modules, data models, 6-week MVP plan, stack spec |
| UI prompts/specs | Landing page, dashboards, settings pages, upload modals |
| Copywriting | Hero lines, supplier/parent sections, bios, CTAs (EN/FR) |
| Brand/UI snippets | Sticky language switcher CSS, Join-Waitlist popup form |
| Auto-reply email | Template for `no-reply@procrechesolutions.com` |
| Pricing strategy PDF | Three pricing models documented |
| LICENSE v1.0 draft | Proprietary SaaS license under Swiss law |

---

## 11. Open Items & Next Steps

> [!todo] Action Items

- [ ] **Pricing model** — Finalise annual discounts; decide supplier/service tier thresholds
- [ ] **White-label app scope** — Confirm CrècheConnect feature set (push notifications, calendar sync, branding kit)
- [ ] **Content Management Dashboard** — Approve wireframes and upload workflow specs
- [ ] **i18n** — Lock approach (next-i18next vs custom); assign translation ownership for EN/FR/DE
- [ ] **DPA + SLA appendices** — Draft and review; set support hours and escalation matrix
- [ ] **CI/CD** — Stand up pipeline (lint, type checks, console-error budget); seed development data

---

## 12. Codebase Reference (Implementation)

> [!note] This section maps the product spec above to the actual codebase in `/home/user/PC-Solutions-Platform`

### 12.1 Monorepo Structure

```
/frontend   — User-facing React SPA (Vite + TypeScript + Tailwind + React Router v6)
/admin      — Admin-only React SPA (separate Vite config)
/api        — NestJS REST API (Prisma ORM + PostgreSQL)
/packages   — Shared UI components and translations
```

### 12.2 Key Files by Domain

| Domain | File Path |
|---|---|
| Role-based routing | `frontend/App.tsx:151` (`RoleBasedDashboardRedirect`) |
| Auth context | `frontend/providers/AuthProvider.tsx` |
| Clerk webhook | `api/src/webhooks/clerk-webhook.controller.ts` |
| User CRUD + invite | `api/src/users/users.controller.ts` |
| Email sending | `api/src/email-notification/email-notification.service.ts` |
| Email templates | `api/src/email-notification/email-template.service.ts` |
| Mailing transport | `api/src/mailing/mailing-transport.service.ts` |
| Admin API service | `admin/src/services/api.ts` |
| Prisma schema | `api/prisma/schema.prisma` |

### 12.3 User Roles (Code Values)

```
PARENT
EDUCATOR
FOUNDATION
PRODUCT_SUPPLIER
SERVICE_PROVIDER
ADMIN
SUPER_ADMIN
```

### 12.4 Auth — Clerk Webhook Role Resolution

Priority order (highest → lowest):
```
1. private_metadata.intendedRole
2. unsafe_metadata.role
3. unsafe_metadata.pendingRole
4. unsafe_metadata.signupType
5. public_metadata.role
```
No role found → user creation skipped (OAuth users complete role at `/signup`).

### 12.5 Email System

Two subsystems sharing `MailingTransportService`:

| Subsystem | Module | Use case |
|---|---|---|
| Transactional | `email-notification` | Event-triggered 1-to-1 emails |
| Campaigns | `mailing` | Bulk sends to segments/lists |

**Transport priority:** SMTP → Mailgun → SendGrid

**Seeded event keys:**
- `account_verification`
- `password_reset`
- `welcome_email`
- `new_message`
- `new_lead`
- `parent_lead_confirmation`

### 12.6 Active Feature Branch (v2 Staffing Remodel)

| Item | Detail |
|---|---|
| Branch | `claude/build-insights-dashboard-e40B6` |
| PR | #626 |
| Docs | `STAFFING_REMODEL_PLAN.md`, `REMODEL_NOTES.md`, `IMPLEMENTATION_PHASES.md` |

**New Prisma tables added:**
- `ReplacementRequest`
- `ReplacementMatch`
- `Notification`

**New `ApplicationStatus` enum values:**
`SHORTLISTED` | `INTERVIEW` | `OFFER` | `HIRED`

**New UI pattern:**
- Admin sidebar: flat nav → collapsible `NavGroup` pattern

**Feature flags:**
- `v2_staffing_ia`
- `v2_replacement_module`
- `v2_staffing_emails`
- `v2_in_app_notifications`

> [!warning] Do Not Touch
> Parent, Supplier, and Service Provider dashboards are **excluded** from the v2 remodel scope.

### 12.7 Known Bugs / Technical Debt

| Issue | Location | Priority |
|---|---|---|
| Webhook idempotency uses in-memory Set (lost on restart) | `clerk-webhook.controller.ts` | High — needs Redis |
| Support ticket emails not consolidated | `api/src/support/mailgun.service.ts` | Medium |
| `EmailLog.status` only tracks sent/failed (no delivery/open/click) | Email module | Medium |
| Unsubscribe endpoint not implemented | `/unsubscribe` | Medium |
| `unreadCount` hard-coded to `0` | `admin/src/pages/Messaging.tsx` | Low |
| `alert()` stub on "View details" | `frontend/pages/educator/EducatorApplicationsPage.tsx:55` | Low |
| Missing `@Roles` guards on `GET /applications` routes | `api/src/recruitment/recruitment.controller.ts` | **Security — High** |

### 12.8 Environment Variables

| Variable | Purpose |
|---|---|
| `APP_URL` | Platform base URL; used for invite redirect defaults |
| `FRONTEND_URL` | Alternative to `APP_URL` |
| `UPLOAD_MODE` | `local` or `r2` (Cloudflare R2 storage) |
| `CRAWLER_ENABLED` | Default `false` — canton policy crawler |
| `MALWARE_SCANNING_ENABLED` | Default `false` — ClamAV integration |
| `REDIS_URL` / `REDIS_HOST` | Optional; queue workers disabled if unset |

### 12.9 Dev Commands

| Task | Command |
|---|---|
| Dev (all services) | `pnpm dev` |
| Build (all) | `pnpm build` |
| Type-check | `pnpm type-check` |
| Lint | `pnpm lint` / `pnpm lint:fix` |
| Unit tests | `pnpm test` or `pnpm test:unit` |
| Format | `pnpm format` |
| DB migrate | `pnpm db:migrate` |
| DB status | `pnpm db:status` |
| i18n check | `pnpm i18n:check` |

---

## Quick Reference Cards

### Product Module → Role Matrix

| Module | Foundation | Supplier | Service Provider | Educator | Parent | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Marketplace — Products | Browse/Order | Manage | — | — | — | Moderate |
| Marketplace — Services | Browse/Book | — | Manage | — | — | Moderate |
| Recruitment | Post Jobs | — | — | Apply | — | Moderate |
| Parent Leads | Receive | — | — | — | Submit | Monitor |
| HR Templates | Download | — | — | — | — | Upload |
| Policies Hub | Read | — | — | — | Read | Publish |
| E-Learning | Enrol Staff | — | — | Complete | — | Upload |
| Analytics | Own data | Own data | Own data | — | — | Platform-wide |
| Settings | Own org | Own org | Own org | Own profile | Own profile | All |

---

### Revenue at a Glance

```
CHF 10k MRR
  40 × Premium Foundation @ ~CHF 129  = CHF 5,160
  10 × Supplier Subscription @ ~CHF 250  = CHF 2,500
  15 × Service Provider @ ~CHF 220  = CHF 3,300
  Featured slots (est.)                  = CHF ~500–1,000
  ─────────────────────────────────────────────────────
  Total estimated                       ≈ CHF 11,460/mo
```

---

*Last updated: 2026-06-11 | Source: ProCrèche Solutions Master Summary PDF + live codebase (PC-Solutions-Platform)*
