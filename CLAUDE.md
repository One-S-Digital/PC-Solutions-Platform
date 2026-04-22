# PC Solutions Platform — Claude Code Reference

This file is maintained by Claude Code sessions to avoid re-investigating the same areas of the codebase. Update it as new findings are made.

> **v2 staffing-first remodel:** there is a dedicated plan folder at `docs/v2-staffing-remodel/`.
> Start any remodel-related task by reading `docs/v2-staffing-remodel/00-README.md` and
> `docs/v2-staffing-remodel/01-current-state-inventory.md` **before** re-analysing the codebase.
> The current-state inventory there is the canonical pre-remodel snapshot.

---

## Architecture Overview

| Layer | Stack |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, React Router v6, Clerk (auth), i18next |
| Admin Dashboard | Separate React app at `/admin` with its own Vite config |
| Backend API | NestJS (TypeScript), Prisma ORM, PostgreSQL |
| Auth | Clerk (OAuth, email/password, invites, webhooks) |
| File Storage | Local or Cloudflare R2 (configurable via `UPLOAD_MODE`) |

**Monorepo layout:**
```
/frontend      — user-facing React SPA
/admin         — admin-only React SPA
/api           — NestJS REST API (all business logic)
```

---

## Authentication (Clerk)

### Key Files
| File | Purpose |
|---|---|
| `frontend/providers/AuthProvider.tsx` | Clerk session → backend user sync; exposes `useAuthContext()` |
| `frontend/App.tsx` | Route definitions; `ProtectedLayout`; SSO callback route |
| `frontend/pages/LoginPage.tsx` | Login page; `handleSocialLogin()` for Google OAuth |
| `api/src/webhooks/clerk-webhook.controller.ts` | Processes `user.created`, `user.updated`, `user.deleted` Clerk events |
| `api/src/users/users.controller.ts` | User CRUD + `/users/invite` endpoint |

### Google SSO Flow (FIXED — branch `claude/fix-google-sso-redirect-QHihe`)
**Problem:** After Google OAuth, users were redirected back to `/login` because `redirectUrl` pointed to `/` which has no Clerk callback handler.

**Fix:**
- `App.tsx`: Added `<Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />`
- `LoginPage.tsx`: Changed `redirectUrl` to `/sso-callback`, `redirectUrlComplete` to `/`

**Flow after fix:**
1. User clicks Google → OAuth → Clerk redirects to `/sso-callback`
2. `<AuthenticateWithRedirectCallback />` exchanges token → session created
3. User redirected to `/` → `ProtectedLayout` detects `isSignedIn=true`, `currentUser=null`
4. Shows "Complete Your Profile" → navigates to `/signup`
5. User selects role → `/users/complete-profile` API call creates backend user
6. Webhook `user.created` fires → role written to Clerk `publicMetadata`

**Important Clerk Dashboard setting:** `https://yourdomain.com/sso-callback` must be in "Allowed redirect URLs".

### User Invite Flow
- Admin calls `POST /users/invite` → `users.controller.ts` → `this.clerk.invitations.createInvitation({ publicMetadata: { role } })`
- Clerk sends invite email natively
- When user accepts invite and creates account, `user.created` webhook fires with `publicMetadata.role` set
- Webhook creates the backend user record with that role automatically
- `redirectUrl` in invite is set to `${APP_URL}/login` so users land on the platform after accepting

### Webhook Role Resolution Priority (clerk-webhook.controller.ts ~line 504)
```
private_metadata.intendedRole → unsafe_metadata.role → unsafe_metadata.pendingRole → unsafe_metadata.signupType → public_metadata.role
```
If no role is found → user creation is skipped (OAuth users must complete `/signup`).

---

## Email / Mailing System

### Two Sub-systems

| System | Module | Transport | Purpose |
|---|---|---|---|
| Transactional notifications | `email-notification` | `MailingTransportService` (SMTP → Mailgun → SendGrid) | 1-to-1 event-triggered emails (welcome, alerts, etc.) |
| Campaign/newsletter mailing | `mailing` | `MailingTransportService` (same) | Bulk campaigns to segments/lists |

Both systems share `MailingTransportService` which resolves the active transport with priority: **SMTP → Mailgun → SendGrid** (first configured wins).

### Key Files
| File | Purpose |
|---|---|
| `api/src/email-notification/email-notification.service.ts` | Transactional email sending, preference checks, scheduling, analytics |
| `api/src/email-notification/email-template.service.ts` | Template CRUD + 7 seeded starter templates |
| `api/src/mailing/mailing-transport.service.ts` | Picks active transport adapter |
| `api/src/mailing/transports/smtp.transport.ts` | Nodemailer SMTP |
| `api/src/mailing/transports/mailgun.transport.ts` | Mailgun API |
| `api/src/mailing/transports/sendgrid.transport.ts` | SendGrid API |
| `api/src/mailing/mailing.service.ts` | Bulk campaign logic (batch sending, segments, custom lists) |

### Transport Configuration (env vars)
```
# SMTP (primary — configure this first)
MAILING_SMTP_HOST=mail.procrechesolutions.com
MAILING_SMTP_PORT=587
MAILING_SMTP_USER=mail@procrechesolutions.com
MAILING_SMTP_PASS=<password>
MAILING_SMTP_SECURE=false
MAILING_FROM_EMAIL=mail@procrechesolutions.com
MAILING_FROM_NAME=ProCreche Solutions

# Mailgun (secondary)
MAILGUN_API_KEY=<key>
MAILGUN_DOMAIN=<domain>

# SendGrid (tertiary — also used for support emails)
SENDGRID_API_KEY=<key>

# Common
FROM_EMAIL=noreply@procreche.ch
FROM_NAME=Pro Crèche Solutions
APP_URL=https://app.procreche.ch   ← used as invite redirectUrl base
```

### Pre-seeded Email Templates (event keys)
| Event Key | Category | Variables |
|---|---|---|
| `account_verification` | authentication | `firstName`, `verificationUrl` |
| `password_reset` | authentication | `firstName`, `resetUrl` |
| `welcome_email` | onboarding | `firstName`, `role`, `loginUrl` |
| `new_message` | messaging | `firstName`, `senderName`, `messagePreview` |
| `new_lead` | leadManagement | `firstName`, `leadName`, `leadEmail` |
| `parent_lead_confirmation` | leadManagement | `parentName`, `email` |

### Scheduled Email Processing
A `@Cron('0 * * * * *')` job runs every minute in `EmailNotificationService` to dispatch `ScheduledEmail` records whose `scheduledAt` time has passed. `ScheduleModule.forRoot()` is already registered in `app.module.ts`.

### Welcome Email Trigger
After `user.created` webhook successfully creates a user in the DB, `EmailNotificationService.sendNotification()` is called with `event: 'welcome_email'`, `bypassPreferences: true`, `allowUnknownRecipient: false`.

### Admin Campaign Endpoints (`/admin/mailing/*`)
Full CRUD for campaigns, segments, custom lists, export to CSV/XLSX, batch send with progress tracking. All behind `ADMIN`/`SUPER_ADMIN` auth.

---

## Notification Preference Categories
`authentication`, `userManagement`, `jobRecruitment`, `messaging`, `marketplace`, `leadManagement`, `subscription`, `contentModeration`, `systemAdmin`, `marketing`

---

## Database Models (email-related)
`EmailTemplate`, `EmailLog`, `ScheduledEmail`, `UserNotificationPreferences`, `MailingSegment`, `MailingCampaign`, `MailingCustomList`, `MailingCustomListMember`

---

## User Roles
`PARENT`, `EDUCATOR`, `FOUNDATION`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`, `ADMIN`, `SUPER_ADMIN`

Role-based dashboard redirects are in `App.tsx:151` (`RoleBasedDashboardRedirect`).

---

## Known Issues / TODOs
- Webhook idempotency uses an in-memory `Set` (lost on restart) — should use Redis for production
- Support ticket emails use a separate `mailgun.service.ts` in `api/src/support/` — not consolidated with the main transport
- Email delivery tracking webhooks (SendGrid/Mailgun) not implemented — `EmailLog.status` only shows `sent`/`failed`, not `delivered`/`opened`/`clicked`
- User notification preference UI exists in admin but is NOT exposed on the frontend `SettingsPage`
- Unsubscribe token verification endpoint (`/unsubscribe`) is not yet implemented (token generation works)

---

## Admin Dashboard (`/admin`)

Key pages: `Users.tsx`, `MailingList.tsx`, `EmailNotificationPage.tsx`

`Users.tsx` contains:
- `AddUserModal` — invites via `POST /users/invite` (Clerk-backed)
- `ElevateToAdminModal` — promotes to ADMIN/SUPER_ADMIN with audit reason
- `DeleteConfirmModal` — hard/soft delete with `SUDO DELETE USER` confirmation phrase

`MailingList.tsx` has 4 tabs: Build (filter recipients), Lists (custom lists), Segments (saved filters), Campaigns (history + batch send).

---

## API Service (`admin/src/services/api.ts`)
`apiService.inviteUser(apiClient, { email, role, redirectUrl?, reason? })` → `POST /users/invite`

---

## Environment Notes
- `APP_URL` (api `.env`) — platform base URL, used for invite redirect defaults
- `FRONTEND_URL` — alternative to `APP_URL` if set
- `CRAWLER_ENABLED=false` — canton policy crawler is disabled by default
- `MALWARE_SCANNING_ENABLED=false` — ClamAV scanning disabled by default
- Redis is optional; if `REDIS_URL` / `REDIS_HOST` not set, queue workers are disabled
