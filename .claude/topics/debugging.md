# Debugging Patterns

## General Flow

1. Check `graphify-out/GRAPH_REPORT.md` to identify the module
2. Read the specific module file — don't grep broadly
3. Check the relevant context/hook in frontend if it's a UI bug
4. Check Prisma schema if it's a data issue

## Common Failure Modes

### Auth / 401
- Clerk JWT expired or not forwarded — check `Authorization` header
- User not synced to DB — check `api/src/modules/auth/` webhook handler
- Missing CASL ability — check `auth/ability.factory.ts`

### Role-based UI not showing
- Route guard in `App.tsx` not matching the role enum value
- `AppContext` not hydrated yet (loading state not handled)
- Clerk user metadata missing `role` field

### i18n key missing / untranslated
- Run `pnpm i18n:extract` then `pnpm i18n:check`
- Check `frontend/src/i18n/locales/` for the key
- Pre-commit hook will catch hardcoded strings

### API 500
- Check NestJS exception filter output in logs
- Check if Prisma migration is out of sync (`pnpm db:status`)
- Redis connection issues — check Bull queue setup

### WebSocket / messaging not connecting
- Check `MessagingContext` — Socket.io client config
- Check `api/src/modules/messaging/` for CORS & auth middleware

### Stripe webhook not processing
- Check `api/src/modules/billing/` webhook controller
- Verify `STRIPE_WEBHOOK_SECRET` env var is set

## Debug Commands

```bash
pnpm db:status          # Check migration state
pnpm i18n:check         # Validate translation coverage
pnpm type-check         # Catch TS errors across all packages
pnpm lint               # ESLint across monorepo
```
