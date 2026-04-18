# PC-Solutions-Platform

## Graph-First Navigation

Before any broad repo exploration, **read `graphify-out/GRAPH_REPORT.md`** first.
Use it to identify the relevant module/path, then do targeted reads only.

## Working Rules

- Read graph report → identify module → targeted `Read`/`Grep` on that path
- Avoid repo-wide `Glob`/`Grep` unless the graph is missing or stale
- Summarize command output; do not paste full logs
- Keep edits scoped to the task; do not touch unrelated files
- For architecture questions, consult `graphify-out/GRAPH_REPORT.md` first
- Load `.claude/topics/` files only when the task explicitly needs them

## Search Lanes

| Issue area | Start here |
|---|---|
| UI / frontend pages | `frontend/src/pages/` |
| Frontend components | `frontend/src/components/` |
| Frontend state / hooks | `frontend/src/contexts/`, `frontend/src/hooks/` |
| Admin dashboard | `admin/src/` |
| API modules | `api/src/<module-name>/` |
| Auth / sessions / RBAC | `api/src/auth/`, `frontend/src/contexts/` |
| Billing / Stripe | `api/src/billing/` |
| Real-time messaging | `api/src/messaging/` |
| i18n / translations | `packages/translations/`, `frontend/src/i18n/` |
| Shared types | `packages/types/src/` |
| Shared UI components | `packages/ui/src/` |
| Database / migrations | `api/prisma/` |
| Config / build / deploy | `turbo.json`, `render.yaml`, `docker/` |
| Tests | `**/*.spec.ts`, `frontend/tests/` |
| Scripts / automation | `scripts/` |

## Tech Stack (quick ref)

- **Monorepo**: Turborepo + pnpm 9
- **Frontend**: React 19 + Vite + Tailwind + React Query + react-router-dom 7
- **Admin**: React 19 + Vite (separate app, same auth)
- **API**: NestJS 11 + Prisma 6 + PostgreSQL + Redis + Socket.io
- **Auth**: Clerk (JWT + webhook sync to DB)
- **Roles**: SUPER_ADMIN · ADMIN · FOUNDATION · PRODUCT_SUPPLIER · SERVICE_PROVIDER · EDUCATOR · PARENT

## Topic Files (load only when relevant)

- `.claude/topics/architecture.md` — system design, data flow, role model, module map
- `.claude/topics/debugging.md` — debugging patterns, common failure modes
- `.claude/topics/patterns.md` — NestJS/React conventions, file structure rules
- `.claude/topics/deployment.md` — Render.com deploy, env vars, Docker setup
