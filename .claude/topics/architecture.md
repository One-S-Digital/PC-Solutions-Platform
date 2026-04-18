# Architecture

## Apps & Responsibilities

| App | URL | Audience |
|---|---|---|
| `frontend/` | / | End users (all 7 roles) |
| `admin/` | /admin | SUPER_ADMIN, ADMIN |
| `api/` | /api | Both frontends + webhooks |

## Request Lifecycle

```
Client → Clerk JWT → NestJS ClerkAuthGuard → RolesGuard (CASL)
       → Controller → Service → Prisma (PostgreSQL)
                              → Redis (cache / queues)
                              → External APIs (Stripe, SendGrid, S3)
```

## Role Model

Roles are defined as `UserRole` in Prisma's generated client. Each role gets:
- Page files in `frontend/pages/` (route targets in `frontend/App.tsx`)
- CASL ability definitions in `api/src/auth/ability/`
- Route guards in `frontend/App.tsx`

## Module Dependency Rules

- All API modules import `ClerkAuthGuard` from `api/src/auth/guards/`
- `mod-marketplace` → `mod-billing` (subscription gating)
- `mod-leads` → `mod-mailing` (notifications)
- `mod-email-notification` → `mod-mailing` (transport)
- `mod-dashboard` → `mod-analytics` (data source)
- `mod-elearning` → `mod-content` (content storage)

## Shared Packages Build Order

```
typescript-config → eslint-config → types → translations → ui
                                                            ↓
                                              frontend / admin / api
```

## Key Files to Know

- `frontend/App.tsx` — all routes + role guards
- `api/src/app.module.ts` — root NestJS module, imports all modules
- `api/prisma/schema.prisma` — full DB schema
- `render.yaml` — production service definitions
- `turbo.json` — build task graph & caching config
