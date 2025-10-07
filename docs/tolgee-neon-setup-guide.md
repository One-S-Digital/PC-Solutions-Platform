# Tolgee Setup with Neon PostgreSQL - Complete Guide

A comprehensive guide to set up Tolgee with Neon PostgreSQL database for your ProCrèche platform.

## Table of Contents

1. [Neon PostgreSQL Setup](#1-neon-postgresql-setup)
2. [Tolgee Docker Configuration](#2-tolgee-docker-configuration)
3. [Environment Configuration](#3-environment-configuration)
4. [Deployment Options](#4-deployment-options)
5. [Initial Tolgee Setup](#5-initial-tolgee-setup)
6. [Testing & Verification](#6-testing--verification)
7. [Troubleshooting](#7-troubleshooting)

## 1. Neon PostgreSQL Setup

### Step 1: Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub, Google, or email
3. Verify your email address

### Step 2: Create Database Project
1. **Click "Create Project"**
2. **Project name**: `tolgee-procreche`
3. **Database name**: `tolgee` (or leave default)
4. **Region**: Choose closest to your deployment (e.g., `us-east-1` for Render)
5. **PostgreSQL version**: `15` (recommended)
6. **Click "Create Project"**

### Step 3: Get Connection Details
1. **Wait for project creation** (1-2 minutes)
2. **Go to "Dashboard"** → Your project
3. **Click "Connection Details"**
4. **Copy these values**:
   - **Host**: `ep-xxxxx.us-east-1.aws.neon.tech`
   - **Port**: `5432`
   - **Database**: `neondb` (or your custom name)
   - **Username**: `neondb_owner`
   - **Password**: `your_generated_password`
   - **Connection String**: `postgresql://neondb_owner:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb`

### Step 4: Create Tolgee Database
1. **Go to "SQL Editor"** in Neon dashboard
2. **Run this SQL**:
```sql
-- Create database for Tolgee
CREATE DATABASE tolgee;

-- Create user for Tolgee (optional, you can use the owner user)
CREATE USER tolgee_user WITH PASSWORD 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE tolgee TO tolgee_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO tolgee_user;

-- Connect to tolgee database
\c tolgee;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO tolgee_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tolgee_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tolgee_user;
```

### Step 5: Test Connection
1. **Go to "SQL Editor"**
2. **Select database**: `tolgee`
3. **Run test query**:
```sql
SELECT current_database(), current_user, version();
```

## 2. Tolgee Docker Configuration

### Create Tolgee Docker Compose

Create `/infra/tolgee-neon.docker-compose.yml`:

```yaml
version: "3.8"
services:
  tolgee:
    image: tolgee/tolgee:latest
    restart: unless-stopped
    ports: ["8080:8080"]
    environment:
      # Authentication
      TOLGEE_AUTHENTICATION_ENABLED: "true"
      TOLGEE_AUTHENTICATION_DEFAULT_ENABLED: "true"
      
      # Neon PostgreSQL Database
      SPRING_DATASOURCE_URL: "${NEON_DATABASE_URL}"
      SPRING_DATASOURCE_USERNAME: "${NEON_DATABASE_USERNAME}"
      SPRING_DATASOURCE_PASSWORD: "${NEON_DATABASE_PASSWORD}"
      
      # App Configuration
      TOLGEE_APP_FRONTEND_URL: "${TOLGEE_FRONTEND_URL}"
      TOLGEE_APP_BASE_URL: "${TOLGEE_BASE_URL}"
      
      # Security
      TOLGEE_AUTHENTICATION_JWT_SECRET: "${JWT_SECRET}"
      
      # File Storage
      TOLGEE_FILE_STORAGE: "local"
      TOLGEE_FILE_STORAGE_LOCAL_PATH: "/app/data"
      
      # Logging
      LOGGING_LEVEL_ROOT: "INFO"
      LOGGING_LEVEL_TOLGEE: "DEBUG"
      
      # Database Settings
      SPRING_JPA_HIBERNATE_DDL_AUTO: "update"
      SPRING_JPA_SHOW_SQL: "false"
      SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: "org.hibernate.dialect.PostgreSQLDialect"
      
      # Connection Pool Settings for Neon
      SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: "10"
      SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE: "2"
      SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT: "300000"
      SPRING_DATASOURCE_HIKARI_MAX_LIFETIME: "1200000"
      SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT: "20000"
      
    volumes:
      - tolgee_data:/app/data
      
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

volumes:
  tolgee_data:
```

### Create Dockerfile for Render

Create `/infra/Dockerfile.tolgee-neon`:

```dockerfile
FROM openjdk:17-jre-slim

# Install curl and other utilities
RUN apt-get update && \
    apt-get install -y curl wget && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Download Tolgee JAR
RUN wget https://github.com/tolgee/tolgee/releases/latest/download/tolgee.jar -O tolgee.jar

# Create data directory
RUN mkdir -p /app/data && chown -R 1000:1000 /app/data

# Switch to non-root user
USER 1000

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Start Tolgee with JVM settings optimized for Neon
CMD ["java", "-Xmx512m", "-Xms256m", "-Dspring.profiles.active=production", "-jar", "tolgee.jar"]
```

## 3. Environment Configuration

### Local Development (.env.local)

Create `.env.local` in your project root:

```bash
# Neon Database Configuration
NEON_DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
NEON_DATABASE_USERNAME=tolgee_user
NEON_DATABASE_PASSWORD=your_secure_password

# Tolgee Configuration
TOLGEE_FRONTEND_URL=http://localhost:8080
TOLGEE_BASE_URL=http://localhost:8080
JWT_SECRET=your_jwt_secret_here_minimum_32_characters

# Optional: Connection Pool Settings
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

### Production Environment Variables

For Render/Railway/VPS deployment:

```bash
# Neon Database (Production)
NEON_DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
NEON_DATABASE_USERNAME=tolgee_user
NEON_DATABASE_PASSWORD=your_secure_production_password

# Tolgee Configuration
TOLGEE_FRONTEND_URL=https://tolgee.yourdomain.com
TOLGEE_BASE_URL=https://tolgee.yourdomain.com
JWT_SECRET=your_production_jwt_secret_minimum_32_characters

# Database Settings
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect

# Connection Pool (Production)
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=20
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=5
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

## 4. Deployment Options

### Option A: Local Development

```bash
# Start Tolgee locally
cd infra
docker compose -f tolgee-neon.docker-compose.yml up -d

# Check logs
docker compose -f tolgee-neon.docker-compose.yml logs -f tolgee

# Stop when done
docker compose -f tolgee-neon.docker-compose.yml down
```

### Option B: Render Deployment

1. **Create render.yaml**:
```yaml
services:
  - type: web
    name: tolgee
    env: docker
    dockerfilePath: ./infra/Dockerfile.tolgee-neon
    dockerContext: ./infra
    plan: starter
    region: oregon
    branch: main
    buildCommand: ""
    startCommand: ""
    healthCheckPath: /actuator/health
    healthCheckGracePeriod: 300
    envVars:
      - key: NEON_DATABASE_URL
        sync: false
      - key: NEON_DATABASE_USERNAME
        sync: false
      - key: NEON_DATABASE_PASSWORD
        sync: false
      - key: TOLGEE_FRONTEND_URL
        value: https://tolgee.onrender.com
      - key: TOLGEE_BASE_URL
        value: https://tolgee.onrender.com
      - key: JWT_SECRET
        generateValue: true
      - key: SPRING_JPA_HIBERNATE_DDL_AUTO
        value: "update"
      - key: SPRING_JPA_SHOW_SQL
        value: "false"
      - key: SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE
        value: "10"
```

2. **Deploy to Render**:
   - Connect your GitHub repository
   - Select the render.yaml configuration
   - Set environment variables
   - Deploy

### Option C: Railway Deployment

1. **Create railway.json**:
```json
{
  "deploy": {
    "startCommand": "java -Xmx512m -Xms256m -jar tolgee.jar",
    "healthcheckPath": "/actuator/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

2. **Deploy to Railway**:
   - Connect GitHub repository
   - Set environment variables
   - Deploy

## 5. Initial Tolgee Setup

### Step 1: Access Tolgee
1. **Go to your Tolgee URL**: `http://localhost:8080` (local) or your deployed URL
2. **Wait for startup** (2-3 minutes for first run)

### Step 2: Create Admin Account
1. **Username**: `admin@procrechesolutions.com`
2. **Password**: Choose a strong password
3. **Organization**: `ProCreche Solutions`
4. **Click "Create account"**

### Step 3: Create Project
1. **Project name**: `ProCreche Platform`
2. **Base language**: `English (en)`
3. **Additional languages**: `French (fr)`, `German (de)`
4. **Click "Create project"**

### Step 4: Create Namespaces
1. **Go to "Project Settings"** → **"Namespaces"**
2. **Create these namespaces**:
   - `common`
   - `auth`
   - `dashboard`
   - `pricing`
   - `admin-common`
   - `admin-dashboard`

### Step 5: Generate API Keys
1. **Go to "Project Settings"** → **"API Keys"**
2. **Create Development Key**:
   - Name: `Development`
   - Scopes: `Read & Write`
3. **Create Production Key**:
   - Name: `Production`
   - Scopes: `Read only`

## 6. Testing & Verification

### Test Database Connection
```bash
# Test with psql (if installed)
psql "postgresql://tolgee_user:password@ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require"

# Test with curl
curl -H "Authorization: Bearer tgpat_your_key_here" \
  "https://tolgee.yourdomain.com/v2/projects/translations?languages=en,fr,de"
```

### Test Tolgee Health
```bash
# Health check
curl https://tolgee.yourdomain.com/actuator/health

# Should return:
# {"status":"UP","components":{"db":{"status":"UP"},"diskSpace":{"status":"UP"}}}
```

### Test Frontend Integration
1. **Update your frontend `.env.local`**:
```bash
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.yourdomain.com
NEXT_PUBLIC_TOLGEE_API_KEY=tgpat_your_development_key
NEXT_PUBLIC_I18N_LANGS=en,fr,de
```

2. **Test translation loading**:
```tsx
import { useTranslate } from '@tolgee/react';

function TestComponent() {
  const { t } = useTranslate('common');
  return <div>{t('appName')}</div>;
}
```

## 7. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check Neon connection string and SSL mode |
| Tolgee won't start | Check JVM memory settings and logs |
| Health check fails | Increase grace period and check port 8080 |
| Slow performance | Optimize connection pool settings |
| Out of memory | Increase JVM heap size (-Xmx) |

### Debug Commands

```bash
# Check Tolgee logs
docker logs tolgee-container-name

# Check database connection
docker exec tolgee-container-name curl -f http://localhost:8080/actuator/health

# Check Neon connection
psql "postgresql://user:pass@host:port/db?sslmode=require" -c "SELECT 1;"
```

### Neon-Specific Optimizations

```bash
# Optimize for Neon's serverless nature
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

## Cost Breakdown

- **Neon Free Tier**: 0.5GB storage, 10GB transfer/month (FREE)
- **Neon Pro**: $19/month for 10GB storage, 100GB transfer
- **Render Starter**: $7/month
- **Total**: $7-26/month depending on usage

## Next Steps

1. **Complete the setup** following the steps above
2. **Import your existing translations** from JSON files
3. **Update your applications** to use Tolgee SDK
4. **Train translators** on the new interface
5. **Set up monitoring** and alerts

This setup gives you a modern, scalable translation management system with a serverless PostgreSQL database that automatically scales with your needs!