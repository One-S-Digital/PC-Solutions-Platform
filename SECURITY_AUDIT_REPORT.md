# End-to-End Security Audit Report

**Date:** 2026-02-10
**Scope:** Full platform — API (NestJS), Frontend (React/Vite), Admin (React/Vite), Database (PostgreSQL/Prisma), Infrastructure (Docker/Nginx)
**Branch:** `cursor/end-to-end-security-audit-c402`

---

## Executive Summary

This audit examined the entire ProCreche Solutions platform across authentication, authorization, input validation, data exposure, injection attacks, transport security, file uploads, webhooks, WebSockets, and infrastructure hardening. **10 findings** were identified, ranging from Critical to Informational severity. All Critical and High findings include actionable fixes applied in this branch.

---

## Audit Methodology

| Area | What Was Reviewed |
|---|---|
| **Authentication** | Clerk JWT verification, token handling, session management |
| **Authorization** | RBAC guards, @Public() decorator usage, CASL policies, role escalation |
| **API Security** | CORS, rate limiting (Throttler), Helmet, input validation (class-validator), error handling |
| **Database** | Prisma ORM usage, raw SQL queries, SQL injection vectors, migration security |
| **File Uploads** | MIME validation, ClamAV integration, file size limits, storage key path traversal |
| **Webhooks** | Clerk webhook HMAC verification, Stripe `constructEvent` signature check |
| **WebSockets** | JWT auth on connect, room-level authorization, CORS config |
| **Frontend** | XSS via `dangerouslySetInnerHTML`, DOMPurify usage, token storage, secure URL handling |
| **Admin** | Admin-specific auth, role guards, input sanitization |
| **Infrastructure** | Nginx security headers, Docker config, environment secrets, Swagger exposure |

---

## Findings

### SEC-01 — RolesGuard Development-Mode Bypass [CRITICAL]

**File:** `api/src/auth/guards/roles.guard.ts` (lines 48-53)
**Risk:** In non-production environments (`NODE_ENV !== 'production'`), the `RolesGuard` **completely skips authorization** when `request.context` is missing. If a staging/preview environment runs with `NODE_ENV=development`, any authenticated user bypasses role checks.

```typescript
// BEFORE (vulnerable)
const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment && !userContext) {
  console.log('🔧 Development mode: Bypassing roles guard for', request.url);
  return true;
}
```

**Fix:** Remove the development bypass entirely. Authorization should never be skipped.

---

### SEC-02 — Clerk Webhook Signature Bypass When Secret Missing [CRITICAL]

**File:** `api/src/webhooks/webhooks.service.ts` (lines 18-22)
**Risk:** When `CLERK_WEBHOOK_SECRET` is not set, `verifyClerkWebhook()` returns `true`, allowing **any payload** to be accepted as a valid webhook. An attacker can forge user creation/update/deletion events.

```typescript
// BEFORE (vulnerable)
if (!secret) {
  this.logger.warn('CLERK_WEBHOOK_SECRET not configured');
  return true; // Skip verification in development
}
```

**Fix:** Return `false` when the secret is missing. Never accept unverified webhooks.

---

### SEC-03 — Public Health Endpoints Expose User Data [HIGH]

**File:** `api/src/health/health.controller.ts` (lines 107-243)
**Risk:** The `/api/health/snapshot`, `/api/health/users`, and `/api/health/app-users` endpoints are marked `@Public()` and expose user IDs, Clerk IDs, emails, roles, and creation dates **without any authentication**.

The `/api/health/users` endpoint even supports querying by email or Clerk ID, effectively creating an unauthenticated user enumeration/lookup API.

**Fix:** Remove these debug endpoints or protect them behind admin authentication.

---

### SEC-04 — XSS in Admin AssetUploader via dangerouslySetInnerHTML [HIGH]

**File:** `admin/src/components/AssetUploader.tsx` (line 331)
**Risk:** The preview URL is interpolated directly into HTML via `dangerouslySetInnerHTML` without sanitization. If an attacker controls the `previewUrl` (e.g., via a manipulated asset record), they can inject arbitrary JavaScript.

```typescript
// BEFORE (vulnerable)
dangerouslySetInnerHTML={{ __html: `<img src="${previewUrl}" ...>` }}
```

**Fix:** Use a standard `<img>` tag with the `src` attribute bound via React props (which auto-escapes).

---

### SEC-05 — Stripe Webhook Endpoint Has No Signature Verification [HIGH]

**File:** `api/src/webhooks/webhooks.controller.ts` (lines 59-65)
**Risk:** The `POST /api/webhooks/stripe` endpoint accepts `any` payload body without verifying the Stripe signature. An attacker can send forged events to manipulate subscriptions. (Note: there *is* a separate `billing/webhook.controller.ts` that does verify — but this unprotected endpoint also exists.)

```typescript
// BEFORE (vulnerable — no verification at all)
@Post('stripe')
async stripeWebhook(@Body() payload: any) {
  this.logger.log('Received Stripe webhook');
  return { success: true };
}
```

**Fix:** Remove this stub or wire it to the proper signature-verified handler.

---

### SEC-06 — `$queryRawUnsafe` in Debug Controller [MEDIUM]

**File:** `api/src/health/render-debug.controller.ts` (lines 65-77)
**Risk:** Uses `$queryRawUnsafe` with hardcoded SQL (no user input interpolated). While there's no direct injection vector today since parameters are static, `$queryRawUnsafe` is inherently dangerous and could become vulnerable if the code evolves. The endpoint is also `@Public()` (protected by a separate debug token).

**Fix:** Replace `$queryRawUnsafe` with tagged-template `$queryRaw` which uses parameterized queries.

---

### SEC-07 — Missing Content-Security-Policy in Nginx [MEDIUM]

**Files:** `frontend/nginx.conf`, `admin/nginx.conf`
**Risk:** Both nginx configs have `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection`, but are **missing a Content-Security-Policy (CSP)** header. CSP is the strongest defense against XSS, clickjacking, and data injection attacks.

**Fix:** Add a CSP header appropriate for the app's requirements.

---

### SEC-08 — Excessive Debug Logging of Sensitive Data [MEDIUM]

**Files:** Multiple files across the API
**Risk:** Several areas log sensitive information that could end up in production logs:
- `RolesGuard` (line 57): Logs full `userContext` including userId, role on every request
- `WebhooksService` (line 65): Logs full `unsafe_metadata` and email addresses
- `AllExceptionsFilter` (lines 70-93): Logs full error objects including Prisma metadata with `console.error`
- `ClerkAuthGuard` (line 116): Token diagnostics logged when `AUTH_DEBUG=true`

**Fix:** Wrap debug logging behind `NODE_ENV !== 'production'` checks or remove. Redact PII from production logs.

---

### SEC-09 — Compat Controller CRUD Operations Marked @Public() [HIGH]

**File:** `api/src/compat/compat.controller.ts`
**Risk:** The compat controller marks write operations (`createOrganization`, `updateOrganization`, `deleteOrganization`) as `@Public()`, allowing unauthenticated access to modify organizations. While some read endpoints being public is intentional, **write operations must require authentication**.

Lines: 834 (create), 867 (update), 903 (delete)

**Fix:** Remove `@Public()` from write operations.

---

### SEC-10 — WebSocket CORS Uses `process.env` at Module Scope [LOW]

**Files:** `api/src/messaging/messaging.gateway.ts`, `api/src/support/support.gateway.ts`
**Risk:** The `@WebSocketGateway` decorator reads `process.env.FRONTEND_URL` and `process.env.ADMIN_URL` at **module load time** (class decoration), not at runtime via `ConfigService`. If environment variables aren't set when the module loads (e.g., in some container orchestration flows), the CORS origins will default to `localhost`, potentially allowing broader access than intended. Also, the env var names (`FRONTEND_URL`/`ADMIN_URL`) differ from the CORS config in `main.ts` (`ADMIN_ORIGIN`/`APP_ORIGIN`).

**Fix:** Use consistent env var names and consider moving CORS config to a factory.

---

## Positive Findings (What's Done Well)

| Area | Assessment |
|---|---|
| **Clerk JWT Verification** | Properly uses `@clerk/backend` `verifyToken` with `authorizedParties`, `issuer`, and `clockSkewInMs` |
| **Global ValidationPipe** | Configured with `whitelist: true` and `forbidNonWhitelisted: true` — strips unknown properties |
| **Helmet** | Enabled globally with sensible defaults |
| **Rate Limiting** | Multi-tier throttling (short/medium/long + auth + upload specific) |
| **File Upload Security** | Deep MIME validation (magic bytes), extension checking, MIME mismatch detection, ClamAV integration, file size limits, upload rate limiting |
| **Prisma ORM** | Almost all database access uses Prisma's parameterized queries — no SQL injection risk |
| **Raw SQL (Translation Service)** | Uses `Prisma.sql` tagged templates with proper parameterization |
| **Stripe Billing Webhook** | `billing/webhook.controller.ts` properly uses `stripe.webhooks.constructEvent` with signature verification |
| **WebSocket Auth** | Both messaging and support gateways verify Clerk JWT on connection and check room membership |
| **Frontend DOMPurify** | `HelpModal` and `EmailNotificationPage` properly sanitize HTML through DOMPurify before `dangerouslySetInnerHTML` |
| **Secure URL Utility** | `secureUrl.ts` includes path traversal detection and converts public R2 URLs to authenticated download paths |
| **Download Authorization** | Upload download endpoint verifies file ownership/admin status before serving files |
| **Account Suspension** | `ClerkAuthGuard` checks `isActive` flag and returns 403 for suspended accounts |
| **Maintenance Mode** | Global middleware with proper allow-list for health/webhook/auth routes, admin bypass |
| **Audit Middleware** | Prisma middleware logs mutations on critical models with actor, IP, and trace ID |
| **CORS Configuration** | Production CORS strictly limits origins to known domains |
| **Swagger** | Disabled in production (`NODE_ENV !== 'production'`) |
| **Request Tracing** | Request ID middleware for correlation |

---

## Remediation Priority

| Priority | Finding | Severity | Effort |
|---|---|---|---|
| 1 | SEC-01: RolesGuard dev bypass | Critical | Low |
| 2 | SEC-02: Webhook sig bypass | Critical | Low |
| 3 | SEC-09: Public CRUD on compat | High | Low |
| 4 | SEC-03: Health data exposure | High | Low |
| 5 | SEC-04: Admin XSS | High | Low |
| 6 | SEC-05: Stripe stub endpoint | High | Low |
| 7 | SEC-06: $queryRawUnsafe | Medium | Low |
| 8 | SEC-07: Missing CSP | Medium | Medium |
| 9 | SEC-08: Debug logging | Medium | Medium |
| 10 | SEC-10: WS CORS env vars | Low | Low |

---

*All fixes are applied in this branch. See individual commits for details.*
