# Patterns

## NestJS Conventions

### Module structure (`api/src/<module>/`)
```
<module>/
├── <module>.module.ts      — NestJS module definition
├── <module>.controller.ts  — HTTP routes
├── <module>.service.ts     — Business logic
├── dto/                    — Request/response DTOs (class-validator)
└── guards/                 — Module-specific guards (if any)
```

### Guards order
Always apply in this order on controllers:
1. `@UseGuards(ClerkAuthGuard, RolesGuard)` — auth then RBAC
2. `@Roles(UserRole.ADMIN, ...)` — specify allowed roles

Where `ClerkAuthGuard` is from `../auth/guards/clerk-auth.guard` and
`RolesGuard` is from `../auth/guards/roles.guard`. The `UserRole` enum
comes from Prisma's generated client (not `@workspace/types`).

### DTOs
- Use `class-validator` decorators (`@IsString()`, `@IsOptional()`, etc.)
- Use `class-transformer` (`@Type(() => Number)`) for nested types
- Always use `@ApiProperty()` for Swagger docs

### Services
- Inject `PrismaService` for DB access
- Inject other services directly (NestJS handles DI)
- Throw `NotFoundException`, `ForbiddenException` from `@nestjs/common`

## React Conventions

### File structure

```
frontend/
├── pages/        Page-level components (route targets)
├── components/   Feature-domain component directories
├── contexts/     React context providers (AppContext, etc.)
├── hooks/        Custom hooks
├── services/     API fetchers
└── App.tsx       All routes + role guards
```

### Data fetching
- Use `@tanstack/react-query` (`useQuery`, `useMutation`)
- API calls go in `services/` files, not inline in components
- Wrap with `QueryClientProvider` at app root

### Translations
- Always use `useTranslation()` from `react-i18next`
- Never hardcode user-visible strings — use `t('key')`
- Pre-commit hook enforces this

### Role-based rendering
- Check role from `AppContext` (frontend) or session (admin)
- Use route guards in `App.tsx` — don't duplicate in components

## Shared Package Patterns

### @workspace/types
- All cross-app interfaces live here
- Import with `import type { ... } from '@workspace/types'`

### @repo/ui
- Shared primitive components (Button, Input, Card, etc.)
- Import with `import { ... } from '@repo/ui'`
- Do not duplicate these in app-level `components/`
