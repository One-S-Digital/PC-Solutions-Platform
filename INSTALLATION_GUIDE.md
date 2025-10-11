# Installation Guide - Architecture Improvements

**For:** Deploying Phases 1-5 Architecture Improvements  
**Estimated Time:** 30-45 minutes  
**Difficulty:** Intermediate

---

## ⚡ Quick Start

```bash
# 1. Install all dependencies
./scripts/install-dependencies.sh

# 2. Start services
docker compose up -d

# 3. Run migrations
cd api && npx prisma migrate dev

# 4. Build shared types
cd ../packages/types && npm run build

# 5. Start development
cd ../.. && npm run dev
```

---

## 📋 Step-by-Step Installation

### Step 1: Install Dependencies

#### API Dependencies
```bash
cd api

# Phase 2: Caching & WebSockets
npm install cache-manager@5.2.0 cache-manager-redis-store@3.0.0
npm install @nestjs/websockets@10.0.0 @nestjs/platform-socket.io@10.0.0 socket.io@4.6.0
npm install @nestjs/event-emitter@2.0.0

# Phase 3: Authorization & Audit
npm install @casl/ability@6.5.0 @casl/prisma@1.4.0

# Phase 5: Observability
npm install nestjs-pino@3.5.0 pino@8.16.0 pino-http@8.5.0 pino-pretty@10.2.0
npm install prom-client@15.0.0

# Terminus for health checks
npm install @nestjs/terminus@10.0.0

cd ..
```

#### Admin Dependencies
```bash
cd admin
npm install socket.io-client@4.6.0 zustand@4.4.0
cd ..
```

#### Frontend Dependencies (if needed)
```bash
cd frontend
npm install socket.io-client@4.6.0 zustand@4.4.0
cd ..
```

#### Packages
```bash
cd packages/types
npm install
npm run build
cd ../..
```

---

### Step 2: Environment Configuration

Copy and update `.env.example`:
```bash
cp .env.example .env
```

**Required new variables:**
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here

# URLs for CORS
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Logging
LOG_LEVEL=info

# Feature Flags
FEATURE_AUDIT_LOGGING=true
FEATURE_METRICS=true
CACHE_ENABLED=true
```

---

### Step 3: Start Infrastructure

Start Redis and other services:
```bash
docker compose up -d

# Verify all services are running
docker compose ps

# Check Redis
docker compose logs redis

# Expected output:
# ✓ Redis server started
# ✓ Ready to accept connections
```

---

### Step 4: Database Migrations

Run Prisma migrations:
```bash
cd api

# Generate migration
npx prisma migrate dev --name add-architecture-improvements

# This will create migration for:
# - Asset: etag, checksum, version fields
# - PlatformSettings: revision, updatedBy, maintenanceMessage
# - AuditLog: new model

# Generate Prisma client
npx prisma generate
```

**Migration will add:**
- 3 new fields to `Asset` table
- 3 new fields to `PlatformSettings` table
- New `AuditLog` table
- New indexes

**Rollback (if needed):**
```bash
# Find migration directory
ls prisma/migrations/

# Delete last migration folder
rm -rf prisma/migrations/<timestamp>_add-architecture-improvements

# Reset database
npx prisma migrate reset
```

---

### Step 5: Update Application Code

#### 5.1 Update `api/src/app.module.ts`

Add these imports and modules:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { redisStore } from 'cache-manager-redis-store';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { pinoConfig } from './common/logger/logger.config';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // Event Emitter
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),
    
    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          password: process.env.REDIS_PASSWORD,
          ttl: 60,
        }),
      }),
    }),
    
    // Pino Logger
    LoggerModule.forRoot(pinoConfig),
    
    // Metrics
    MetricsModule,
    
    // ... your existing modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

#### 5.2 Update `api/src/main.ts`

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';
import { setupSwagger } from './common/swagger/swagger-config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  const reflector = app.get(Reflector);
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(reflector),
    new MetricsInterceptor(metricsService)
  );

  // Swagger/OpenAPI
  const document = setupSwagger(app);
  app.use('/api/docs-json', (req, res) => res.json(document));

  // CORS
  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
    credentials: true,
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🚀 API: http://localhost:${port}`);
  console.log(`📚 Docs: http://localhost:${port}/api/docs`);
  console.log(`📊 Metrics: http://localhost:${port}/metrics`);
}

bootstrap();
```

#### 5.3 Update `api/src/prisma/prisma.service.ts`

Add audit middleware:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createAuditMiddleware } from './audit-middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Register audit middleware (Phase 3)
    if (process.env.FEATURE_AUDIT_LOGGING !== 'false') {
      this.$use(createAuditMiddleware(this));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 5.4 Create Upload Module

```bash
# Create if doesn't exist
mkdir -p api/src/upload
```

```typescript
// api/src/upload/upload.module.ts
import { Module, Global } from '@nestjs/common';
import { R2Service } from './r2.service';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { KeyGeneratorService } from './key-generator.service';

@Global()
@Module({
  providers: [R2Service, CloudflareR2Service, KeyGeneratorService],
  exports: [R2Service, CloudflareR2Service, KeyGeneratorService],
})
export class UploadModule {}
```

#### 5.5 Create Common Module

```typescript
// api/src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { ResponseWrapperService } from './services/response-wrapper.service';

@Global()
@Module({
  providers: [ResponseWrapperService],
  exports: [ResponseWrapperService],
})
export class CommonModule {}
```

---

### Step 6: Update Admin App

#### 6.1 Update `admin/src/App.tsx`

Add WebSocket initialization:

```typescript
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { wsService } from './services/websocket.service';
import { useMaintenanceStore } from './stores/maintenance.store';
import { MaintenanceBanner } from './components/MaintenanceBanner';

function App() {
  const { getToken } = useAuth();
  const setMaintenanceMode = useMaintenanceStore(state => state.setMaintenanceMode);

  useEffect(() => {
    const initWebSocket = async () => {
      try {
        const token = await getToken();
        if (token) {
          wsService.connect(token);
          wsService.on('maintenanceModeChanged', setMaintenanceMode);
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
      }
    };

    initWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, [getToken]);

  return (
    <>
      <MaintenanceBanner />
      {/* Your existing app content */}
    </>
  );
}

export default App;
```

---

### Step 7: Build & Test

```bash
# Build types package
cd packages/types
npm run build

# Test API
cd ../../api
npm run build
npm run start:dev

# In another terminal, test endpoints
curl http://localhost:3002/health
curl http://localhost:3002/metrics
curl http://localhost:3002/api/docs

# Test Redis
redis-cli -h localhost -p 6379 -a devpassword ping
# Expected: PONG

# Test WebSocket
# Open browser console at http://localhost:3001
# Check for: "✅ WebSocket connected"
```

---

## 🔍 Verification

### Verify Phase 1: Critical Hardening
```bash
# Upload a file and check database
curl -X POST http://localhost:3002/content/elearning/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "courseId=xxx" \
  -F "moduleId=yyy"

# Check database
psql $DATABASE_URL -c "SELECT etag, checksum, version FROM assets ORDER BY created_at DESC LIMIT 1;"
# Should show: etag, checksum, version fields populated
```

### Verify Phase 2: Caching
```bash
# First request (cache miss)
time curl http://localhost:3002/platform-settings
# ~50ms

# Second request (cache hit)
time curl http://localhost:3002/platform-settings
# ~2ms (much faster!)

# Check Redis
redis-cli -a devpassword GET "platform:settings:current"
# Should show cached JSON
```

### Verify Phase 3: Audit Logs
```bash
# Perform an action
curl -X POST http://localhost:3002/policy-alerts \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","message":"Test","alertType":"info","regions":["ZH"]}'

# Check audit logs
curl http://localhost:3002/admin/audit-logs \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Should show audit log entry
```

### Verify Phase 4: Shared Types
```bash
# Build types
cd packages/types && npm run build

# Check build output
ls -la dist/
# Should show: index.js, index.d.ts, *.js, *.d.ts

# Test import in API
cd ../../api
node -e "const types = require('../packages/types/dist'); console.log(types.UserRole);"
```

### Verify Phase 5: Observability
```bash
# Check metrics
curl http://localhost:3002/metrics

# Should show:
# http_requests_total{...} 42
# http_request_duration_seconds{...} 0.15
# content_uploads_total{...} 5
# cache_hits_total{...} 10

# Check logs (structured JSON in production)
NODE_ENV=production npm run start:dev
# Logs should be JSON format

# Check traceId in error
curl http://localhost:3002/policy-alerts/invalid-id
# Response should include: "traceId": "xxx-yyy-zzz"
```

---

## 🐛 Troubleshooting

### Issue: Redis connection failed
**Solution:**
```bash
# Check Redis is running
docker compose ps redis

# Check Redis logs
docker compose logs redis

# Test connection
redis-cli -h localhost -p 6379 -a devpassword ping

# Restart Redis
docker compose restart redis
```

### Issue: Prisma migration failed
**Solution:**
```bash
# Check database is running
docker compose ps postgres

# Reset and retry
cd api
npx prisma migrate reset
npx prisma migrate dev
```

### Issue: WebSocket not connecting
**Solution:**
1. Check API logs for WebSocket errors
2. Verify `FRONTEND_URL` and `ADMIN_URL` in .env
3. Check browser console for connection errors
4. Ensure socket.io-client version matches server

### Issue: Metrics endpoint returns 404
**Solution:**
```bash
# Verify MetricsModule is imported in app.module.ts
# Check if metrics controller is registered
# Restart API server
```

### Issue: Types not found
**Solution:**
```bash
# Build types package
cd packages/types
npm run build

# Check build succeeded
ls -la dist/

# Clear node_modules cache
cd ../../api
rm -rf node_modules/@workspace
npm install
```

---

## 📊 Health Checks

After installation, verify all systems:

```bash
# 1. API Health
curl http://localhost:3002/health
# Expected: { "status": "ok", "info": { "database": { "status": "up" }, "redis": { "status": "up" } } }

# 2. Database Connection
cd api
npx prisma studio
# Should open Prisma Studio at http://localhost:5555

# 3. Redis Connection
redis-cli -h localhost -p 6379 -a devpassword
> INFO
> PING
# Expected: PONG

# 4. WebSocket
# Open browser console at http://localhost:3001
# Look for: "✅ WebSocket connected"

# 5. Metrics
curl http://localhost:3002/metrics | head -n 20
# Should show Prometheus-format metrics

# 6. Swagger Docs
# Open http://localhost:3002/api/docs
# Should show enhanced API documentation
```

---

## 🧪 Testing

### Run Unit Tests
```bash
cd api
npm run test

# Test specific files
npm run test -- r2.service.spec
npm run test -- platform-settings.service.spec
```

### Run E2E Tests (if implemented)
```bash
cd api
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Upload file → check checksum in database
- [ ] Toggle maintenance mode → verify WebSocket broadcast
- [ ] Update setting twice → verify revision conflict
- [ ] Create policy alert → check audit log
- [ ] Access /metrics → verify Prometheus format
- [ ] Check logs → verify structured format
- [ ] Test with invalid DTO → verify 400 error with validation details
- [ ] Simulate DB error → verify R2 cleanup

---

## 🚀 Production Deployment

### Pre-Deployment
1. **Backup Database**
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Test Migrations on Staging**
   ```bash
   DATABASE_URL=$STAGING_URL npx prisma migrate deploy
   ```

3. **Load Test**
   - 1000 concurrent requests
   - 100 concurrent WebSocket connections
   - Monitor Redis memory usage

### Deployment Steps

1. **Provision Infrastructure**
   - Redis instance (AWS ElastiCache, Redis Cloud, etc.)
   - Update environment variables
   - Configure WebSocket support in load balancer

2. **Deploy Code**
   ```bash
   git pull origin main
   npm install
   cd api && npx prisma migrate deploy
   npm run build
   pm2 restart all  # or your process manager
   ```

3. **Verify Services**
   ```bash
   # Check health
   curl https://api.yourdomain.com/health
   
   # Check metrics
   curl https://api.yourdomain.com/metrics
   
   # Test WebSocket
   # Check browser console
   ```

4. **Monitor**
   - Watch error logs for 1 hour
   - Monitor Redis CPU/memory
   - Check cache hit rate
   - Verify audit logs are being created

---

## 📈 Monitoring Setup

### Prometheus Configuration

Create `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'pc-solutions-api'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'
```

Start Prometheus:
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Access: http://localhost:9090

### Grafana Dashboard (Optional)

```bash
docker run -d -p 3003:3000 grafana/grafana

# Add Prometheus data source
# Import dashboard for Node.js apps
```

---

## 📖 Documentation

After installation, refer to:

- **`ALL_PHASES_COMPLETE.md`** - Implementation summary
- **`ARCHITECTURE_IMPROVEMENT_PLAN.md`** - Original plan
- **`IMPLEMENTATION_TICKETS.md`** - Detailed tickets
- **`packages/types/README.md`** - Using shared types
- **`api/src/common/README_PHASE1.md`** - Phase 1 technical details

---

## ✅ Installation Complete!

If all steps succeeded, you should have:

✅ Redis caching with 60s TTL  
✅ WebSocket real-time updates  
✅ Optimistic locking on settings  
✅ Complete audit trail  
✅ CASL authorization  
✅ Prometheus metrics  
✅ Structured logging  
✅ Type-safe API/frontend communication  

**Next:** Monitor for 24-48 hours, then proceed to production deployment.

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs:** `docker compose logs -f api`
2. **Check Redis:** `docker compose logs redis`
3. **Check Database:** `npx prisma studio`
4. **Review Docs:** See documentation links above
5. **Contact Team:** Reference traceId from error responses

---

**Installation Guide Version:** 1.0  
**Last Updated:** 2025-10-11
