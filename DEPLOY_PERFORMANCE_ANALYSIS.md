# Deployment Performance Analysis

**Date:** 2025-11-12  
**Total Build Time:** ~1 minute 44 seconds (to nest build start)

## Executive Summary

The deployment is slow due to several compounding factors:
1. **Cache extraction**: 39 seconds (largest bottleneck)
2. **Migration resolution**: ~20 seconds for 6 migrations
3. **Monorepo overhead**: Building all 9 workspace packages
4. **Sequential Prisma operations**: Multiple database checks

## Detailed Breakdown

### Timeline Analysis

| Time | Event | Duration | Notes |
|------|-------|----------|-------|
| 09:06:26 | Cache download starts | - | - |
| 09:06:28 | Git clone complete | ~2s | ✅ Fast |
| 09:07:10 | Cache extraction complete | **39s** | ⚠️ MAJOR BOTTLENECK |
| 09:07:36 | Node.js setup | 26s | ⚠️ Slow post-extraction |
| 09:07:41 | pnpm install complete | ~4s | ✅ Reasonable (frozen lockfile) |
| 09:07:46 | Prisma generate complete | 5s | ✅ Normal |
| 09:07:53-09:08:07 | Migration checks | **~20s** | ⚠️ SECOND BOTTLENECK |
| 09:08:10 | Build starts | - | - |

### Key Bottlenecks

#### 1. Cache Extraction (39 seconds) ⚠️⚠️⚠️

**Problem:**
- 490MB cache takes 39 seconds to extract
- This is the single largest bottleneck
- ~80MB/s extraction speed (should be faster)

**Root Causes:**
- Large monorepo with 9+ packages (admin, api, frontend, 5+ shared packages)
- 16,892 lines in pnpm-lock.yaml
- Full workspace dependencies cached
- node_modules contains:
  - NestJS framework and 20+ plugins
  - Multiple AWS SDKs
  - React ecosystem (React 19, TanStack Query, etc.)
  - Build tools (Vite, Turbo, TypeScript, ESLint)
  - Testing frameworks (Jest, Supertest)
  - Database tools (Prisma, multiple migration scripts)

**Impact:**
- 39s / 104s = **37.5% of total build time**

#### 2. Migration Resolution (20 seconds) ⚠️⚠️

**Problem:**
- 6 sequential `npx prisma migrate resolve` calls
- Each takes 2-6 seconds
- Operations are mostly no-ops (already applied)

**Migrations Checked:**
1. `20251108120000_recruitment_enhancements` (rolled-back + applied) - 6s
2. `20251110123000_recruitment_enhancements_cleanup` - 4.5s
3. `20250926_unify_asset_appuser` - 2s
4. `20251017_add_firstname_lastname_to_appuser` - 2s
5. `20251106000123_recreate_user_notification_preferences` - 2s
6. `20251106001000_user_email_nullable` - 2s
7. `20251030_comprehensive_schema_audit_fix` (rolled-back) - 1.6s
8. `20251030_add_stripe_customer_id_if_missing` (rolled-back) - 1.4s

**Root Cause:**
- Each call loads Prisma schema (~1.4s)
- Database connection overhead
- Sequential execution (not parallelizable safely)
- Checking historical migrations on every deploy

**Impact:**
- 20s / 104s = **19.2% of total build time**

#### 3. Monorepo Build Scope

**Problem:**
- `pnpm install --frozen-lockfile` installs dependencies for ALL 9 workspaces
- Even though only building API, entire monorepo is processed

**Workspaces:**
1. admin (React admin panel)
2. api (NestJS backend) ← Only this is deployed
3. frontend (React frontend)
4. packages/eslint-config
5. packages/translations
6. packages/types
7. packages/typescript-config
8. packages/ui

**Impact:**
- Unnecessary dependency installation
- Larger cache size
- More files to extract

#### 4. Production Dependencies Not Optimized

**Issues in api/package.json:**

**Unnecessary in Production:**
- `@nestjs/cli` - Build tool (devDependency)
- `@nestjs/schematics` - Code generation (devDependency)
- `rimraf` - Build cleanup (should be devDependency)

**Duplicate Dependencies:**
- Root package.json has many deps duplicated in api/package.json
- `@nestjs/*`, `@aws-sdk/*`, `@clerk/*`, etc.

**Heavy Dependencies:**
- `@nestjs/swagger` - Full OpenAPI generation (7.0.0)
- Multiple AWS SDK packages (could use client-only subsets)
- `winston` + `nestjs-pino` (two logging frameworks)

## Recommendations

### High Priority (Immediate Impact)

#### 1. Optimize Cache Strategy 🚀
**Impact:** ~20-25s reduction

```yaml
# In render.yaml, consider:
- name: api
  buildCommand: |
    # Only install API dependencies, skip other workspaces
    pnpm install --frozen-lockfile --filter=api --filter=@workspace/types
    cd api && pnpm run build:render
```

**Alternative:** Use `--prod` flag to skip devDependencies
```bash
NODE_ENV=production pnpm install --frozen-lockfile --filter=api
```

#### 2. Optimize Migration Checks 🚀
**Impact:** ~15s reduction

**Option A: Cache migration state**
```bash
# Only check migrations that commonly fail
# Remove checks for old, stable migrations

# In render-build.sh, remove these (always succeed):
# - 20250926_unify_asset_appuser (from Sept 2025)
# - 20251017_add_firstname_lastname_to_appuser (from Oct 2025)
# - 20251106000123_recreate_user_notification_preferences (stable)
# - 20251106001000_user_email_nullable (stable)
```

**Option B: Single batch check**
```bash
# Replace individual checks with one status check
npx prisma migrate status --schema prisma/schema.prisma
# Only resolve if actual failures detected
```

**Implementation:**
```bash
#!/bin/bash
# Check if any migrations actually failed
MIGRATE_STATUS=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1)

if echo "$MIGRATE_STATUS" | grep -q "failed"; then
    echo "🔧 Resolving failed migrations..."
    # Only then run individual resolves
else
    echo "✅ No failed migrations to resolve"
fi
```

#### 3. Move Build Dependencies 🔧
**Impact:** Smaller cache, faster extraction

Move to devDependencies in `api/package.json`:
```json
{
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",  // Already there
    "@nestjs/schematics": "^11.0.0",  // Already there
    "rimraf": "^5.0.5"  // Move from dependencies
  }
}
```

Remove from dependencies:
- Already done for most build tools ✅

### Medium Priority (Incremental Improvement)

#### 4. Use Selective Workspace Installation
**Impact:** ~5-10s reduction in install time

```json
// In api/package.json, explicitly list workspace deps
{
  "dependencies": {
    "@workspace/types": "workspace:*"
  }
}
```

Then use filtered install:
```bash
pnpm install --filter=api --filter=@workspace/types --prod --frozen-lockfile
```

#### 5. Optimize Prisma Operations
**Impact:** ~2-3s reduction

- Use `--skip-generate` on migrate commands (already generated in postinstall)
- Cache Prisma binaries in build image

```bash
# In render-build.sh
npx prisma migrate deploy --schema prisma/schema.prisma --skip-generate
```

#### 6. Audit Heavy Dependencies
**Impact:** Smaller bundle, faster extraction

**Consider:**
- Remove `@nestjs/swagger` if not using API docs in production
- Use `@aws-sdk/client-s3` only (you already do this ✅)
- Choose one logger: either `winston` OR `nestjs-pino`
- Review if `@nestjs/schedule`, `@nestjs/websockets` needed in all environments

### Low Priority (Long-term Optimization)

#### 7. Split Monorepo Cache
**Impact:** Much smaller per-service cache

Configure separate build caches per service:
- API cache: Only api + shared types
- Admin cache: Only admin + shared packages
- Frontend cache: Only frontend + shared packages

#### 8. Pre-built Docker Images
**Impact:** Near-instant deploys

Build Docker images in CI/CD, push to registry:
- Cache layers with dependencies
- Only rebuild app code layer
- Deploy pre-built image (< 10s)

#### 9. Prisma Binary Caching
**Impact:** ~1-2s on Prisma operations

Pre-download Prisma binaries:
```bash
PRISMA_BINARIES_MIRROR=https://binaries.prisma.sh
```

## Current Performance Budget

| Phase | Current | Target | Method |
|-------|---------|--------|--------|
| Cache extraction | 39s | 15s | Filtered install, smaller cache |
| Migration checks | 20s | 5s | Remove stable migration checks |
| Prisma generate | 5s | 4s | Use cached binaries |
| npm install | 4s | 3s | Filtered workspaces |
| Build setup | 26s | 10s | Optimize post-extraction steps |
| **Total (pre-build)** | **94s** | **37s** | **60% reduction** |

## Implementation Plan

### Phase 1: Quick Wins (< 1 hour)
1. ✅ Remove old migration checks from render-build.sh
2. ✅ Move `rimraf` to devDependencies
3. ✅ Add --skip-generate to migrate deploy

### Phase 2: Filtered Install (2-3 hours)
1. Test filtered pnpm install locally
2. Update render.yaml build command
3. Verify all dependencies resolve correctly

### Phase 3: Docker Optimization (1-2 days)
1. Create multi-stage Dockerfile
2. Set up Docker build cache in CI
3. Deploy from pre-built images

## Monitoring

Track these metrics on each deploy:
- Cache download time (target: < 5s)
- Cache extraction time (target: < 15s)
- Migration resolution time (target: < 5s)
- Total build time (target: < 2min)

## Notes

- NODE_ENV=production already set ✅
- Using frozen-lockfile (no package resolution) ✅
- Prisma generate in postinstall (good pattern) ✅
- Most devDependencies already separated ✅

The main issue is cache size (490MB) and unnecessary migration checks on every deploy.
