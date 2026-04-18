# Deployment

## Platform: Render.com

All services are defined in `render.yaml`. Three services:
- `api` — NestJS (web service)
- `frontend` — React SPA (static site)
- `admin` — Admin React SPA (static site)

## Environment Variables

### API required vars
```
DATABASE_URL          PostgreSQL connection string
REDIS_URL             Redis connection string
CLERK_SECRET_KEY      Clerk backend secret
CLERK_WEBHOOK_SECRET  Clerk webhook signing secret
STRIPE_SECRET_KEY     Stripe API key
STRIPE_WEBHOOK_SECRET Stripe webhook signing secret
```

See `env-example-*.txt` files at repo root for full lists.

### Frontend / Admin required vars
```
VITE_API_URL          API base URL
VITE_CLERK_PUBLISHABLE_KEY  Clerk publishable key
```

## Docker (local dev)

```bash
docker-compose up         # Start all services + dependencies
docker-compose up api     # Start only API
```

Config in `docker/` and `docker-compose.yml`.

Override local config in `docker-compose.override.yml`.

## Build Order

Turborepo enforces this via `turbo.json`:
```
typescript-config → eslint-config → types → translations → ui
                                                            ↓
                                              frontend / admin / api
```

## Deploy Steps (manual)

1. Push to `main` — Render auto-deploys on merge
2. Run migrations: `pnpm db:migrate` (in API build command)
3. Check `pnpm db:status` if migration is stuck

## Render Build Commands

- **API**: `pnpm install && pnpm build && pnpm db:migrate`
- **Frontend**: `pnpm install && pnpm build`
- **Admin**: `pnpm install && pnpm build`

## Common Deploy Failures

| Symptom | Check |
|---|---|
| API won't start | `DATABASE_URL` / `REDIS_URL` missing |
| Clerk 401 | `CLERK_SECRET_KEY` wrong or expired |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` mismatch |
| Build fails | Run `pnpm prebuild:render` locally first |
| Migration stuck | Check `api/prisma/migrations/` for conflicts |
