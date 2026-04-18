# PC-Solutions-Platform — Graph Report

Generated: 2026-04-18 | Tool: graphify v1.0 (static analysis)

---

## Module Map

```
pc-solutions-platform/
├── frontend/          React 19 SPA — 7-role marketplace UI
├── admin/             React 19 SPA — back-office dashboard
├── api/               NestJS — centralized REST + WebSocket API
└── packages/
    ├── eslint-config/
    ├── translations/
    ├── types/
    ├── typescript-config/
    ├── ui/
```

---

## API Modules (43 modules under `api/src/`)

| Module | Key responsibility | Notable deps |
|---|---|---|
| `admin` | Back-office ops, role management | auth |
| `analytics` | User behaviour tracking | — |
| `auth` | JWT validation, Clerk sync, CASL RBAC | Clerk, Passport, CASL |
| `billing` | Stripe subscriptions + payments | Stripe SDK |
| `categories` | Product/service taxonomy | — |
| `content` | CMS-style content management | — |
| `content-management` | CMS content CRUD | content |
| `content-moderation` | Content review & moderation | content |
| `crawler` | Web content crawling & classification | — |
| `dashboard` | Aggregated stats per role | analytics |
| `elearning` | Learning content, courses | content |
| `email-notification` | Transactional notifications | mailing |
| `frontend-settings` | Feature flags, per-role config | — |
| `health` | Health check endpoint | — |
| `leads` | Lead capture & CRM pipeline | mailing |
| `mailing` | Email campaigns | SendGrid, Mailgun |
| `maintenance` | Maintenance mode controls | — |
| `marketplace` | Product catalog, ordering, search | billing, categories |
| `messaging` | Real-time chat (Socket.io) | Redis |
| `metrics` | Platform metrics & health | — |
| `organization-documents` | Org document storage | upload |
| `partners` | Partner integrations | — |
| `platform-settings` | Global platform configuration | — |
| `policy-alerts` | Policy change alerts | mailing |
| `principal` | Principal/org entity management | — |
| `profiles` | User profile data | auth |
| `promo-codes` | Promotional code management | billing |
| `recruitment` | Job/candidate matching | — |
| `security` | Security audit logging | — |
| `settings` | Per-user settings | — |
| `static-translation` | Static i18n string delivery | — |
| `subscription-management` | Subscription lifecycle ops | billing |
| `support` | Support tickets | — |
| `sync` | Data sync jobs | — |
| `system-configuration` | System-level config | — |
| `system-monitoring` | System health monitoring | metrics |
| `translation` | Dynamic translation management | — |
| `translation-errors` | Translation error tracking | — |
| `upload` | File upload & S3 storage | — |
| `user-management` | Admin user management ops | auth |
| `users` | User account management | auth |
| `vendor-clients` | Third-party vendor client wrappers | — |
| `webhooks` | Incoming webhook handlers (Clerk, Stripe) | auth, billing |

---

## Frontend Pages (`frontend/src/pages/`)

```
pages/
*(none found)*
```

**Main router**: `frontend/src/App.tsx` — contains all role-based route guards.

---

## Admin App (`admin/src/`)

### Pages
- `AccessDenied`
- `AdminOrganizationProfileEdit`
- `AdminUserProfileEdit`
- `Candidates`
- `CantonDetail`
- `Cantons`
- `Content`
- `Dashboard`
- `DesignSystem`
- `DiscountTerminations`
- `EmailNotificationPage`
- `JobListings`
- `MailingCampaignDetail`
- `MailingList`
- `Messaging`
- `Orders`
- `Organizations`
- `ParentLeads`
- `Partners`
- `PolicyCrawler`
- `PolicyReview`
- `Products`
- `ResetPassword`
- `Services`
- `Settings`
- `Subscriptions`
- `Support`
- `SupportTicket`
- `SystemConfigurationPage`
- `SystemMonitor`
- `Translations`
- `Users`

### Component Directories
- `auth/`
- `design-system/`
- `forms/`
- `mailing/`
- `messaging/`
- `products/`
- `services/`
- `settings/`
- `support/`
- `ui/`

---

## Frontend Component Domains (`frontend/src/components/`)

| Directory | Contains |
|---|---|
| `verification/` | — |

---

## Context Providers (`frontend/src/contexts/`)

| Context | Purpose |
|---|---|
| *(none found)* | — |

---

## Shared Packages

| Package | Import path | Use case |
|---|---|---|
| `@repo/eslint-config` | `@repo/eslint-config` | — |
| `@workspace/translations` | `@workspace/translations` | — |
| `@workspace/types` | `@workspace/types` | — |
| `@repo/typescript-config` | `@repo/typescript-config` | — |
| `@repo/ui` | `@repo/ui` | — |

---

## Data Flow: Typical Request

```
Browser
  └── Clerk JWT (Authorization header)
        └── NestJS API Gateway
              ├── JwtAuthGuard (validates Clerk token)
              ├── RolesGuard (CASL ability check)
              └── Module Controller
                    ├── Service (business logic)
                    ├── Prisma ORM → PostgreSQL
                    ├── Redis (cache / Bull job queue)
                    └── External: Stripe / SendGrid / S3
```

---

## Auth & Role Model

- **Provider**: Clerk (hosted auth UI + JWT)
- **Sync**: Clerk webhooks → `api/src/auth/` → Prisma User record
- **RBAC**: CASL `ability` definitions scoped per role
- **Roles** (enum in `@workspace/types`):
  - `SUPER_ADMIN` — full platform access
  - `ADMIN` — managed admin access (uses `/admin` app)
  - `FOUNDATION` — grant/program management
  - `PRODUCT_SUPPLIER` — product catalog & orders
  - `SERVICE_PROVIDER` — service listings & leads
  - `EDUCATOR` — availability, elearning, parent-facing profile
  - `PARENT` — marketplace browsing, child management

---

## Key Entry Points

| File | Role |
|---|---|
| `frontend/src/main.tsx` | Frontend SPA entry |
| `frontend/src/App.tsx` | All frontend routes + role guards |
| `admin/src/main.tsx` | Admin SPA entry |
| `api/src/main.ts` | NestJS bootstrap |
| `api/src/app.module.ts` | Root NestJS module (imports all modules) |
| `api/prisma/schema.prisma` | Full DB schema |
| `turbo.json` | Build task graph |
| `render.yaml` | Production deployment spec |

---

## Dependency Graph (inter-module)

```
frontend  ──imports──▶  @repo/ui, @workspace/types, @workspace/translations
admin     ──imports──▶  @repo/ui, @workspace/types, @workspace/translations
api       ──imports──▶  @workspace/types, @workspace/translations

api/auth    ◀── guards ── all other api modules
api/billing ◀── checks ── marketplace, elearning, leads
api/mailing ◀── sends  ── email-notification, leads, auth
api/messaging ◀── socket ── frontend
```

---

## Build & Scripts

| Script | Purpose |
|---|---|
| `pnpm build` | Turborepo build all apps |
| `pnpm dev` | Dev servers for all apps |
| `pnpm lint` / `lint:fix` | ESLint across all packages |
| `pnpm type-check` | TS check across all packages |
| `pnpm test` | Vitest + Playwright |
| `pnpm db:migrate` | Prisma migrate deploy |
| `pnpm graphify` | Regenerate this graph report |

---

## Maintenance Notes

- Regenerate this report after major structural changes: `pnpm graphify`
- Update `graph.json` is regenerated automatically by the same command
- Report path: `graphify-out/GRAPH_REPORT.md`
