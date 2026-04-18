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

## Render Build Commands (from render.yaml)

```
frontend:  pnpm run prebuild:render && cd frontend && pnpm install && pnpm run build:render
api:       pnpm run prebuild:render && cd api && pnpm install && pnpm run build:render
admin:     pnpm run prebuild:render && cd admin && pnpm install && pnpm run build
```

`pnpm run prebuild:render` runs `scripts/prebuild-lock-check.mjs` — a lock file
validation only. The full API setup (DB migrations, seeds) happens inside `build:render`.

## Deploy Steps (manual)

1. Push to `main` — Render auto-deploys on merge
2. Migrations run automatically as part of `build:render` in the API service
3. Check `pnpm db:status` if migration state is unclear

## Common Deploy Failures

| Symptom | Check |
|---|---|
| API won't start | `DATABASE_URL` / `REDIS_URL` missing or wrong |
| Clerk 401 | `CLERK_SECRET_KEY` wrong or expired |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` mismatch |
| Build fails at lock check | Run `pnpm install` locally to regenerate `pnpm-lock.yaml` |
| Migration stuck | Check `api/prisma/migrations/` for conflicts |
