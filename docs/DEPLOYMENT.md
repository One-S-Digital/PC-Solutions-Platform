# Deployment Guide

## Overview

This guide covers deploying the PC Solutions platform to production environments, including Render, Vercel, and other cloud platforms.

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database
- Clerk account for authentication
- Stripe account for payments (optional)

## Environment Setup

### Required Environment Variables

#### Web Client (`apps/web-client`)
```env
VITE_API_URL=https://your-api-url.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
VITE_SKIP_AUTH=false
```

#### Admin Dashboard (`admin/`)
```env
VITE_API_URL=https://your-api-url.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
```

#### API (`api/`)
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_super_secret_jwt_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-web-client-url.onrender.com,https://your-admin-url.onrender.com
```

## Render Deployment

### 1. Database Setup

Create a PostgreSQL database on Render:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `pc-solutions-db`
   - **Database**: `pc_solutions`
   - **User**: `pc_solutions_user`
   - **Region**: `Oregon (US West)`
   - **Plan**: `Free` or `Starter`

### 2. API Service

Create the API service:

1. Connect your GitHub repository
2. Configure:
   - **Name**: `pc-solutions-api`
   - **Environment**: `Node`
   - **Build Command**: `cd api && pnpm install && pnpm run build`
   - **Start Command**: `cd api && pnpm run start:prod`
   - **Auto-Deploy**: `Yes`

3. Set environment variables:
   ```env
   DATABASE_URL=postgresql://pc_solutions_user:password@host:port/pc_solutions
   JWT_SECRET=your_super_secret_jwt_key
   CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=https://pc-solutions-web-client.onrender.com,https://pc-solutions-admin.onrender.com
   ```

### 3. Web Client Service

Create the web client service:

1. Connect your GitHub repository
2. Configure:
   - **Name**: `pc-solutions-web-client`
   - **Environment**: `Static Site`
   - **Build Command**: `cd apps/web-client && pnpm install && pnpm run build`
   - **Publish Directory**: `apps/web-client/dist`
   - **Auto-Deploy**: `Yes`

3. Set environment variables:
   ```env
   VITE_API_URL=https://pc-solutions-api.onrender.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
   VITE_SKIP_AUTH=false
   ```

### 4. Admin Dashboard Service

Create the admin dashboard service:

1. Connect your GitHub repository
2. Configure:
   - **Name**: `pc-solutions-admin`
   - **Environment**: `Static Site`
   - **Build Command**: `cd admin && pnpm install && pnpm run build`
   - **Publish Directory**: `admin/dist`
   - **Auto-Deploy**: `Yes`

3. Set environment variables:
   ```env
   VITE_API_URL=https://pc-solutions-api.onrender.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
   ```

### 5. Database Migration

After the API service is deployed, run database migrations:

1. Go to your API service on Render
2. Open the Shell tab
3. Run:
   ```bash
   cd api && pnpm prisma migrate deploy
   cd api && pnpm prisma generate
   ```

## Vercel Deployment

### 1. Web Client

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to project: `cd apps/web-client`
3. Deploy: `vercel --prod`
4. Set environment variables in Vercel dashboard

### 2. Admin Dashboard

1. Navigate to project: `cd admin`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard

### 3. API (Alternative)

For API deployment on Vercel:

1. Create `vercel.json` in `api/`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/main.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/main.js"
       }
     ]
   }
   ```

2. Deploy: `cd api && vercel --prod`

## Docker Deployment

### 1. Create Dockerfiles

#### API Dockerfile (`api/Dockerfile`)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "run", "start:prod"]
```

#### Web Client Dockerfile (`apps/web-client/Dockerfile`)
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: pc_solutions
      POSTGRES_USER: pc_solutions_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://pc_solutions_user:your_password@database:5432/pc_solutions
      JWT_SECRET: your_jwt_secret
      CLERK_SECRET_KEY: your_clerk_secret
      PORT: 3000
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - database

  web-client:
    build: ./apps/web-client
    ports:
      - "3001:80"
    depends_on:
      - api

  admin:
    build: ./admin
    ports:
      - "3002:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

### 3. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec api pnpm prisma migrate deploy

# View logs
docker-compose logs -f
```

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/pc_solutions_dev
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret
```

### Staging
```env
NODE_ENV=staging
DATABASE_URL=postgresql://staging_host:5432/pc_solutions_staging
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret
```

### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod_host:5432/pc_solutions_prod
CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret
```

## SSL/HTTPS Configuration

### Render
- SSL certificates are automatically provisioned
- Custom domains supported
- Force HTTPS enabled by default

### Vercel
- SSL certificates automatically provisioned
- Custom domains supported
- Force HTTPS enabled by default

### Nginx (Docker)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## Monitoring and Logging

### Health Checks

#### API Health Check
```typescript
// api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  }
}
```

#### Database Health Check
```typescript
@Get('database')
async checkDatabase() {
  try {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  } catch (error) {
    return { status: 'error', database: 'disconnected' }
  }
}
```

### Logging Configuration

#### API Logging
```typescript
// api/src/main.ts
import { Logger } from '@nestjs/common'

const logger = new Logger('Bootstrap')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  // Configure logging
  app.useLogger(logger)
  
  await app.listen(process.env.PORT || 3000)
  logger.log(`Application is running on: ${await app.getUrl()}`)
}
```

### Error Tracking

#### Sentry Integration
```typescript
// api/src/main.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
})

// Web client
// apps/web-client/src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV
})
```

## Performance Optimization

### API Optimization

#### Caching
```typescript
// api/src/app.module.ts
import { CacheModule } from '@nestjs/cache-manager'

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100 // maximum number of items in cache
    })
  ]
})
export class AppModule {}
```

#### Rate Limiting
```typescript
// api/src/main.ts
import { ThrottlerModule } from '@nestjs/throttler'

app.useGlobalGuards(new ThrottlerGuard())

// Configure in app.module.ts
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100
})
```

### Frontend Optimization

#### Code Splitting
```typescript
// apps/web-client/src/App.tsx
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
      </Routes>
    </Suspense>
  )
}
```

#### Image Optimization
```typescript
// apps/web-client/src/components/Image.tsx
import { useState } from 'react'

const Image: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div className="relative">
      {loading && <div className="animate-pulse bg-gray-200 h-48 w-full" />}
      <img
        src={src}
        alt={alt}
        className={`w-full h-48 object-cover ${loading ? 'hidden' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
      {error && <div className="bg-gray-200 h-48 w-full flex items-center justify-center">Image failed to load</div>}
    </div>
  )
}
```

## Backup and Recovery

### Database Backup

#### Automated Backups
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pc_solutions_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to cloud storage
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Clean up old backups (keep last 30 days)
find . -name "pc_solutions_backup_*.sql" -mtime +30 -delete
```

#### Restore from Backup
```bash
# Restore database
psql $DATABASE_URL < backup_file.sql

# Or restore specific tables
psql $DATABASE_URL -c "COPY table_name FROM 'backup_file.csv' WITH CSV HEADER;"
```

### File Storage Backup

#### S3 Backup
```typescript
// services/backup.service.ts
@Injectable()
export class BackupService {
  async backupFiles() {
    const files = await this.prisma.file.findMany()
    
    for (const file of files) {
      // Copy to backup bucket
      await this.s3.copyObject({
        Bucket: 'backup-bucket',
        CopySource: `original-bucket/${file.key}`,
        Key: `backup/${file.key}`
      }).promise()
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules
rm -rf .next
rm -rf dist
pnpm install
pnpm run build
```

#### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check database status
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
node --inspect app.js
```

### Performance Issues

#### Slow API Responses
```typescript
// Add request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`)
    }
  })
  next()
})
```

#### High Memory Usage
```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB'
  })
}, 30000)
```

## Security Considerations

### Environment Variables
- Never commit sensitive data to version control
- Use different secrets for each environment
- Rotate secrets regularly
- Use secret management services

### API Security
```typescript
// Enable CORS
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
})

// Rate limiting
app.useGlobalGuards(new ThrottlerGuard())

// Input validation
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true
}))
```

### Frontend Security
```typescript
// Content Security Policy
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:"],
  'connect-src': ["'self'", "https://api.clerk.com"]
}
```

## Conclusion

This deployment guide provides comprehensive instructions for deploying the PC Solutions platform to various environments. Key points:

- **Multiple Deployment Options** - Render, Vercel, Docker
- **Environment Configuration** - Proper environment variable setup
- **Database Management** - Migration and backup strategies
- **Performance Optimization** - Caching, rate limiting, code splitting
- **Monitoring and Logging** - Health checks and error tracking
- **Security Best Practices** - CORS, validation, secret management

The platform is designed to be easily deployable and maintainable across different cloud providers and environments.