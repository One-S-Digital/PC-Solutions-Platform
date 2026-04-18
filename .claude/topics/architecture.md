# Architecture

## Apps & Responsibilities

| App | URL | Audience |
|---|---|---|
| `frontend/` | / | End users (all 7 roles) |
| `admin/` | /admin | SUPER_ADMIN, ADMIN |
| `api/` | /api | Both frontends + webhooks |

## Request Lifecycle

```
Client → Clerk JWT → NestJS JwtAuthGuard → RolesGuard (CASL)
       → Controller → Service → Prisma (PostgreSQL)
                              → Redis (cache / queues)
                              → External APIs (Stripe, SendGrid, S3)
```

## Role Model

Roles are an enum in `@workspace/types`. Each role gets:
- A dedicated page directory in `frontend/src/pages/<role>/`
- CASL ability definitions in `api/src/modules/auth/`
- Route guards in `frontend/src/App.tsx`

## Module Dependency Rules

- All API modules import from `mod-auth` (guards)
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

- `frontend/src/App.tsx` — all routes + role guards (800+ lines)
- `api/src/app.module.ts` — root NestJS module, imports all 51 modules
- `api/prisma/schema.prisma` — full DB schema
- `render.yaml` — production service definitions
- `turbo.json` — build task graph & caching config
