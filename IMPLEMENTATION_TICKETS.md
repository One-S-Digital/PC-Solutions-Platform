# Implementation Tickets - Architecture Improvement Plan

**Generated:** 2025-10-11  
**Total Tickets:** 25  
**Epic:** Architecture Hardening & Modernization

---

## Table of Contents
- [Phase 1: Critical Hardening](#phase-1-critical-hardening) (Tickets 1-7)
- [Phase 2: Platform Settings & Caching](#phase-2-platform-settings--caching) (Tickets 8-12)
- [Phase 3: Authorization & Audit](#phase-3-authorization--audit) (Tickets 13-18)
- [Phase 4: Shared Infrastructure](#phase-4-shared-infrastructure) (Tickets 19-22)
- [Phase 5: Observability](#phase-5-observability) (Tickets 23-25)

---

# Phase 1: Critical Hardening

## Ticket #1: Add SHA-256 Checksums to R2 Upload Service

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P0 - Critical  
**Estimate:** 2 days  
**Labels:** backend, api, r2, security

### Description
Enhance the R2 upload service to calculate and verify SHA-256 checksums for all file uploads to ensure data integrity during transfer and storage.

### Acceptance Criteria
- [ ] Calculate SHA-256 hash for file buffer before upload
- [ ] Pass `ChecksumSHA256` to R2 putObject command (base64 encoded)
- [ ] Verify ETag matches expected hash after upload
- [ ] Handle checksum mismatch errors with proper cleanup
- [ ] Add unit tests for hash calculation
- [ ] Add integration test for end-to-end checksum flow

### Technical Details
```typescript
// api/src/upload/r2.service.ts
import { createHash } from 'crypto';

async upload(key: string, stream: Buffer, opts: UploadOptions) {
  const checksum = createHash('sha256').update(stream).digest('base64');
  
  const result = await this.client.putObject({
    Key: key,
    Body: stream,
    ContentType: opts.contentType,
    ChecksumSHA256: checksum,
  });
  
  const head = await this.client.headObject({ Key: key });
  const etag = head.ETag?.replace(/"/g, '');
  
  return { url: this.publicUrl(key), etag, checksum };
}
```

### Files to Modify
- `api/src/upload/r2.service.ts`
- `api/src/upload/cloudflare-r2.service.ts`
- `api/src/upload/r2.service.spec.ts` (new)

### Dependencies
- None

### Testing
```bash
# Unit test
npm run test -- r2.service.spec.ts

# Manual test - upload should succeed
curl -X POST http://localhost:3002/content/elearning/upload \
  -F "file=@test.pdf" \
  -F "courseId=xxx" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Ticket #2: Implement Deterministic Key Generation for Idempotent Uploads

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P0 - Critical  
**Estimate:** 2 days  
**Labels:** backend, api, idempotency

### Description
Generate deterministic storage keys based on content identity to prevent duplicate uploads and enable retry safety.

### Acceptance Criteria
- [ ] Key format: `{type}/{courseId}/{moduleId}/{hash}.{ext}`
- [ ] Use SHA-256 hash of file content as part of key
- [ ] Implement `keygen()` utility function
- [ ] Update upload services to use deterministic keys
- [ ] Add conflict resolution strategy (upsert vs. error)
- [ ] Test that identical file upload returns same URL
- [ ] Document key structure in README

### Technical Details
```typescript
// api/src/upload/key-generator.service.ts
@Injectable()
export class KeyGeneratorService {
  generate(file: Express.Multer.File, metadata: { courseId: string; moduleId: string }): string {
    const hash = createHash('sha256')
      .update(file.buffer)
      .digest('hex')
      .substring(0, 16); // first 16 chars
    
    const ext = file.originalname.split('.').pop();
    return `elearning/${metadata.courseId}/${metadata.moduleId}/${hash}.${ext}`;
  }
}
```

### Files to Modify
- `api/src/upload/key-generator.service.ts` (new)
- `api/src/content/content.service.ts`
- `api/src/content-management/content-management.service.ts`

### Dependencies
- Ticket #1 (checksums)

### Testing
```typescript
// Upload same file twice - should get same URL
const upload1 = await uploadService.uploadElearningContent(file, dto, userId);
const upload2 = await uploadService.uploadElearningContent(file, dto, userId);
expect(upload1.publicUrl).toBe(upload2.publicUrl);
```

---

## Ticket #3: Wrap Upload DB Operations in Transactions

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P0 - Critical  
**Estimate:** 2 days  
**Labels:** backend, api, database, prisma

### Description
Ensure atomicity of multi-step database writes during content upload by wrapping Course/Module/Lesson/Asset creation in Prisma transactions.

### Acceptance Criteria
- [ ] Use `prisma.$transaction()` for all upload flows
- [ ] Include Course, Module, Lesson, Asset creation in single transaction
- [ ] Use `upsert` where appropriate for idempotency
- [ ] Rollback on any failure within transaction
- [ ] Add timeout configuration (default 5s)
- [ ] Test transaction rollback behavior
- [ ] Add logging for transaction start/commit/rollback

### Technical Details
```typescript
// api/src/content/content.service.ts
const result = await this.prisma.$transaction(async (tx) => {
  const course = await tx.course.upsert({
    where: { id: dto.courseId },
    update: { title: dto.title },
    create: { id: dto.courseId, title: dto.title, createdBy: userId },
  });

  const module = await tx.courseModule.upsert({
    where: { id: dto.moduleId },
    update: {},
    create: { id: dto.moduleId, courseId: course.id, title: 'Main' },
  });

  const lesson = await tx.courseLesson.create({
    data: {
      moduleId: module.id,
      title: dto.title,
      asset: {
        create: {
          key: uploadResult.key,
          url: uploadResult.url,
          etag: uploadResult.etag,
          checksum: uploadResult.checksum,
        },
      },
    },
    include: { asset: true },
  });

  return { course, module, lesson };
}, { timeout: 5000 });
```

### Files to Modify
- `api/src/content/content.service.ts` (uploadElearningContent, uploadHrDocument, uploadStatePolicy)
- `api/src/content-management/content-management.service.ts` (createContentItem)

### Dependencies
- Ticket #2 (deterministic keys)

### Testing
```typescript
// Simulate DB failure after upload
jest.spyOn(prisma.course, 'create').mockRejectedValue(new Error('DB error'));
await expect(uploadService.uploadElearningContent(file, dto, userId))
  .rejects.toThrow();
// Verify R2 object was cleaned up
const exists = await r2Service.exists(key);
expect(exists).toBe(false);
```

---

## Ticket #4: Create Strict Upload DTOs with Validation

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P1 - High  
**Estimate:** 1.5 days  
**Labels:** backend, api, validation

### Description
Define strict TypeScript DTOs with class-validator decorators for all upload endpoints to validate request payloads before processing.

### Acceptance Criteria
- [ ] Create `UploadElearningDto`, `UploadHrDocumentDto`, `UploadStatePolicyDto`
- [ ] Add validators: `@IsUUID`, `@IsString`, `@IsEnum`, `@IsOptional`
- [ ] Validate file types: `@IsIn(['video','pdf','image','audio'])`
- [ ] Add language validation: `@IsIn(['en','fr','de'])`
- [ ] Apply `ValidationPipe` with `whitelist: true, transform: true`
- [ ] Return 400 with descriptive errors on validation failure
- [ ] Add DTO documentation with JSDoc
- [ ] Test all validation rules

### Technical Details
```typescript
// api/src/content/dto/upload-elearning.dto.ts
import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';

export enum ContentType {
  VIDEO = 'video',
  PDF = 'pdf',
  IMAGE = 'image',
  AUDIO = 'audio',
}

export class UploadElearningDto {
  @IsUUID()
  courseId!: string;

  @IsUUID()
  moduleId!: string;

  @IsString()
  title!: string;

  @IsEnum(ContentType)
  type!: ContentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['en', 'fr', 'de'])
  language?: 'en' | 'fr' | 'de';

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDuration?: number; // minutes
}
```

### Files to Create
- `api/src/content/dto/upload-elearning.dto.ts`
- `api/src/content/dto/upload-hr-document.dto.ts`
- `api/src/content/dto/upload-state-policy.dto.ts`

### Files to Modify
- `api/src/content/content.controller.ts`

### Dependencies
- None

### Testing
```typescript
// Invalid courseId
const invalidDto = { courseId: 'not-a-uuid', moduleId: uuid(), title: 'Test', type: 'pdf' };
await expect(controller.uploadElearning(file, invalidDto)).rejects.toThrow(BadRequestException);

// Invalid type
const invalidType = { courseId: uuid(), moduleId: uuid(), title: 'Test', type: 'invalid' };
await expect(controller.uploadElearning(file, invalidType)).rejects.toThrow(BadRequestException);
```

---

## Ticket #5: Implement Response Versioning and Envelope

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P1 - High  
**Estimate:** 2 days  
**Labels:** backend, api, breaking-change

### Description
Standardize all API responses with a versioned envelope structure: `{ success, version, timestamp, data }`.

### Acceptance Criteria
- [ ] Create `ApiEnvelope<T>` interface/class
- [ ] Add `version` field to Prisma Asset model
- [ ] Create `ResponseWrapperService` with `wrap()` method
- [ ] Update all service methods to return wrapped responses
- [ ] Add `EnvelopeInterceptor` for automatic wrapping (optional)
- [ ] Support `Accept-Version` header for future migrations
- [ ] Update API documentation
- [ ] Add frontend adapter for new envelope

### Technical Details
```typescript
// api/src/common/dto/api-envelope.dto.ts
export interface ApiEnvelope<T> {
  success: boolean;
  version: number;
  timestamp: string;
  data?: T;
  error?: any;
}

// api/src/common/services/response-wrapper.service.ts
@Injectable()
export class ResponseWrapperService {
  wrap<T>(data: T, version = 1): ApiEnvelope<T> {
    return {
      success: true,
      version,
      timestamp: new Date().toISOString(),
      data,
    };
  }
}

// Prisma schema update
model Asset {
  id        String   @id @default(cuid())
  key       String   @unique
  url       String
  etag      String?
  checksum  String?
  version   Int      @default(1)
  createdAt DateTime @default(now())
}
```

### Files to Modify
- `api/prisma/schema.prisma`
- `api/src/common/dto/api-envelope.dto.ts` (new)
- `api/src/common/services/response-wrapper.service.ts` (new)
- All service files (gradual rollout)

### Dependencies
- None (but coordinate with frontend team)

### Migration Steps
1. Add schema field (non-breaking)
2. Create wrapper service
3. Update services one-by-one
4. Add frontend adapter
5. Deprecate old format after 2 releases

---

## Ticket #6: Create Global Exception Filter

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P1 - High  
**Estimate:** 2 days  
**Labels:** backend, api, error-handling

### Description
Implement a global exception filter to map all errors (Prisma, R2, custom) to consistent API error responses with trace IDs.

### Acceptance Criteria
- [ ] Create `AllExceptionsFilter` implementing `ExceptionFilter`
- [ ] Map Prisma errors (P2xxx codes) to 400/404/409
- [ ] Map R2/S3 errors (NoSuchKey, etc.) to 404/500
- [ ] Preserve NestJS `HttpException` status codes
- [ ] Include `traceId` in error response
- [ ] Log all errors with stack traces
- [ ] Register filter globally in `main.ts`
- [ ] Test all error types return correct status/shape

### Technical Details
```typescript
// api/src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const normalized = this.normalizeError(exception);
    const traceId = request.id || 'unknown';

    this.logger.error({
      traceId,
      error: exception.message,
      stack: exception.stack,
      path: request.url,
    });

    response.status(normalized.status).json({
      success: false,
      version: 1,
      timestamp: new Date().toISOString(),
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      traceId,
    });
  }

  private normalizeError(exception: any) {
    // Prisma errors
    if (exception.code?.startsWith('P2')) {
      if (exception.code === 'P2002') return { status: 409, code: 'DUPLICATE', message: 'Resource already exists' };
      if (exception.code === 'P2025') return { status: 404, code: 'NOT_FOUND', message: 'Resource not found' };
      return { status: 400, code: 'DB_ERROR', message: exception.meta?.cause ?? exception.message };
    }

    // R2/S3 errors
    if (exception.name === 'NoSuchKey') return { status: 404, code: 'NOT_FOUND', message: 'File not found in storage' };
    if (exception.name === 'AccessDenied') return { status: 403, code: 'FORBIDDEN', message: 'Storage access denied' };

    // NestJS HttpException
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        code: exception.name,
        message: exception.message,
        details: exception.getResponse(),
      };
    }

    // Unknown error
    return { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
  }
}
```

### Files to Create
- `api/src/common/filters/all-exceptions.filter.ts`
- `api/src/common/filters/all-exceptions.filter.spec.ts`

### Files to Modify
- `api/src/main.ts`

### Dependencies
- Ticket #5 (response envelope)

### Testing
```typescript
// Test Prisma duplicate error
await prisma.user.create({ data: { email: 'test@example.com' } });
const response = await request(app).post('/users').send({ email: 'test@example.com' });
expect(response.status).toBe(409);
expect(response.body.error.code).toBe('DUPLICATE');

// Test R2 not found
const response = await request(app).get('/content/files/nonexistent');
expect(response.status).toBe(404);
expect(response.body.error.code).toBe('NOT_FOUND');
```

---

## Ticket #7: Add Database Migrations for Phase 1

**Epic:** Phase 1 - Critical Hardening  
**Priority:** P1 - High  
**Estimate:** 0.5 days  
**Labels:** backend, database, migration

### Description
Create and test database migrations for new fields added in Phase 1 (Asset checksums, versions).

### Acceptance Criteria
- [ ] Create migration for Asset table updates
- [ ] Add indexes on `key`, `etag` fields
- [ ] Set default values for existing records
- [ ] Test migration on copy of production data
- [ ] Write rollback script
- [ ] Document migration steps in README

### Technical Details
```prisma
// api/prisma/schema.prisma
model Asset {
  id        String   @id @default(cuid())
  key       String   @unique
  url       String
  etag      String?
  checksum  String?  // SHA-256 base64
  version   Int      @default(1)
  mimeType  String?
  size      Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([key])
  @@index([etag])
}
```

### Files to Modify
- `api/prisma/schema.prisma`

### Commands
```bash
# Generate migration
cd api && npx prisma migrate dev --name add-asset-checksums

# Test on staging
DATABASE_URL=$STAGING_DB_URL npx prisma migrate deploy

# Rollback if needed
psql $DATABASE_URL -c "ALTER TABLE \"Asset\" DROP COLUMN checksum, DROP COLUMN version;"
```

### Dependencies
- Tickets #1, #2, #5

---

# Phase 2: Platform Settings & Caching

## Ticket #8: Add Revision Tracking to Platform Settings

**Epic:** Phase 2 - Platform Settings  
**Priority:** P1 - High  
**Estimate:** 2 days  
**Labels:** backend, database, concurrency

### Description
Implement revision tracking and optimistic locking for platform settings to prevent concurrent update conflicts.

### Acceptance Criteria
- [ ] Add `revision`, `updatedBy` to PlatformSetting model
- [ ] Increment revision on every update
- [ ] Check revision before update (optimistic lock)
- [ ] Return 409 Conflict if revision mismatch
- [ ] Use `FOR UPDATE` lock in transactions
- [ ] Add audit trail of who made changes
- [ ] Test concurrent update scenarios

### Technical Details
```prisma
model PlatformSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  revision  Int      @default(1)
  updatedBy String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  
  updater   AppUser? @relation(fields: [updatedBy], references: [id])
  
  @@index([key])
}
```

```typescript
// api/src/platform-settings/platform-settings.service.ts
async update(key: string, value: any, actorId: string, expectedRevision?: number) {
  return this.prisma.$transaction(async (tx) => {
    const existing = await tx.platformSetting.findUnique({
      where: { key },
      lock: { mode: 'ForUpdate' },
    });

    if (!existing) throw new NotFoundException('Setting not found');
    
    if (expectedRevision && existing.revision !== expectedRevision) {
      throw new ConflictException('Setting was modified by another user');
    }

    return tx.platformSetting.update({
      where: { key },
      data: {
        value,
        revision: { increment: 1 },
        updatedBy: actorId,
      },
    });
  });
}
```

### Files to Modify
- `api/prisma/schema.prisma`
- `api/src/platform-settings/platform-settings.service.ts`

### Dependencies
- Phase 1 complete

### Testing
```typescript
// Concurrent updates
const setting1 = await service.get('maintenance');
const setting2 = await service.get('maintenance');

await service.update('maintenance', { enabled: true }, 'user1', setting1.revision); // succeeds
await expect(
  service.update('maintenance', { enabled: false }, 'user2', setting2.revision)
).rejects.toThrow(ConflictException); // fails - revision mismatch
```

---

## Ticket #9: Integrate Redis for Platform Settings Cache

**Epic:** Phase 2 - Platform Settings  
**Priority:** P1 - High  
**Estimate:** 2 days  
**Labels:** backend, redis, caching, infrastructure

### Description
Add Redis caching layer for platform settings to reduce database load and improve response times.

### Acceptance Criteria
- [ ] Install `cache-manager`, `cache-manager-redis-store`
- [ ] Configure `CacheModule` with Redis connection
- [ ] Add cache.get/set to platform settings service
- [ ] Invalidate cache on update
- [ ] Set TTL to 60 seconds for hot data
- [ ] Add cache hit/miss metrics
- [ ] Test cache invalidation
- [ ] Update Docker Compose with Redis service

### Technical Details
```typescript
// api/src/app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          ttl: 60, // seconds
        }),
      }),
    }),
  ],
})
export class AppModule {}

// api/src/platform-settings/platform-settings.service.ts
@Injectable()
export class PlatformSettingsService {
  private readonly CACHE_KEY_PREFIX = 'platform:settings:';

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async get(key: string): Promise<PlatformSetting | null> {
    const cacheKey = this.CACHE_KEY_PREFIX + key;
    
    // Try cache first
    const cached = await this.cache.get<PlatformSetting>(cacheKey);
    if (cached) return cached;

    // Fetch from DB
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    
    // Store in cache
    if (setting) {
      await this.cache.set(cacheKey, setting, { ttl: 60 });
    }

    return setting;
  }

  async update(key: string, value: any, actorId: string) {
    const updated = await this.prisma.$transaction(/* ... */);
    
    // Invalidate cache
    await this.cache.del(this.CACHE_KEY_PREFIX + key);
    
    return updated;
  }
}
```

### Files to Modify
- `api/package.json` (add dependencies)
- `api/src/app.module.ts`
- `api/src/platform-settings/platform-settings.service.ts`
- `docker-compose.yml` (add Redis)
- `.env.example`

### Infrastructure
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Dependencies
- Ticket #8

### Testing
```bash
# Install dependencies
npm install cache-manager cache-manager-redis-store

# Start Redis
docker compose up -d redis

# Test cache
curl http://localhost:3002/platform-settings/maintenance # cache miss
curl http://localhost:3002/platform-settings/maintenance # cache hit (should be faster)
```

---

## Ticket #10: Create WebSocket Gateway for Real-Time Updates

**Epic:** Phase 2 - Platform Settings  
**Priority:** P2 - Medium  
**Estimate:** 3 days  
**Labels:** backend, websocket, real-time

### Description
Implement WebSocket gateway to broadcast platform setting changes (maintenance mode) to all connected clients in real-time.

### Acceptance Criteria
- [ ] Install `@nestjs/websockets`, `socket.io`
- [ ] Create `MaintenanceGateway` with `/platform` namespace
- [ ] Emit `maintenanceModeChanged` event on setting update
- [ ] Use `@OnEvent` decorator to listen for internal events
- [ ] Add connection authentication (validate JWT on connect)
- [ ] Handle reconnection logic
- [ ] Add connection metrics (active connections)
- [ ] Test event propagation

### Technical Details
```typescript
// api/src/platform/maintenance.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  namespace: '/platform',
})
export class MaintenanceGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private auth: ClerkAuthService) {}

  async handleConnection(client: Socket) {
    try {
      // Validate JWT from query or auth header
      const token = client.handshake.auth.token || client.handshake.query.token;
      await this.auth.verifyToken(token);
      
      console.log(`Client connected: ${client.id}`);
    } catch (error) {
      console.error('WebSocket auth failed:', error);
      client.disconnect();
    }
  }

  @OnEvent('platform.maintenance.changed')
  broadcastMaintenanceUpdate(settings: PlatformSetting) {
    this.server.emit('maintenanceModeChanged', {
      enabled: settings.value.enabled,
      message: settings.value.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// api/src/platform-settings/platform-settings.service.ts
async toggleMaintenanceMode(enabled: boolean, message?: string, actorId?: string) {
  const updated = await this.update('maintenance', { enabled, message }, actorId);
  
  // Emit event for WebSocket broadcast
  this.eventEmitter.emit('platform.maintenance.changed', updated);
  
  return updated;
}
```

### Files to Create
- `api/src/platform/maintenance.gateway.ts`
- `api/src/platform/maintenance.gateway.spec.ts`

### Files to Modify
- `api/src/platform/platform.module.ts`
- `api/src/app.module.ts` (add EventEmitterModule)
- `api/package.json`

### Frontend Integration
```typescript
// admin/src/services/socket.service.ts
import io from 'socket.io-client';

const socket = io('http://localhost:3002/platform', {
  auth: { token: clerk.session.getToken() },
  reconnection: true,
});

socket.on('maintenanceModeChanged', (data) => {
  console.log('Maintenance mode updated:', data);
  // Update UI state
  setMaintenanceMode(data);
});
```

### Dependencies
- Ticket #8, #9

### Testing
```bash
# Install dependencies
npm install @nestjs/websockets socket.io @nestjs/event-emitter

# Test WebSocket
npm run test:e2e -- maintenance-gateway.e2e-spec.ts
```

---

## Ticket #11: Add Health Check for Redis Connection

**Epic:** Phase 2 - Platform Settings  
**Priority:** P2 - Medium  
**Estimate:** 0.5 days  
**Labels:** backend, monitoring, health

### Description
Add Redis connection health check to existing health endpoint to monitor cache availability.

### Acceptance Criteria
- [ ] Install `@nestjs/terminus`, `@nestjs/redis`
- [ ] Add Redis health indicator to `/health` endpoint
- [ ] Return status: `up` if Redis connected, `down` if not
- [ ] Include connection latency in response
- [ ] Make Redis health optional (warn but don't fail if down)
- [ ] Add Prometheus metric for Redis health

### Technical Details
```typescript
// api/src/health/health.controller.ts
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}

// Response example
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up", "latency": 2 }
  }
}
```

### Files to Modify
- `api/src/health/health.controller.ts`
- `api/src/health/redis.health.ts` (new)
- `api/package.json`

### Dependencies
- Ticket #9 (Redis)

---

## Ticket #12: Update Admin Frontend for Real-Time Maintenance Mode

**Epic:** Phase 2 - Platform Settings  
**Priority:** P2 - Medium  
**Estimate:** 1 day  
**Labels:** frontend, admin, websocket

### Description
Update admin panel to connect to WebSocket gateway and display real-time maintenance mode banner.

### Acceptance Criteria
- [ ] Install `socket.io-client` in admin app
- [ ] Create WebSocket service with reconnection
- [ ] Listen for `maintenanceModeChanged` events
- [ ] Update global state (Zustand/Redux) on event
- [ ] Show banner when maintenance mode enabled
- [ ] Display custom message from backend
- [ ] Handle connection errors gracefully
- [ ] Add visual indicator for WebSocket connection status

### Technical Details
```typescript
// admin/src/services/websocket.service.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(`${import.meta.env.VITE_API_URL}/platform`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('maintenanceModeChanged', (data) => {
      useMaintenanceStore.getState().setMaintenanceMode(data);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsService = new WebSocketService();

// admin/src/components/MaintenanceBanner.tsx
export const MaintenanceBanner = () => {
  const { enabled, message } = useMaintenanceStore();

  if (!enabled) return null;

  return (
    <div className="bg-yellow-500 text-white p-4 text-center">
      <strong>🔧 Maintenance Mode Active</strong>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
};
```

### Files to Create
- `admin/src/services/websocket.service.ts`
- `admin/src/stores/maintenance.store.ts`
- `admin/src/components/MaintenanceBanner.tsx`

### Files to Modify
- `admin/package.json`
- `admin/src/App.tsx`

### Dependencies
- Ticket #10 (WebSocket gateway)

---

# Phase 3: Authorization & Audit

## Ticket #13: Create Composite AuthPipelineGuard

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P1 - High  
**Estimate:** 1.5 days  
**Labels:** backend, auth, security

### Description
Combine Clerk authentication and role-based authorization into a single composable guard for cleaner controller code.

### Acceptance Criteria
- [ ] Create `AuthPipelineGuard` that chains Clerk + Roles guards
- [ ] Ensure JWT validation happens first
- [ ] Propagate `req.user` context to roles guard
- [ ] Return 401 for auth failures, 403 for authorization failures
- [ ] Replace individual guards with pipeline in controllers
- [ ] Add comprehensive tests
- [ ] Document usage in README

### Technical Details
```typescript
// api/src/auth/guards/auth-pipeline.guard.ts
@Injectable()
export class AuthPipelineGuard implements CanActivate {
  constructor(
    private readonly clerkGuard: ClerkAuthGuard,
    private readonly rolesGuard: RolesGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Validate JWT with Clerk
    const authenticated = await this.clerkGuard.canActivate(context);
    if (!authenticated) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }

    // Step 2: Check roles (reads context.switchToHttp().getRequest().user)
    const authorized = await this.rolesGuard.canActivate(context);
    if (!authorized) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Usage in controller
@Controller('policy-alerts')
@UseGuards(AuthPipelineGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class PolicyAlertsController {
  // All endpoints now have Clerk auth + role check
}
```

### Files to Create
- `api/src/auth/guards/auth-pipeline.guard.ts`
- `api/src/auth/guards/auth-pipeline.guard.spec.ts`

### Files to Modify
- All controllers using `@UseGuards(ClerkAuthGuard, RolesGuard)`

### Dependencies
- None

### Testing
```typescript
// Test auth failure
const response = await request(app).get('/policy-alerts').set('Authorization', 'Bearer invalid');
expect(response.status).toBe(401);

// Test role failure
const response = await request(app).get('/policy-alerts').set('Authorization', educatorToken);
expect(response.status).toBe(403);

// Test success
const response = await request(app).get('/policy-alerts').set('Authorization', adminToken);
expect(response.status).toBe(200);
```

---

## Ticket #14: Install and Configure CASL for Policy-Based Authorization

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P1 - High  
**Estimate:** 3 days  
**Labels:** backend, auth, casl, security

### Description
Implement CASL (Concurrent Access Security Library) for fine-grained, policy-based authorization across all resources.

### Acceptance Criteria
- [ ] Install `@casl/ability`, `@casl/prisma`
- [ ] Create `AbilityFactory` with role-to-permission mappings
- [ ] Define actions: `manage`, `create`, `read`, `update`, `delete`
- [ ] Define subjects: `PolicyAlert`, `Content`, `User`, `PlatformSetting`
- [ ] Add field-level permissions (e.g., ADMIN can't see all user emails)
- [ ] Create `PoliciesGuard` and `@CheckPolicies` decorator
- [ ] Document permission matrix in README

### Technical Details
```typescript
// api/src/auth/ability/ability.factory.ts
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { PrismaQuery, Subjects, createPrismaAbility } from '@casl/prisma';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
type AppSubjects = Subjects<{
  PolicyAlert: PolicyAlert;
  Content: ContentItem;
  User: AppUser;
  PlatformSetting: PlatformSetting;
}>;

export type AppAbility = ReturnType<typeof createPrismaAbility<[Actions, AppSubjects]>>;

@Injectable()
export class AbilityFactory {
  defineFor(user: AppUser) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    // Super admin can do everything
    if (user.role === UserRole.SUPER_ADMIN) {
      can('manage', 'all');
      return build();
    }

    // Admin permissions
    if (user.role === UserRole.ADMIN) {
      can('read', 'PolicyAlert');
      can('create', 'PolicyAlert');
      can('update', 'PolicyAlert', { createdBy: user.id }); // own only
      can('read', 'Content');
      can('create', 'Content');
      can('update', 'Content', { uploaderId: user.id });
      can('read', 'User');
      cannot('read', 'User', ['password', 'clerkId']); // field restriction
    }

    // Educator permissions
    if (user.role === UserRole.EDUCATOR) {
      can('read', 'Content');
      can('read', 'User', { id: user.id }); // own profile only
    }

    return build();
  }
}

// api/src/auth/guards/policies.guard.ts
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private abilityFactory: AbilityFactory,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers = this.reflector.get<PolicyHandler[]>('policies', context.getHandler());
    if (!policyHandlers || policyHandlers.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.defineFor(request.user);

    return policyHandlers.every((handler) => handler(ability));
  }
}

// api/src/auth/decorators/check-policies.decorator.ts
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata('policies', handlers);

type PolicyHandler = (ability: AppAbility) => boolean;
```

### Files to Create
- `api/src/auth/ability/ability.factory.ts`
- `api/src/auth/guards/policies.guard.ts`
- `api/src/auth/decorators/check-policies.decorator.ts`
- `api/src/auth/ability/ability.spec.ts`

### Files to Modify
- `api/package.json`
- `api/src/auth/auth.module.ts`

### Usage Example
```typescript
// api/src/policy-alerts/policy-alerts.controller.ts
@UseGuards(AuthPipelineGuard, PoliciesGuard)
@Controller('policy-alerts')
export class PolicyAlertsController {
  @Post()
  @CheckPolicies((ability) => ability.can('create', 'PolicyAlert'))
  create(@Body() dto: CreatePolicyAlertDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @CheckPolicies((ability) => ability.can('update', 'PolicyAlert'))
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyAlertDto, @Req() req) {
    const alert = await this.service.findOne(id);
    const ability = this.abilityFactory.defineFor(req.user);
    
    // Check if user can update this specific alert
    if (ability.cannot('update', alert)) {
      throw new ForbiddenException('You can only update your own alerts');
    }

    return this.service.update(id, dto);
  }
}
```

### Dependencies
- Ticket #13 (AuthPipelineGuard)

### Testing
```typescript
// Test SUPER_ADMIN
const ability = abilityFactory.defineFor({ role: UserRole.SUPER_ADMIN });
expect(ability.can('manage', 'all')).toBe(true);

// Test ADMIN can't update others' alerts
const ability = abilityFactory.defineFor({ id: 'user1', role: UserRole.ADMIN });
const alert = { id: 'alert1', createdBy: 'user2' };
expect(ability.can('update', alert)).toBe(false);

// Test EDUCATOR can only read own profile
const ability = abilityFactory.defineFor({ id: 'user1', role: UserRole.EDUCATOR });
expect(ability.can('read', 'User', { id: 'user1' })).toBe(true);
expect(ability.can('read', 'User', { id: 'user2' })).toBe(false);
```

---

## Ticket #15: Apply CASL to Policy Alerts Endpoints

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P1 - High  
**Estimate:** 1.5 days  
**Labels:** backend, auth, refactoring

### Description
Refactor PolicyAlertsController to use CASL policies instead of role decorators, enabling fine-grained authorization.

### Acceptance Criteria
- [ ] Replace `@Roles()` with `@CheckPolicies()` on all endpoints
- [ ] Add subject-level checks (own vs. all alerts)
- [ ] Test all permission combinations
- [ ] Update API documentation with permission requirements
- [ ] Ensure backward compatibility (same permissions as before)

### Files to Modify
- `api/src/policy-alerts/policy-alerts.controller.ts`
- `api/src/policy-alerts/policy-alerts.service.ts`

### Dependencies
- Ticket #14

---

## Ticket #16: Implement Prisma Audit Logging Middleware

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P1 - High  
**Estimate:** 3 days  
**Labels:** backend, database, audit, security

### Description
Create Prisma middleware to automatically log all create/update/delete operations on critical models for compliance and debugging.

### Acceptance Criteria
- [ ] Add `AuditLog` model to Prisma schema
- [ ] Create Prisma middleware to intercept mutations
- [ ] Log entity name, action, actor, before/after diff
- [ ] Use AsyncLocalStorage to track request context (userId, traceId)
- [ ] Skip logging for non-critical models (configurable)
- [ ] Add endpoint to query audit logs
- [ ] Test all CRUD operations generate logs

### Technical Details
```prisma
// api/prisma/schema.prisma
model AuditLog {
  id        String   @id @default(cuid())
  entity    String   // e.g., "PolicyAlert"
  entityId  String   // ID of the entity
  action    String   // "create", "update", "delete"
  actorId   String?  // Who made the change
  diff      Json?    // Before/after snapshot
  metadata  Json?    // Request context (IP, traceId, etc.)
  createdAt DateTime @default(now())
  
  actor     AppUser? @relation(fields: [actorId], references: [id])
  
  @@index([entity, entityId])
  @@index([actorId])
  @@index([createdAt])
}
```

```typescript
// api/src/common/request-context.ts
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  userId?: string;
  traceId?: string;
  ip?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export class RequestContextService {
  static get(key: keyof RequestContext): any {
    return requestContext.getStore()?.[key];
  }

  static set(context: RequestContext) {
    requestContext.enterWith(context);
  }
}

// api/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Audit middleware
    this.$use(async (params, next) => {
      const result = await next(params);

      // Only log mutations on audited models
      const auditedModels = ['PolicyAlert', 'ContentItem', 'PlatformSetting', 'AppUser'];
      if (!auditedModels.includes(params.model)) return result;

      const mutationActions = ['create', 'update', 'delete', 'upsert'];
      if (!mutationActions.includes(params.action)) return result;

      // Create audit log
      const actorId = RequestContextService.get('userId');
      const traceId = RequestContextService.get('traceId');

      await this.auditLog.create({
        data: {
          entity: params.model,
          entityId: (result as any)?.id || params.args?.where?.id,
          action: params.action,
          actorId,
          diff: JSON.stringify({
            before: params.args?.where,
            after: result,
          }),
          metadata: { traceId },
        },
      });

      return result;
    });
  }
}

// api/src/common/middleware/request-context.middleware.ts
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const context = {
      userId: req.user?.id,
      traceId: req.id || randomUUID(),
      ip: req.ip,
    };

    RequestContextService.set(context);
    next();
  }
}
```

### Files to Create
- `api/src/common/request-context.ts`
- `api/src/common/middleware/request-context.middleware.ts`

### Files to Modify
- `api/prisma/schema.prisma`
- `api/src/prisma/prisma.service.ts`
- `api/src/app.module.ts` (register middleware)

### Dependencies
- None

### Testing
```typescript
// Test audit log creation
await policyAlertsService.create(dto, 'user123');
const logs = await prisma.auditLog.findMany({ where: { entity: 'PolicyAlert' } });
expect(logs).toHaveLength(1);
expect(logs[0].action).toBe('create');
expect(logs[0].actorId).toBe('user123');
```

---

## Ticket #17: Add Audit Log Viewer Endpoint

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P2 - Medium  
**Estimate:** 1 day  
**Labels:** backend, admin, audit

### Description
Create admin endpoint to query and filter audit logs with pagination, search, and export functionality.

### Acceptance Criteria
- [ ] Create `GET /admin/audit-logs` endpoint
- [ ] Filter by: entity, entityId, actorId, dateRange
- [ ] Paginate results (default 50 per page)
- [ ] Add CSV export functionality
- [ ] Restrict to SUPER_ADMIN only
- [ ] Add to Swagger docs

### Files to Create
- `api/src/admin/audit-logs.controller.ts`
- `api/src/admin/audit-logs.service.ts`

### Dependencies
- Ticket #16

---

## Ticket #18: Optimize JWT Context Size

**Epic:** Phase 3 - Auth & Authorization  
**Priority:** P2 - Medium  
**Estimate:** 1 day  
**Labels:** backend, auth, performance

### Description
Reduce JWT token size by storing only minimal user context (clerkId, appUserId, roles) and fetching additional data per-request.

### Acceptance Criteria
- [ ] JWT payload: `{ clerkId, appUserId, roles: string[] }`
- [ ] Remove other claims (email, name, etc.)
- [ ] Fetch full user profile in services when needed
- [ ] Add caching for user profiles (Redis)
- [ ] Measure JWT size reduction
- [ ] Update token refresh logic

### Files to Modify
- `api/src/auth/clerk-auth.guard.ts`
- `api/src/auth/auth.service.ts`

### Dependencies
- Ticket #9 (Redis)

---

# Phase 4: Shared Infrastructure

## Ticket #19: Create Shared Types Package

**Epic:** Phase 4 - Shared Infrastructure  
**Priority:** P2 - Medium  
**Estimate:** 1.5 days  
**Labels:** monorepo, types, dx

### Description
Create a shared TypeScript package for interfaces and types used by both API and frontend to eliminate drift.

### Acceptance Criteria
- [ ] Create `packages/types` directory
- [ ] Define interfaces: `ApiEnvelope`, `ContentPayload`, `PolicyAlert`, `User`
- [ ] Export from `index.ts`
- [ ] Configure tsconfig for package
- [ ] Add to workspace dependencies
- [ ] Update API and frontend imports
- [ ] Add type tests

### Technical Details
```typescript
// packages/types/src/api-envelope.ts
export interface ApiEnvelope<T = any> {
  success: boolean;
  version: number;
  timestamp: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// packages/types/src/content.ts
export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'pdf' | 'image' | 'audio';
  url: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

// packages/types/src/policy-alert.ts
export enum AlertType {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface PolicyAlert {
  id: string;
  title: string;
  message: string;
  alertType: AlertType;
  regions: string[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
}

// packages/types/package.json
{
  "name": "@workspace/types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  }
}

// packages/types/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

### Files to Create
- `packages/types/src/*`
- `packages/types/package.json`
- `packages/types/tsconfig.json`

### Files to Modify
- Root `package.json` (add workspace)
- `api/package.json` (add dependency)
- `admin/package.json` (add dependency)
- `frontend/package.json` (add dependency)

### Dependencies
- None

### Testing
```bash
# Build types package
cd packages/types && npm run build

# Import in API
import { ApiEnvelope, ContentItem } from '@workspace/types';

# Import in frontend
import { PolicyAlert, AlertType } from '@workspace/types';
```

---

## Ticket #20: Enhance OpenAPI/Swagger with Response Envelopes

**Epic:** Phase 4 - Shared Infrastructure  
**Priority:** P2 - Medium  
**Estimate:** 1.5 days  
**Labels:** backend, api, docs

### Description
Update Swagger documentation to reflect new response envelope structure and generate accurate OpenAPI specs.

### Acceptance Criteria
- [ ] Create `ApiEnvelopeDto` class for Swagger
- [ ] Use `@ApiOkResponse` with `allOf` schemas
- [ ] Add examples to all DTOs
- [ ] Document error codes and status codes
- [ ] Generate `/docs-json` endpoint
- [ ] Verify Swagger UI renders correctly

### Technical Details
```typescript
// api/src/common/dto/api-envelope.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ApiEnvelopeDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: '2025-10-11T10:30:00.000Z' })
  timestamp: string;

  @ApiProperty()
  data: T;
}

// api/src/content/content.controller.ts
@ApiOkResponse({
  description: 'Content uploaded successfully',
  schema: {
    allOf: [
      { $ref: getSchemaPath(ApiEnvelopeDto) },
      {
        properties: {
          data: { $ref: getSchemaPath(UploadResponseDto) },
        },
      },
    ],
  },
})
@Post('upload')
upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadDto) {
  return this.service.upload(file, dto);
}

// main.ts
const config = new DocumentBuilder()
  .setTitle('PC Solutions API')
  .setDescription('API for childcare management platform')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config, {
  extraModels: [ApiEnvelopeDto, UploadResponseDto, PolicyAlertDto],
});

SwaggerModule.setup('docs', app, document);

// Serve JSON
app.get('/docs-json', (req, res) => {
  res.json(document);
});
```

### Files to Modify
- `api/src/main.ts`
- All controller files
- All DTO files (add `@ApiProperty`)

### Dependencies
- Ticket #5 (response envelope)
- Ticket #19 (shared types)

---

## Ticket #21: Write Integration Tests for Upload Flow

**Epic:** Phase 4 - Shared Infrastructure  
**Priority:** P1 - High  
**Estimate:** 3 days  
**Labels:** backend, testing, e2e

### Description
Create comprehensive E2E tests for file upload flow using mocked R2 and test database.

### Acceptance Criteria
- [ ] Install `@nestjs/testing`, `supertest`, `aws-sdk-client-mock`
- [ ] Setup test database (SQLite or Docker Postgres)
- [ ] Mock R2 putObject/headObject/deleteObject
- [ ] Test successful upload creates DB records
- [ ] Test upload failure rolls back R2
- [ ] Test validation errors return 400
- [ ] Test auth failures return 401
- [ ] Run in CI pipeline

### Technical Details
```typescript
// api/test/e2e/content-upload.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

describe('Content Upload (e2e)', () => {
  let app: INestApplication;
  let s3Mock;

  beforeAll(async () => {
    s3Mock = mockClient(S3Client);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Client)
      .useValue(s3Mock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    s3Mock.reset();
  });

  it('should upload file and create DB records', async () => {
    // Mock R2 responses
    s3Mock.on(PutObjectCommand).resolves({ ETag: '"abc123"' });
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"abc123"' });

    const response = await request(app.getHttpServer())
      .post('/content/elearning/upload')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', Buffer.from('test content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('courseId', courseId)
      .field('moduleId', moduleId)
      .field('title', 'Test Document')
      .field('type', 'pdf');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.url).toMatch(/^https?:\/\//);

    // Verify DB record
    const asset = await prisma.asset.findFirst({ where: { etag: 'abc123' } });
    expect(asset).toBeTruthy();
    expect(asset.key).toContain(courseId);
  });

  it('should rollback R2 upload on DB failure', async () => {
    s3Mock.on(PutObjectCommand).resolves({ ETag: '"abc123"' });
    s3Mock.on(HeadObjectCommand).resolves({ ETag: '"abc123"' });

    // Force DB error
    jest.spyOn(prisma.course, 'upsert').mockRejectedValue(new Error('DB error'));

    const response = await request(app.getHttpServer())
      .post('/content/elearning/upload')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', Buffer.from('test'), { filename: 'test.pdf' })
      .field('courseId', courseId)
      .field('moduleId', moduleId);

    expect(response.status).toBe(400);

    // Verify R2 delete was called
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app.getHttpServer())
      .post('/content/elearning/upload')
      .attach('file', Buffer.from('test'), { filename: 'test.pdf' });

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/content/elearning/upload')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', Buffer.from('test'), { filename: 'test.pdf' })
      .field('courseId', 'not-a-uuid'); // invalid

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('courseId');
  });
});
```

### Files to Create
- `api/test/e2e/content-upload.e2e-spec.ts`
- `api/test/e2e/auth.e2e-spec.ts`
- `api/test/e2e/policy-alerts.e2e-spec.ts`

### Dependencies
- Phase 1-3 complete

### Testing
```bash
# Install dependencies
npm install --save-dev @nestjs/testing supertest aws-sdk-client-mock

# Run tests
npm run test:e2e

# Run with coverage
npm run test:e2e:cov
```

---

## Ticket #22: Add CI Workflow for Integration Tests

**Epic:** Phase 4 - Shared Infrastructure  
**Priority:** P1 - High  
**Estimate:** 0.5 days  
**Labels:** ci, testing, devops

### Description
Create GitHub Actions workflow to run integration tests on every PR and push to main.

### Acceptance Criteria
- [ ] Create `.github/workflows/integration-tests.yml`
- [ ] Setup test database (Postgres service container)
- [ ] Run migrations before tests
- [ ] Execute `npm run test:e2e`
- [ ] Upload coverage report
- [ ] Block merge if tests fail

### Technical Details
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: cd api && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      
      - name: Run integration tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Dependencies
- Ticket #21

---

# Phase 5: Observability

## Ticket #23: Add Request Context Middleware with Trace IDs

**Epic:** Phase 5 - Observability  
**Priority:** P1 - High  
**Estimate:** 1.5 days  
**Labels:** backend, observability, logging

### Description
Create middleware to generate unique trace IDs for every request and propagate them through the application stack.

### Acceptance Criteria
- [ ] Use Node.js AsyncLocalStorage for context
- [ ] Generate UUID trace ID per request
- [ ] Store userId after auth guard
- [ ] Add `X-Trace-Id` response header
- [ ] Include trace ID in all logs
- [ ] Include trace ID in error responses
- [ ] Document in API docs

### Technical Details
```typescript
// api/src/common/request-context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  traceId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export class RequestContextService {
  static get(): RequestContext | undefined {
    return requestContext.getStore();
  }

  static getTraceId(): string {
    return this.get()?.traceId || 'unknown';
  }

  static getUserId(): string | undefined {
    return this.get()?.userId;
  }

  static set(context: RequestContext) {
    requestContext.enterWith(context);
  }
}

// api/src/common/middleware/request-context.middleware.ts
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = req.headers['x-trace-id'] as string || randomUUID();
    
    const context: RequestContext = {
      traceId,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    RequestContextService.set(context);
    
    // Add to response headers
    res.setHeader('X-Trace-Id', traceId);
    
    // Add to request object for easy access
    req.id = traceId;
    
    next();
  }
}

// api/src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

### Files to Create
- `api/src/common/request-context.ts`
- `api/src/common/middleware/request-context.middleware.ts`

### Files to Modify
- `api/src/app.module.ts`
- `api/src/common/filters/all-exceptions.filter.ts` (use traceId)

### Dependencies
- None

### Testing
```bash
# Request should return trace ID
curl -i http://localhost:3002/health
# Response headers: X-Trace-Id: xxx-xxx-xxx

# Errors should include trace ID
curl http://localhost:3002/policy-alerts/invalid
# { "success": false, "traceId": "xxx", "error": { ... } }
```

---

## Ticket #24: Implement Structured Logging with Pino

**Epic:** Phase 5 - Observability  
**Priority:** P1 - High  
**Estimate:** 2 days  
**Labels:** backend, observability, logging

### Description
Replace default NestJS logger with Pino for structured JSON logging with correlation IDs and performance metrics.

### Acceptance Criteria
- [ ] Install `pino`, `pino-http`, `pino-pretty`, `nestjs-pino`
- [ ] Configure JSON logging for production
- [ ] Configure pretty logging for development
- [ ] Include trace ID in all logs
- [ ] Log request/response times
- [ ] Add correlation IDs
- [ ] Integrate with NestJS Logger
- [ ] Add log levels by environment

### Technical Details
```typescript
// api/src/app.module.ts
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        customProps: (req, res) => ({
          traceId: req.id,
          userId: req.user?.id,
        }),
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            userId: req.user?.id,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
})

// Usage in services
@Injectable()
export class ContentService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ContentService.name);
  }

  async upload(file: any) {
    this.logger.info({ fileSize: file.size, filename: file.originalname }, 'Starting upload');
    
    try {
      const result = await this.r2.upload(file);
      this.logger.info({ key: result.key }, 'Upload successful');
      return result;
    } catch (error) {
      this.logger.error({ error: error.message, stack: error.stack }, 'Upload failed');
      throw error;
    }
  }
}

// Production log output (JSON):
{
  "level": 30,
  "time": 1697000000000,
  "pid": 1234,
  "hostname": "api-server",
  "traceId": "abc-123",
  "userId": "user_xyz",
  "req": {
    "id": "abc-123",
    "method": "POST",
    "url": "/content/upload"
  },
  "msg": "Starting upload",
  "context": "ContentService"
}
```

### Files to Modify
- `api/package.json`
- `api/src/app.module.ts`
- `api/src/main.ts`
- All services (replace console.log)

### Dependencies
- Ticket #23 (request context)

### Testing
```bash
# Install dependencies
npm install pino pino-http pino-pretty nestjs-pino

# Development (pretty logs)
NODE_ENV=development npm run start:dev

# Production (JSON logs)
NODE_ENV=production npm run start
```

---

## Ticket #25: Add Prometheus Metrics Endpoint

**Epic:** Phase 5 - Observability  
**Priority:** P2 - Medium  
**Estimate:** 2 days  
**Labels:** backend, observability, metrics

### Description
Expose Prometheus-compatible `/metrics` endpoint with HTTP metrics, business metrics, and system metrics.

### Acceptance Criteria
- [ ] Install `@willsoto/nestjs-prometheus`, `prom-client`
- [ ] Add `/metrics` endpoint
- [ ] Track: request duration, error rate, request count
- [ ] Add custom metrics: upload count, upload size, active users
- [ ] Add labels: method, path, statusCode
- [ ] Document metrics in README
- [ ] Test with Prometheus

### Technical Details
```typescript
// api/src/app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})

// api/src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    public requestCounter: Counter<string>,
    
    @InjectMetric('http_request_duration_seconds')
    public requestDuration: Histogram<string>,
    
    @InjectMetric('content_uploads_total')
    public uploadCounter: Counter<string>,
    
    @InjectMetric('content_upload_size_bytes')
    public uploadSizeHistogram: Histogram<string>,
    
    @InjectMetric('active_users')
    public activeUsersGauge: Gauge<string>,
  ) {}

  trackUpload(size: number, type: string) {
    this.uploadCounter.inc({ type });
    this.uploadSizeHistogram.observe({ type }, size);
  }

  setActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }
}

// api/src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

@Module({
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
    }),
    makeCounterProvider({
      name: 'content_uploads_total',
      help: 'Total number of content uploads',
      labelNames: ['type'],
    }),
    makeHistogramProvider({
      name: 'content_upload_size_bytes',
      help: 'Size of uploaded content in bytes',
      labelNames: ['type'],
      buckets: [1000, 10000, 100000, 1000000, 10000000, 100000000],
    }),
    makeGaugeProvider({
      name: 'active_users',
      help: 'Number of currently active users',
    }),
    MetricsService,
  ],
  exports: [MetricsService],
})

// Usage
@Injectable()
export class ContentService {
  constructor(private metrics: MetricsService) {}

  async upload(file: Express.Multer.File) {
    const result = await this.r2.upload(file);
    this.metrics.trackUpload(file.size, file.mimetype);
    return result;
  }
}
```

### Files to Create
- `api/src/metrics/metrics.module.ts`
- `api/src/metrics/metrics.service.ts`
- `api/src/metrics/metrics.interceptor.ts`

### Files to Modify
- `api/package.json`
- `api/src/app.module.ts`
- Service files (add metric tracking)

### Prometheus Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pc-solutions-api'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Dependencies
- None

### Testing
```bash
# Install dependencies
npm install @willsoto/nestjs-prometheus prom-client

# Check metrics endpoint
curl http://localhost:3002/metrics

# Output:
# http_requests_total{method="GET",path="/health",status="200"} 42
# http_request_duration_seconds_bucket{method="POST",path="/content/upload",status="201",le="0.1"} 10
# content_uploads_total{type="application/pdf"} 5
# active_users 127
```

---

## Summary

**Total Tickets:** 25  
- Phase 1: 7 tickets (Critical Hardening)
- Phase 2: 5 tickets (Platform Settings & Caching)
- Phase 3: 6 tickets (Authorization & Audit)
- Phase 4: 4 tickets (Shared Infrastructure)
- Phase 5: 3 tickets (Observability)

**Ticket Format:** Each ticket includes:
- Epic, priority, estimate, labels
- Description
- Acceptance criteria
- Technical details with code samples
- Files to create/modify
- Dependencies
- Testing instructions

**Next Steps:**
1. Import tickets into your project management tool (GitHub Projects, Jira, etc.)
2. Assign priorities and assignees
3. Start with Phase 1 tickets
4. Track progress and adjust estimates
