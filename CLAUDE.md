# PC Solutions Platform — Claude Code Reference

## Monorepo Structure

```
/frontend   — user-facing React SPA (Vite + TypeScript + Tailwind + React Router v6)
/admin      — admin-only React SPA (separate Vite config)
/api        — NestJS REST API (Prisma ORM + PostgreSQL)
/packages   — shared UI components and translations
```

Auth: Clerk (OAuth, email/password, invites, webhooks)
Storage: Local or Cloudflare R2 via `UPLOAD_MODE`

> **v2 staffing-first remodel:** there is a dedicated plan folder at `docs/v2-staffing-remodel/`.
> Start any remodel-related task by reading `docs/v2-staffing-remodel/00-README.md` and
> `docs/v2-staffing-remodel/01-current-state-inventory.md` **before** re-analysing the codebase.
> The current-state inventory there is the canonical pre-remodel snapshot.

---

## Commands

| Task | Command |
|---|---|
| Dev (all) | `pnpm dev` |
| Build (all) | `pnpm build` |
| Type-check | `pnpm type-check` |
| Lint | `pnpm lint` / `pnpm lint:fix` |
| Test (unit) | `pnpm test` or per-workspace `pnpm test:unit` |
| Format | `pnpm format` |
| DB migrate | `pnpm db:migrate` |
| DB status | `pnpm db:status` |
| i18n check | `pnpm i18n:check` |

Run workspace-specific commands from the monorepo root using Turbo, or `cd` into `/frontend`, `/admin`, or `/api` directly.

---

## Active Project — Staffing-Centric Remodel (v2)

**Branch:** `claude/build-insights-dashboard-e40B6` · **PR:** #626
**Docs:** `STAFFING_REMODEL_PLAN.md` · `REMODEL_NOTES.md` · `IMPLEMENTATION_PHASES.md`

**What changes:**
- Admin + Foundation dashboards remodeled around staffing/recruitment action verbs
- New Prisma tables: `ReplacementRequest`, `ReplacementMatch`, `Notification`
- New `ApplicationStatus` values: `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED`
- Admin sidebar: flat nav → collapsible groups (`NavGroup` pattern — new)
- Feature flags: `v2_staffing_ia`, `v2_replacement_module`, `v2_staffing_emails`, `v2_in_app_notifications`

**Do not touch:** Parent / Supplier / Service Provider dashboards.

---

## User Roles

`PARENT` · `EDUCATOR` · `FOUNDATION` · `PRODUCT_SUPPLIER` · `SERVICE_PROVIDER` · `ADMIN` · `SUPER_ADMIN`

Role-based dashboard redirect: `frontend/App.tsx:151` (`RoleBasedDashboardRedirect`)

---

## Key File Locations

| Area | File |
|---|---|
| Auth context | `frontend/providers/AuthProvider.tsx` |
| Routes + protected layout | `frontend/App.tsx` |
| Clerk webhook handler | `api/src/webhooks/clerk-webhook.controller.ts` |
| User CRUD + invite | `api/src/users/users.controller.ts` |
| Email sending | `api/src/email-notification/email-notification.service.ts` |
| Email templates | `api/src/email-notification/email-template.service.ts` |
| Mailing transport | `api/src/mailing/mailing-transport.service.ts` |
| Admin API service | `admin/src/services/api.ts` |
| Prisma schema | `api/prisma/schema.prisma` |

---

## Auth — Clerk

**SSO callback route:** `/sso-callback` → `<AuthenticateWithRedirectCallback />` (must be in Clerk's allowed redirect URLs)

**Webhook role resolution priority** (`clerk-webhook.controller.ts:~504`):
```
private_metadata.intendedRole → unsafe_metadata.role → unsafe_metadata.pendingRole → unsafe_metadata.signupType → public_metadata.role
```
No role found → user creation skipped (OAuth users complete role at `/signup`).

**Invite flow:** `POST /users/invite` → Clerk sends email → `user.created` webhook fires with `publicMetadata.role` → backend user created automatically.

---

## Email System

Two subsystems sharing `MailingTransportService` (priority: **SMTP → Mailgun → SendGrid**):
- **Transactional** (`email-notification` module) — event-triggered 1-to-1 emails
- **Campaigns** (`mailing` module) — bulk sends to segments/lists

**Seeded event keys:** `account_verification`, `password_reset`, `welcome_email`, `new_message`, `new_lead`, `parent_lead_confirmation`

Scheduled emails: cron runs every minute dispatching `ScheduledEmail` records past their `scheduledAt`.

---

## Known Issues

- Webhook idempotency uses in-memory `Set` — lost on restart (needs Redis)
- Support ticket emails use separate `api/src/support/mailgun.service.ts` — not consolidated
- `EmailLog.status` only tracks `sent`/`failed`, not delivery/open/click events
- Unsubscribe endpoint (`/unsubscribe`) not implemented — token generation works
- `admin/src/pages/Messaging.tsx` — `unreadCount` hard-coded to `0`
- `frontend/pages/educator/EducatorApplicationsPage.tsx:55` — `alert()` stub on "View details"
- Missing `@Roles` guards on `GET /applications` and `GET /applications/:id` in `api/src/recruitment/recruitment.controller.ts`

---

## Environment Notes

| Var | Purpose |
|---|---|
| `APP_URL` | Platform base URL; used for invite redirect defaults |
| `FRONTEND_URL` | Alternative to `APP_URL` |
| `UPLOAD_MODE` | `local` or `r2` |
| `CRAWLER_ENABLED` | Default `false` — canton policy crawler |
| `MALWARE_SCANNING_ENABLED` | Default `false` — ClamAV |
| `REDIS_URL` / `REDIS_HOST` | Optional; queue workers disabled if unset |

See `ENVIRONMENT_SETUP.md` for full env var reference.
