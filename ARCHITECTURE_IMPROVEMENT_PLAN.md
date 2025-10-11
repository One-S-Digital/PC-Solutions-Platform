# Architecture Improvement Plan

**Status:** Planning Phase  
**Created:** 2025-10-11  
**Priority:** High - Progressive Implementation

---

## Overview

This document outlines a comprehensive plan to harden and modernize the PC Solutions V2 architecture, focusing on:
- Data integrity and idempotency
- Concurrency control and caching
- Authorization and audit trails
- Observability and error handling

## Current State Assessment

✅ **Already Implemented (from recent fixes):**
- R2 orphan cleanup on DB failure (basic version)
- HttpException preservation in controllers
- Enum validation for alertType
- Standardized user ID usage

🔄 **Partially Implemented:**
- File upload flow (needs checksums, idempotency)
- Error handling (needs global filter)
- Auth guards (need composability)

❌ **Not Yet Implemented:**
- Response versioning
- Caching layer
- Real-time updates
- CASL policies
- Audit logging
- Shared types package
- Structured logging
- Metrics/tracing

---

## Implementation Phases

### **PHASE 1: Critical Hardening (Week 1-2)** 🔴
**Goal:** Ensure data integrity, prevent duplicates, standardize errors

#### 1.1 Enhanced Content Upload Flow
**Files:** `api/src/content/content.service.ts`, `api/src/upload/r2.service.ts`

**Tasks:**
- [ ] Add SHA-256 checksum calculation for uploads
- [ ] Implement deterministic key generation (courseId|moduleId|hash)
- [ ] Add ETag verification after upload
- [ ] Wrap DB operations in `$transaction` with rollback
- [ ] Implement idempotency using upsert with composite keys

**Dependencies:** None  
**Risk:** Medium - requires R2 service enhancement  
**Estimate:** 3 days

#### 1.2 Metadata Validation & DTOs
**Files:** `api/src/content/dto/*.dto.ts`, controllers

**Tasks:**
- [ ] Create strict upload DTOs with class-validator
- [ ] Add `@UsePipes(ValidationPipe)` with `whitelist: true, transform: true`
- [ ] Validate file types with `@IsEnum`
- [ ] Add UUID validation for foreign keys
- [ ] Test validation failures return 400

**Dependencies:** None  
**Risk:** Low  
**Estimate:** 2 days

#### 1.3 Response Versioning
**Files:** All service files, Prisma schema

**Tasks:**
- [ ] Add `version` and `revision` to Asset model
- [ ] Create response wrapper utility: `{ version, success, timestamp, data }`
- [ ] Update all service methods to use wrapper
- [ ] Document versioning strategy for future changes

**Dependencies:** None  
**Risk:** Low  
**Estimate:** 2 days

#### 1.4 Global Exception Filter
**Files:** `api/src/common/filters/all-exceptions.filter.ts`

**Tasks:**
- [ ] Create AllExceptionsFilter mapping Prisma/R2 errors
- [ ] Include traceId in error responses
- [ ] Register globally in `main.ts`
- [ ] Test all error paths return consistent shape

**Dependencies:** None  
**Risk:** Low - but requires thorough testing  
**Estimate:** 2 days

**Phase 1 Total:** ~9 days

---

### **PHASE 2: Platform Settings & Caching (Week 3-4)** 🟠
**Goal:** Add concurrency control, caching, real-time updates

#### 2.1 Atomic Updates with Revision Tracking
**Files:** `api/src/platform-settings/*.ts`, Prisma schema

**Tasks:**
- [ ] Add `revision`, `updatedBy` to PlatformSetting model
- [ ] Use `$transaction` with `FOR UPDATE` lock
- [ ] Implement optimistic locking (check revision on update)
- [ ] Add audit fields (actor, timestamp)

**Dependencies:** Phase 1.3 (versioning pattern)  
**Risk:** Medium - database locking semantics  
**Estimate:** 3 days

#### 2.2 Redis Caching Layer
**Files:** `api/src/app.module.ts`, `api/src/platform-settings/platform-settings.service.ts`

**Tasks:**
- [ ] Install `cache-manager`, `cache-manager-redis-store`
- [ ] Configure CacheModule with Redis URL
- [ ] Add cache.get/set to platform settings service
- [ ] Implement cache invalidation on updates
- [ ] Add TTL strategy (60s for hot data)

**Dependencies:** Docker/Redis setup  
**Risk:** Low - well-established pattern  
**Estimate:** 2 days

#### 2.3 WebSocket Real-Time Updates
**Files:** `api/src/platform/maintenance.gateway.ts`, frontend

**Tasks:**
- [ ] Install `@nestjs/websockets`, `socket.io`
- [ ] Create MaintenanceGateway with `/platform` namespace
- [ ] Emit events on `@OnEvent('platform.maintenance.changed')`
- [ ] Create frontend socket client
- [ ] Add reconnection logic and error handling

**Dependencies:** Phase 2.1 (event emission)  
**Risk:** Medium - WebSocket lifecycle management  
**Estimate:** 4 days

**Phase 2 Total:** ~9 days

---

### **PHASE 3: Authorization & Audit (Week 5-6)** 🟡
**Goal:** Implement fine-grained permissions and complete audit trails

#### 3.1 Composite Auth Guards
**Files:** `api/src/auth/guards/auth-pipeline.guard.ts`

**Tasks:**
- [ ] Create AuthPipelineGuard composing Clerk + Roles
- [ ] Ensure proper error propagation
- [ ] Replace individual guards with pipeline
- [ ] Add integration tests

**Dependencies:** None  
**Risk:** Low  
**Estimate:** 2 days

#### 3.2 CASL Policy-Based Authorization
**Files:** `api/src/auth/ability/*.ts`, `api/src/auth/guards/policies.guard.ts`

**Tasks:**
- [ ] Install `@casl/ability`, `@casl/prisma`
- [ ] Create AbilityFactory with role definitions
- [ ] Implement PoliciesGuard and @CheckPolicies decorator
- [ ] Define permissions for PolicyAlert, Content, Users
- [ ] Add subject-level authorization (own vs. all)
- [ ] Document permission matrix

**Dependencies:** Phase 3.1  
**Risk:** High - significant refactor, testing burden  
**Estimate:** 5 days

#### 3.3 Audit Logging Middleware
**Files:** `api/src/prisma/prisma.service.ts`, `api/prisma/schema.prisma`

**Tasks:**
- [ ] Add AuditLog model (entity, entityId, action, actorId, diff)
- [ ] Create Prisma middleware for create/update/delete
- [ ] Add RequestContext.get('userId') via AsyncLocalStorage
- [ ] Store before/after diffs
- [ ] Add audit log viewer endpoint

**Dependencies:** Phase 1.4 (request context)  
**Risk:** Medium - performance impact if not optimized  
**Estimate:** 4 days

**Phase 3 Total:** ~11 days

---

### **PHASE 4: Shared Infrastructure (Week 7)** 🟢
**Goal:** Create shared contracts, improve API docs, add integration tests

#### 4.1 Shared Types Package
**Files:** `packages/types/*`

**Tasks:**
- [ ] Create `packages/types` with tsconfig
- [ ] Define interfaces: ApiEnvelope, ContentPayload, PolicyAlert
- [ ] Export from index.ts
- [ ] Update workspace dependencies
- [ ] Import in API and frontend

**Dependencies:** None  
**Risk:** Low  
**Estimate:** 2 days

#### 4.2 Enhanced OpenAPI/Swagger
**Files:** `api/src/main.ts`, DTOs

**Tasks:**
- [ ] Create ApiEnvelope DTO for @ApiOkResponse
- [ ] Add allOf schemas for response types
- [ ] Generate and serve /docs-json
- [ ] Add examples to schemas
- [ ] Document error codes

**Dependencies:** Phase 4.1  
**Risk:** Low  
**Estimate:** 2 days

#### 4.3 Integration Tests
**Files:** `api/test/e2e/*.spec.ts`

**Tasks:**
- [ ] Install `@nestjs/testing`, `supertest`, `aws-sdk-client-mock`
- [ ] Create test database setup/teardown
- [ ] Mock R2 with aws-sdk-client-mock
- [ ] Write upload flow E2E test
- [ ] Write auth flow tests
- [ ] Add CI workflow

**Dependencies:** Phases 1-3 complete  
**Risk:** Medium - test environment setup  
**Estimate:** 4 days

**Phase 4 Total:** ~8 days

---

### **PHASE 5: Observability (Week 8)** 🔵
**Goal:** Add logging, metrics, tracing for production monitoring

#### 5.1 Request Context Middleware
**Files:** `api/src/common/middleware/request-context.middleware.ts`

**Tasks:**
- [ ] Install `cls-hooked` or Node 16+ AsyncLocalStorage
- [ ] Generate request.id (uuid) per request
- [ ] Store userId after auth guard
- [ ] Add getRequestContext() utility
- [ ] Include traceId in logs and errors

**Dependencies:** Phase 1.4 (exception filter update)  
**Risk:** Low  
**Estimate:** 2 days

#### 5.2 Structured Logging (Pino)
**Files:** `api/src/app.module.ts`, `api/src/common/logger.service.ts`

**Tasks:**
- [ ] Install `pino`, `pino-http`, `pino-pretty`
- [ ] Configure JSON logging for prod, pretty for dev
- [ ] Add correlation IDs to all logs
- [ ] Log request/response times
- [ ] Integrate with NestJS Logger

**Dependencies:** Phase 5.1  
**Risk:** Low  
**Estimate:** 2 days

#### 5.3 Prometheus Metrics
**Files:** `api/src/metrics/metrics.module.ts`

**Tasks:**
- [ ] Install `@willsoto/nestjs-prometheus`, `prom-client`
- [ ] Add /metrics endpoint
- [ ] Track: request duration, error rate, upload size/count
- [ ] Add custom business metrics (active users, content uploads)
- [ ] Document metrics in README

**Dependencies:** None  
**Risk:** Low  
**Estimate:** 2 days

**Phase 5 Total:** ~6 days

---

## Total Effort Estimate
- **Phase 1 (Critical):** 9 days
- **Phase 2 (Caching):** 9 days
- **Phase 3 (Auth):** 11 days
- **Phase 4 (Infrastructure):** 8 days
- **Phase 5 (Observability):** 6 days

**Total:** ~43 developer days (~8.5 weeks for 1 developer, ~4-5 weeks for 2 developers)

---

## Rollout Strategy

### Week 1-2: Phase 1 (MUST DO)
Critical for data integrity. Deploy to staging, soak test for 1 week.

### Week 3-4: Phase 2 (HIGH PRIORITY)
Improves performance and UX. Add Redis to infrastructure.

### Week 5-6: Phase 3 (HIGH PRIORITY)
Security and compliance. Phased rollout per endpoint.

### Week 7: Phase 4 (MEDIUM PRIORITY)
Developer experience improvements. Can be done in parallel.

### Week 8: Phase 5 (MEDIUM PRIORITY)
Production readiness. Essential for scaling.

---

## Risk Mitigation

### High-Risk Items:
1. **CASL Authorization (3.2)** - Extensive testing required
   - Mitigation: Feature flag, gradual rollout per resource
   
2. **WebSocket Gateway (2.3)** - Connection handling complexity
   - Mitigation: Start with maintenance mode only, expand later
   
3. **Audit Logging (3.3)** - Potential performance impact
   - Mitigation: Async writes, dedicated audit DB, sampling in high-volume endpoints

### Testing Requirements:
- [ ] Unit tests for all new services (>80% coverage)
- [ ] Integration tests for critical flows (Phase 4.3)
- [ ] Load testing for cached endpoints
- [ ] Security testing for CASL policies
- [ ] Penetration testing for auth pipeline

---

## Configuration Flags (Phase 1+)

Add to `.env`:
```bash
# Feature Flags
FEATURE_UPLOAD_CHECKSUMS=true
FEATURE_CASL_POLICIES=false
FEATURE_AUDIT_LOGGING=false

# Dev Overrides
DEV_BYPASS_AUTH=false
CACHE_DISABLED=false
SKIP_R2_UPLOADS=false # use local filesystem in dev

# Observability
LOG_LEVEL=info # debug, info, warn, error
METRICS_ENABLED=true
TRACE_ENABLED=false # OpenTelemetry
```

---

## Dependencies to Install

### Phase 1:
```bash
npm install class-validator class-transformer
```

### Phase 2:
```bash
npm install cache-manager cache-manager-redis-store
npm install @nestjs/websockets socket.io
```

### Phase 3:
```bash
npm install @casl/ability @casl/prisma
```

### Phase 4:
```bash
npm install --save-dev supertest aws-sdk-client-mock
```

### Phase 5:
```bash
npm install pino pino-http pino-pretty
npm install @willsoto/nestjs-prometheus prom-client
```

---

## Success Metrics

### Phase 1:
- Zero orphaned R2 files in production
- <1% validation errors in uploads
- All API errors use consistent envelope

### Phase 2:
- Cache hit rate >70% for platform settings
- Real-time updates delivered in <100ms
- Zero cache inconsistencies

### Phase 3:
- 100% of endpoints authorized via CASL
- Complete audit trail for all mutations
- <50ms latency overhead from auth pipeline

### Phase 4:
- Type safety across frontend/backend boundaries
- >90% OpenAPI coverage
- Full E2E test suite passing

### Phase 5:
- <5s to debug issues with traceId
- Prometheus dashboards for all key metrics
- Log aggregation in production

---

## Migration Notes

### Breaking Changes:
- **Phase 1.3:** Response shape changes to include `{ success, version, timestamp, data }`
  - Frontend must adapt to new envelope
  - API version header to support gradual migration

- **Phase 3.2:** Authorization changes may break existing permissions
  - Audit all role assignments
  - Test permission matrix thoroughly

### Database Migrations:
- Add `version`, `etag` to Asset (Phase 1.1)
- Add `revision`, `updatedBy` to PlatformSetting (Phase 2.1)
- Create AuditLog table (Phase 3.3)

### Infrastructure Changes:
- Redis required (Phase 2.2)
- WebSocket support in load balancer (Phase 2.3)
- Prometheus scraping endpoint (Phase 5.3)

---

## Next Steps

1. **Review & Approve:** Stakeholder sign-off on plan and timeline
2. **Environment Setup:** Provision Redis, update Docker Compose
3. **Kick-off Phase 1:** Begin with checksum implementation
4. **Weekly Check-ins:** Monitor progress, adjust estimates
5. **Documentation:** Update as implementation progresses

---

**Document Owner:** Development Team  
**Last Updated:** 2025-10-11  
**Version:** 1.0
