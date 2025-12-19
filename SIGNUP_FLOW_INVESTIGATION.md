# Signup Flow Investigation Results

## Current Behavior
- [x] Signup collects: role selection, organization details (name, phone, canton, capacity/service metadata), contact person name, email, password, captcha, and for parents child age/start date (`frontend/pages/SignupPage.tsx`).
- [x] Collected data is stored with Clerk; only `email`, `password`, and `contactPerson` (split to first/last name) become primary fields while role, organisation name, phone, and canton are persisted in `unsafeMetadata` for downstream processing.
- [x] Frontend waits for provisioning by polling `/api/users/webhook-status`, which only checks for an `AppUser` row via `UsersService.findAppUserByClerkId` and marks the account ready as soon as that record exists.
- [ ] Backend currently ensures a full `User` profile exists for every authenticated request; controllers call Prisma directly and fail if the `users` row is missing.

## Root Causes Identified
1. **`User` creation is best-effort only.** The Clerk webhook (`api/src/webhooks/clerk-webhook.controller.ts`) upserts both `app_users` and `users`, but this is the *only* place that guarantees the profile. If the webhook is delayed, retried, or fails (e.g., idempotency cache, network, or Prisma constraint), no alternative path creates the `users` row.
2. **`SettingsController` assumes `users` exists.** Every endpoint calls `getUserByClerkId`, which throws `NotFoundException`. For fresh signups that only have an `AppUser`, this bubbles up as a 500 because there is no global exception filter and no bootstrap step.
3. **Identity bootstrap is scattered.** Clerk auth guard hydrates `req.context.userId` with the Clerk ID, but there is no shared service to reconcile `AppUser`, `User`, and notification preferences. Each controller repeats direct Prisma calls, increasing the chance of divergence.
4. **Webhook status check gives false confidence.** The `/users/webhook-status` endpoint only verifies the presence of an `AppUser`. The frontend proceeds once that row exists, even if the corresponding `User` profile is missing, guaranteeing first-load failures on pages that expect profile data.

## Data Collection Points
- **Clerk signup (frontend):** role selection, organization info, contact name, email, password, captcha token, child info for parents. Selected role and org metadata end up in Clerk `unsafeMetadata` (`SignupPage.tsx`).
- **Onboarding flow:** no dedicated onboarding module; all profile collection happens in the signup form and is deferred to later settings/profile flows.
- **Profile completion post-signup:** relies on `/settings` endpoints, which currently expect the `users` table to be populated ahead of time.

## Notes
- There is a legacy `WebhooksController`/`WebhooksService` pair that only provisions `AppUser` records via `usersService.syncWithClerk`. The active module now uses `ClerkWebhookController`, but the legacy code demonstrates why `users` rows were historically missing.
- `ClerkWebhookController.handleUserCreated` upserts `app_users` and `users` using the same UUID (`appUser.id`), yet there is no 1:1 relation in Prisma. The upcoming backfill/migration will formalize this link.
- No interceptor or service currently ensures `users`/preferences exist on demand; introducing `PrincipalService` will become the single entry point for identity bootstrap.
