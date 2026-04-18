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
1. `@UseGuards(JwtAuthGuard)` — validates Clerk JWT
2. `@UseGuards(RolesGuard)` — CASL role check
3. `@Roles(Role.ADMIN, ...)` — specify allowed roles

### DTOs
- Use `class-validator` decorators (`@IsString()`, `@IsOptional()`, etc.)
- Use `class-transformer` (`@Type(() => Number)`) for nested types
- Always use `@ApiProperty()` for Swagger docs

### Services
- Inject `PrismaService` for DB access
- Inject other services directly (NestJS handles DI)
- Throw `NotFoundException`, `ForbiddenException` from `@nestjs/common`

## React Conventions

### File structure (`frontend/src/` and `admin/src/`)
```
components/<domain>/
  <ComponentName>.tsx       — component file
  <ComponentName>.test.tsx  — co-located tests (Vitest)
hooks/
  use<HookName>.ts          — custom hooks
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
- Enum: `Role` — use everywhere, never re-define locally

### @repo/ui
- Shared primitive components (Button, Input, Card, etc.)
- Import with `import { ... } from '@repo/ui'`
- Do not duplicate these in app-level `components/`
