# Complete Tolgee + Neon PostgreSQL Setup Guide

**The most comprehensive guide to set up Tolgee translation management with Neon PostgreSQL for your ProCrèche platform.**

## Table of Contents

1. [Prerequisites & Overview](#1-prerequisites--overview)
2. [Neon PostgreSQL Setup](#2-neon-postgresql-setup)
3. [Tolgee Docker Configuration](#3-tolgee-docker-configuration)
4. [Environment Configuration](#4-environment-configuration)
5. [Local Development Setup](#5-local-development-setup)
6. [Production Deployment Options](#6-production-deployment-options)
7. [Initial Tolgee Configuration](#7-initial-tolgee-configuration)
8. [Import Existing Translations](#8-import-existing-translations)
9. [Frontend Integration](#9-frontend-integration)
10. [Admin Integration](#10-admin-integration)
11. [Testing & Verification](#11-testing--verification)
12. [Monitoring & Maintenance](#12-monitoring--maintenance)
13. [Troubleshooting](#13-troubleshooting)
14. [Security Best Practices](#14-security-best-practices)
15. [Performance Optimization](#15-performance-optimization)

## 1. Prerequisites & Overview

### What You'll Need
- **GitHub account** (for code repository)
- **Email address** (for Neon and deployment services)
- **Domain name** (optional, for custom domain)
- **Basic terminal/command line knowledge**
- **Docker installed** (for local development)

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin         │    │   Tolgee        │
│   (Next.js)     │◄───┤   (Next.js)     │◄───┤   (Self-hosted) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Neon          │
                    │   PostgreSQL    │
                    │   (Serverless)  │
                    └─────────────────┘
```

### What This Guide Covers
- ✅ Complete Neon PostgreSQL setup
- ✅ Tolgee self-hosted configuration
- ✅ Local development environment
- ✅ Production deployment (Render/Railway)
- ✅ Migration from existing i18n system
- ✅ Frontend and Admin integration
- ✅ Security and performance optimization
- ✅ Monitoring and maintenance

### Expected Timeline
- **Setup**: 30-45 minutes
- **Migration**: 1-2 hours
- **Testing**: 30 minutes
- **Total**: 2-3 hours

---

## 2. Neon PostgreSQL Setup

### Step 1: Create Neon Account

#### 1.1 Sign Up Process
1. **Navigate to Neon**: Go to [neon.tech](https://neon.tech)
2. **Click "Sign Up"** in the top right corner
3. **Choose signup method**:
   - **GitHub** (recommended for developers)
   - **Google** (quick setup)
   - **Email** (traditional signup)
4. **Complete verification**:
   - Check your email for verification link
   - Click the verification link
   - Return to Neon dashboard

#### 1.2 Account Setup
1. **Complete profile** (optional but recommended):
   - Add your name
   - Select your primary use case: "Web Application"
   - Choose your experience level
2. **Verify payment method** (required even for free tier):
   - Add a credit card (won't be charged on free tier)
   - Or use PayPal if available

### Step 2: Create Database Project

#### 2.1 Project Creation
1. **Click "Create Project"** on the dashboard
2. **Fill in project details**:
   - **Project name**: `tolgee-procreche`
   - **Description**: `Tolgee translation management for ProCreche platform`
3. **Database configuration**:
   - **Database name**: `neondb` (default, we'll create tolgee later)
   - **Region**: Choose based on your deployment:
     - `us-east-1` (N. Virginia) - Best for Render
     - `us-west-2` (Oregon) - Good for US West Coast
     - `eu-west-1` (Ireland) - Best for Europe
     - `ap-southeast-1` (Singapore) - Best for Asia
4. **PostgreSQL version**: `15` (recommended for Tolgee)
5. **Click "Create Project"**

#### 2.2 Wait for Provisioning
- **Expected time**: 1-2 minutes
- **Status indicators**: You'll see progress bars
- **Completion**: Green checkmark appears

### Step 3: Get Connection Details

#### 3.1 Access Connection Information
1. **Navigate to project dashboard**
2. **Click "Connection Details"** button
3. **Copy the following values** (save them securely):

```bash
# Connection Details
Host: ep-xxxxx.us-east-1.aws.neon.tech
Port: 5432
Database: neondb
Username: neondb_owner
Password: [generated-password]
Connection String: postgresql://neondb_owner:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

#### 3.2 Save Connection Details
Create a secure file to store these details:

```bash
# Create secure storage file
mkdir -p ~/.neon
cat > ~/.neon/tolgee-credentials.txt << EOF
# Neon Tolgee Database Credentials
# Generated: $(date)
# Project: tolgee-procreche

HOST=ep-xxxxx.us-east-1.aws.neon.tech
PORT=5432
DATABASE=neondb
USERNAME=neondb_owner
PASSWORD=your_generated_password
CONNECTION_STRING=postgresql://neondb_owner:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
EOF

# Secure the file
chmod 600 ~/.neon/tolgee-credentials.txt
```

### Step 4: Create Tolgee Database

#### 4.1 Access SQL Editor
1. **Go to "SQL Editor"** in your Neon dashboard
2. **Select database**: `neondb` (default database)
3. **Click "New Query"**

#### 4.2 Create Tolgee Database and User
Run the following SQL commands in sequence:

```sql
-- Step 1: Create dedicated database for Tolgee
CREATE DATABASE tolgee;

-- Step 2: Create dedicated user for Tolgee
CREATE USER tolgee_user WITH PASSWORD 'TolgeeSecure2024!';

-- Step 3: Grant database permissions
GRANT ALL PRIVILEGES ON DATABASE tolgee TO tolgee_user;

-- Step 4: Connect to tolgee database
\c tolgee;

-- Step 5: Grant schema permissions
GRANT ALL ON SCHEMA public TO tolgee_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tolgee_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tolgee_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO tolgee_user;

-- Step 6: Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tolgee_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tolgee_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO tolgee_user;
```

#### 4.3 Verify Database Creation
```sql
-- Check if database was created
SELECT datname FROM pg_database WHERE datname = 'tolgee';

-- Check user permissions
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'tolgee_user';

-- Test connection to tolgee database
\c tolgee;
SELECT current_database(), current_user, version();
```

### Step 5: Test Connection

#### 5.1 Test with psql (if installed locally)
```bash
# Install psql if not available
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client
# Windows: Download from postgresql.org

# Test connection
psql "postgresql://tolgee_user:TolgeeSecure2024!@ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require"

# Run test queries
SELECT current_database(), current_user, version();
SELECT NOW();
\q
```

#### 5.2 Test with Neon Dashboard
1. **Go to "SQL Editor"**
2. **Select database**: `tolgee`
3. **Run test queries**:
```sql
-- Basic connection test
SELECT current_database(), current_user, version();

-- Check PostgreSQL version
SELECT version();

-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name IN ('uuid-ossp', 'pgcrypto');

-- Test timezone
SELECT current_timestamp, timezone('UTC', current_timestamp);
```

#### 5.3 Update Connection Details
Update your credentials file with the new database details:

```bash
# Update credentials file
cat > ~/.neon/tolgee-credentials.txt << EOF
# Neon Tolgee Database Credentials
# Generated: $(date)
# Project: tolgee-procreche

# Original connection (neondb database)
HOST_ORIGINAL=ep-xxxxx.us-east-1.aws.neon.tech
PORT_ORIGINAL=5432
DATABASE_ORIGINAL=neondb
USERNAME_ORIGINAL=neondb_owner
PASSWORD_ORIGINAL=your_generated_password

# Tolgee-specific connection
HOST=ep-xxxxx.us-east-1.aws.neon.tech
PORT=5432
DATABASE=tolgee
USERNAME=tolgee_user
PASSWORD=TolgeeSecure2024!
CONNECTION_STRING=postgresql://tolgee_user:TolgeeSecure2024!@ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
EOF
```

### Step 6: Configure Neon Settings

#### 6.1 Enable Required Extensions
```sql
-- Connect to tolgee database
\c tolgee;

-- Enable UUID extension (required by Tolgee)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable crypto extension (for secure operations)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify extensions
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
```

#### 6.2 Configure Connection Pooling
1. **Go to "Settings"** in your Neon project
2. **Click "Connection Pooling"**
3. **Enable connection pooling**:
   - **Pool mode**: `Transaction`
   - **Max connections**: `100` (adjust based on your needs)
4. **Note the pooled connection string** (different from direct connection)

#### 6.3 Set Up Monitoring
1. **Go to "Monitoring"** tab
2. **Enable metrics collection**
3. **Set up alerts** (optional):
   - High CPU usage
   - Connection limit reached
   - Storage usage warnings

### Step 7: Security Configuration

#### 7.1 IP Whitelist (if needed)
1. **Go to "Settings"** → **"IP Allowlist"**
2. **Add IP addresses**:
   - Your development machine IP
   - Your deployment service IPs (Render, Railway, etc.)
   - Or use `0.0.0.0/0` for development (not recommended for production)

#### 7.2 Database Security
```sql
-- Connect to tolgee database
\c tolgee;

-- Create read-only user for monitoring
CREATE USER tolgee_readonly WITH PASSWORD 'TolgeeReadOnly2024!';
GRANT CONNECT ON DATABASE tolgee TO tolgee_readonly;
GRANT USAGE ON SCHEMA public TO tolgee_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tolgee_readonly;

-- Revoke unnecessary permissions from tolgee_user
REVOKE CREATE ON SCHEMA public FROM tolgee_user;
```

### Step 8: Backup Configuration

#### 8.1 Enable Point-in-Time Recovery
1. **Go to "Settings"** → **"Backups"**
2. **Enable PITR** (Point-in-Time Recovery)
3. **Set retention period**: 7 days (free tier) or 30 days (pro tier)

#### 8.2 Test Backup
```sql
-- Create test data
\c tolgee;
CREATE TABLE test_backup (id SERIAL PRIMARY KEY, data TEXT);
INSERT INTO test_backup (data) VALUES ('test data for backup');

-- Verify data
SELECT * FROM test_backup;

-- Clean up
DROP TABLE test_backup;
```

---

**✅ Neon Setup Complete!**

You now have:
- ✅ Neon PostgreSQL database running
- ✅ Dedicated `tolgee` database
- ✅ Secure `tolgee_user` with proper permissions
- ✅ Connection details saved securely
- ✅ Extensions enabled for Tolgee
- ✅ Monitoring and backups configured

**Next Step**: Configure Tolgee Docker setup

## 3. Tolgee Docker Configuration

### Step 1: Create Project Structure

#### 1.1 Create Infrastructure Directory
```bash
# Create infrastructure directory structure
mkdir -p infra/tolgee
mkdir -p infra/scripts
mkdir -p infra/config

# Create necessary files
touch infra/tolgee-neon.docker-compose.yml
touch infra/Dockerfile.tolgee-neon
touch infra/scripts/start-tolgee.sh
touch infra/scripts/backup-tolgee.sh
touch infra/config/tolgee-application.yml
```

#### 1.2 Set Up File Permissions
```bash
# Make scripts executable
chmod +x infra/scripts/*.sh

# Set proper ownership
chown -R $USER:$USER infra/
```

### Step 2: Create Tolgee Docker Compose

Create `/infra/tolgee-neon.docker-compose.yml`:

```yaml
version: "3.8"

services:
  tolgee:
    image: tolgee/tolgee:latest
    container_name: tolgee-procreche
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      # ===========================================
      # AUTHENTICATION CONFIGURATION
      # ===========================================
      TOLGEE_AUTHENTICATION_ENABLED: "true"
      TOLGEE_AUTHENTICATION_DEFAULT_ENABLED: "true"
      TOLGEE_AUTHENTICATION_JWT_SECRET: "${JWT_SECRET:-TolgeeJWTSecret2024!ChangeThisInProduction}"
      
      # ===========================================
      # NEON POSTGRESQL DATABASE CONFIGURATION
      # ===========================================
      SPRING_DATASOURCE_URL: "${NEON_DATABASE_URL}"
      SPRING_DATASOURCE_USERNAME: "${NEON_DATABASE_USERNAME}"
      SPRING_DATASOURCE_PASSWORD: "${NEON_DATABASE_PASSWORD}"
      SPRING_DATASOURCE_DRIVER_CLASS_NAME: "org.postgresql.Driver"
      
      # ===========================================
      # APPLICATION CONFIGURATION
      # ===========================================
      TOLGEE_APP_FRONTEND_URL: "${TOLGEE_FRONTEND_URL:-http://localhost:8080}"
      TOLGEE_APP_BASE_URL: "${TOLGEE_BASE_URL:-http://localhost:8080}"
      TOLGEE_APP_NAME: "ProCreche Translation Management"
      
      # ===========================================
      # FILE STORAGE CONFIGURATION
      # ===========================================
      TOLGEE_FILE_STORAGE: "local"
      TOLGEE_FILE_STORAGE_LOCAL_PATH: "/app/data"
      
      # ===========================================
      # LOGGING CONFIGURATION
      # ===========================================
      LOGGING_LEVEL_ROOT: "INFO"
      LOGGING_LEVEL_TOLGEE: "DEBUG"
      LOGGING_LEVEL_ORG_SPRINGFRAMEWORK: "WARN"
      LOGGING_LEVEL_ORG_HIBERNATE: "WARN"
      
      # ===========================================
      # DATABASE SETTINGS
      # ===========================================
      SPRING_JPA_HIBERNATE_DDL_AUTO: "update"
      SPRING_JPA_SHOW_SQL: "false"
      SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: "org.hibernate.dialect.PostgreSQLDialect"
      SPRING_JPA_PROPERTIES_HIBERNATE_FORMAT_SQL: "false"
      SPRING_JPA_PROPERTIES_HIBERNATE_USE_SQL_COMMENTS: "false"
      
      # ===========================================
      # CONNECTION POOL SETTINGS (OPTIMIZED FOR NEON)
      # ===========================================
      SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: "10"
      SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE: "2"
      SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT: "300000"
      SPRING_DATASOURCE_HIKARI_MAX_LIFETIME: "1200000"
      SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT: "20000"
      SPRING_DATASOURCE_HIKARI_VALIDATION_TIMEOUT: "5000"
      SPRING_DATASOURCE_HIKARI_LEAK_DETECTION_THRESHOLD: "60000"
      
      # ===========================================
      # JVM SETTINGS
      # ===========================================
      JAVA_OPTS: "-Xmx512m -Xms256m -XX:+UseG1GC -XX:+UseStringDeduplication"
      
      # ===========================================
      # SPRING PROFILES
      # ===========================================
      SPRING_PROFILES_ACTIVE: "production"
      
      # ===========================================
      # MANAGEMENT ENDPOINTS
      # ===========================================
      MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: "health,info,metrics"
      MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS: "always"
      MANAGEMENT_ENDPOINT_HEALTH_SHOW_COMPONENTS: "always"
      
      # ===========================================
      # TOLGEE SPECIFIC SETTINGS
      # ===========================================
      TOLGEE_CORS_ALLOWED_ORIGINS: "${TOLGEE_CORS_ALLOWED_ORIGINS:-*}"
      TOLGEE_CORS_ALLOWED_METHODS: "GET,POST,PUT,DELETE,OPTIONS"
      TOLGEE_CORS_ALLOWED_HEADERS: "*"
      TOLGEE_CORS_ALLOW_CREDENTIALS: "true"
      
    volumes:
      - tolgee_data:/app/data
      - tolgee_logs:/app/logs
      - ./infra/config/tolgee-application.yml:/app/config/application.yml:ro
      
    networks:
      - tolgee-network
      
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
      
    depends_on:
      - tolgee-init
      
  # ===========================================
  # INITIALIZATION SERVICE
  # ===========================================
  tolgee-init:
    image: postgres:15-alpine
    container_name: tolgee-init
    environment:
      PGPASSWORD: "${NEON_DATABASE_PASSWORD}"
    command: >
      sh -c "
        echo 'Waiting for database to be ready...';
        until pg_isready -h ${NEON_DATABASE_HOST} -p ${NEON_DATABASE_PORT} -U ${NEON_DATABASE_USERNAME}; do
          echo 'Database is unavailable - sleeping';
          sleep 2;
        done;
        echo 'Database is ready - initialization complete';
      "
    networks:
      - tolgee-network
    restart: "no"

# ===========================================
# VOLUMES
# ===========================================
volumes:
  tolgee_data:
    driver: local
  tolgee_logs:
    driver: local

# ===========================================
# NETWORKS
# ===========================================
networks:
  tolgee-network:
    driver: bridge
```

### Step 3: Create Custom Dockerfile

Create `/infra/Dockerfile.tolgee-neon`:

```dockerfile
# ===========================================
# TOLGEE CUSTOM DOCKERFILE FOR NEON POSTGRESQL
# ===========================================

FROM openjdk:17-jre-slim

# ===========================================
# METADATA
# ===========================================
LABEL maintainer="ProCreche Solutions <admin@procrechesolutions.com>"
LABEL description="Tolgee translation management with Neon PostgreSQL support"
LABEL version="1.0.0"

# ===========================================
# INSTALL SYSTEM DEPENDENCIES
# ===========================================
RUN apt-get update && \
    apt-get install -y \
        curl \
        wget \
        ca-certificates \
        tzdata \
        && rm -rf /var/lib/apt/lists/*

# ===========================================
# SET TIMEZONE
# ===========================================
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ===========================================
# CREATE APPLICATION DIRECTORY
# ===========================================
WORKDIR /app

# ===========================================
# DOWNLOAD TOLGEE JAR
# ===========================================
RUN wget -O tolgee.jar https://github.com/tolgee/tolgee/releases/latest/download/tolgee.jar && \
    chmod +x tolgee.jar

# ===========================================
# CREATE NECESSARY DIRECTORIES
# ===========================================
RUN mkdir -p /app/data /app/logs /app/config && \
    chown -R 1000:1000 /app

# ===========================================
# CREATE NON-ROOT USER
# ===========================================
RUN groupadd -r tolgee && useradd -r -g tolgee -u 1000 tolgee

# ===========================================
# SET OWNERSHIP
# ===========================================
RUN chown -R tolgee:tolgee /app

# ===========================================
# SWITCH TO NON-ROOT USER
# ===========================================
USER tolgee

# ===========================================
# EXPOSE PORT
# ===========================================
EXPOSE 8080

# ===========================================
# HEALTH CHECK
# ===========================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# ===========================================
# START COMMAND
# ===========================================
CMD ["java", \
     "-Xmx512m", \
     "-Xms256m", \
     "-XX:+UseG1GC", \
     "-XX:+UseStringDeduplication", \
     "-Dspring.profiles.active=production", \
     "-Djava.security.egd=file:/dev/./urandom", \
     "-jar", \
     "tolgee.jar"]
```

### Step 4: Create Application Configuration

Create `/infra/config/tolgee-application.yml`:

```yaml
# ===========================================
# TOLGEE APPLICATION CONFIGURATION
# ===========================================

spring:
  profiles:
    active: production
  
  # ===========================================
  # DATABASE CONFIGURATION
  # ===========================================
  datasource:
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 300000
      max-lifetime: 1200000
      connection-timeout: 20000
      validation-timeout: 5000
      leak-detection-threshold: 60000
      pool-name: TolgeeHikariCP
      
  # ===========================================
  # JPA CONFIGURATION
  # ===========================================
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
        use_sql_comments: false
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true
        
  # ===========================================
  # CACHING CONFIGURATION
  # ===========================================
  cache:
    type: simple
    cache-names:
      - translations
      - projects
      - users

# ===========================================
# TOLGEE CONFIGURATION
# ===========================================
tolgee:
  authentication:
    enabled: true
    default-enabled: true
    
  app:
    name: "ProCreche Translation Management"
    
  file-storage:
    type: local
    local-path: /app/data
    
  cors:
    allowed-origins: "*"
    allowed-methods: "GET,POST,PUT,DELETE,OPTIONS"
    allowed-headers: "*"
    allow-credentials: true

# ===========================================
# LOGGING CONFIGURATION
# ===========================================
logging:
  level:
    root: INFO
    tolgee: DEBUG
    org.springframework: WARN
    org.hibernate: WARN
    org.postgresql: WARN
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: /app/logs/tolgee.log
    max-size: 10MB
    max-history: 30

# ===========================================
# MANAGEMENT ENDPOINTS
# ===========================================
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
      show-components: always
  info:
    env:
      enabled: true
```

### Step 5: Create Helper Scripts

#### 5.1 Start Script
Create `/infra/scripts/start-tolgee.sh`:

```bash
#!/bin/bash

# ===========================================
# TOLGEE START SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Starting Tolgee with Neon PostgreSQL...${NC}"

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}❌ .env file not found. Please create one with your Neon credentials.${NC}"
    exit 1
fi

# Load environment variables
source "$PROJECT_DIR/.env"

# Check required environment variables
required_vars=("NEON_DATABASE_URL" "NEON_DATABASE_USERNAME" "NEON_DATABASE_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Create necessary directories
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/logs"

# Start services
echo -e "${YELLOW}📦 Starting Docker services...${NC}"
cd "$PROJECT_DIR"
docker compose -f infra/tolgee-neon.docker-compose.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for Tolgee to be ready...${NC}"
timeout=300
counter=0
while ! curl -f http://localhost:8080/actuator/health >/dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Timeout waiting for Tolgee to start${NC}"
        docker compose -f infra/tolgee-neon.docker-compose.yml logs tolgee
        exit 1
    fi
    echo -e "${YELLOW}⏳ Still waiting... ($counter/$timeout)${NC}"
    sleep 5
    counter=$((counter + 5))
done

echo -e "${GREEN}✅ Tolgee is ready!${NC}"
echo -e "${BLUE}🌐 Access Tolgee at: http://localhost:8080${NC}"
echo -e "${BLUE}📊 Health check: http://localhost:8080/actuator/health${NC}"

# Show logs
echo -e "${YELLOW}📋 Showing recent logs...${NC}"
docker compose -f infra/tolgee-neon.docker-compose.yml logs --tail=20 tolgee
```

#### 5.2 Backup Script
Create `/infra/scripts/backup-tolgee.sh`:

```bash
#!/bin/bash

# ===========================================
# TOLGEE BACKUP SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}💾 Starting Tolgee backup...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

# Database backup
if [ -n "$NEON_DATABASE_URL" ]; then
    echo -e "${YELLOW}📊 Backing up database...${NC}"
    
    # Extract connection details from URL
    DB_URL=$(echo "$NEON_DATABASE_URL" | sed 's/jdbc:postgresql:\/\///')
    DB_HOST=$(echo "$DB_URL" | cut -d'/' -f1 | cut -d':' -f1)
    DB_PORT=$(echo "$DB_URL" | cut -d'/' -f1 | cut -d':' -f2)
    DB_NAME=$(echo "$DB_URL" | cut -d'/' -f2 | cut -d'?' -f1)
    
    # Create database backup
    PGPASSWORD="$NEON_DATABASE_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$NEON_DATABASE_USERNAME" \
        -d "$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        --create \
        > "$BACKUP_DIR/tolgee_db_$DATE.sql"
    
    echo -e "${GREEN}✅ Database backup created: tolgee_db_$DATE.sql${NC}"
fi

# File system backup
echo -e "${YELLOW}📁 Backing up files...${NC}"
tar -czf "$BACKUP_DIR/tolgee_files_$DATE.tar.gz" \
    -C "$PROJECT_DIR" \
    data/ \
    logs/ \
    2>/dev/null || true

echo -e "${GREEN}✅ Files backup created: tolgee_files_$DATE.tar.gz${NC}"

# Clean old backups (keep last 7 days)
echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
find "$BACKUP_DIR" -name "tolgee_*" -type f -mtime +7 -delete

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${BLUE}📁 Backup location: $BACKUP_DIR${NC}"
```

### Step 6: Create Environment Template

Create `/infra/.env.template`:

```bash
# ===========================================
# TOLGEE ENVIRONMENT CONFIGURATION TEMPLATE
# ===========================================

# Copy this file to .env and fill in your values

# ===========================================
# NEON DATABASE CONFIGURATION
# ===========================================
NEON_DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
NEON_DATABASE_USERNAME=tolgee_user
NEON_DATABASE_PASSWORD=TolgeeSecure2024!
NEON_DATABASE_HOST=ep-xxxxx.us-east-1.aws.neon.tech
NEON_DATABASE_PORT=5432

# ===========================================
# TOLGEE CONFIGURATION
# ===========================================
TOLGEE_FRONTEND_URL=http://localhost:8080
TOLGEE_BASE_URL=http://localhost:8080
JWT_SECRET=TolgeeJWTSecret2024!ChangeThisInProduction

# ===========================================
# CORS CONFIGURATION
# ===========================================
TOLGEE_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# ===========================================
# OPTIONAL: CONNECTION POOL SETTINGS
# ===========================================
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

---

**✅ Tolgee Docker Configuration Complete!**

You now have:
- ✅ Complete Docker Compose setup
- ✅ Custom Dockerfile optimized for Neon
- ✅ Application configuration files
- ✅ Helper scripts for management
- ✅ Environment template

**Next Step**: Set up environment configuration

---

## 4. Environment Configuration

### Step 1: Create Environment Files

#### 1.1 Create Local Development Environment
```bash
# Copy the template
cp infra/.env.template .env

# Edit with your actual values
nano .env
```

Fill in your `.env` file with your Neon credentials:

```bash
# ===========================================
# TOLGEE ENVIRONMENT CONFIGURATION
# ===========================================

# ===========================================
# NEON DATABASE CONFIGURATION
# ===========================================
NEON_DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
NEON_DATABASE_USERNAME=tolgee_user
NEON_DATABASE_PASSWORD=TolgeeSecure2024!
NEON_DATABASE_HOST=ep-xxxxx.us-east-1.aws.neon.tech
NEON_DATABASE_PORT=5432

# ===========================================
# TOLGEE CONFIGURATION
# ===========================================
TOLGEE_FRONTEND_URL=http://localhost:8080
TOLGEE_BASE_URL=http://localhost:8080
JWT_SECRET=TolgeeJWTSecret2024!ChangeThisInProduction

# ===========================================
# CORS CONFIGURATION
# ===========================================
TOLGEE_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# ===========================================
# CONNECTION POOL SETTINGS
# ===========================================
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

#### 1.2 Create Production Environment Template
Create `.env.production`:

```bash
# ===========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ===========================================

# ===========================================
# NEON DATABASE CONFIGURATION (PRODUCTION)
# ===========================================
NEON_DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech:5432/tolgee?sslmode=require
NEON_DATABASE_USERNAME=tolgee_user
NEON_DATABASE_PASSWORD=YourSecureProductionPassword2024!
NEON_DATABASE_HOST=ep-xxxxx.us-east-1.aws.neon.tech
NEON_DATABASE_PORT=5432

# ===========================================
# TOLGEE CONFIGURATION (PRODUCTION)
# ===========================================
TOLGEE_FRONTEND_URL=https://tolgee.yourdomain.com
TOLGEE_BASE_URL=https://tolgee.yourdomain.com
JWT_SECRET=YourVerySecureProductionJWTSecret2024!

# ===========================================
# CORS CONFIGURATION (PRODUCTION)
# ===========================================
TOLGEE_CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# ===========================================
# CONNECTION POOL SETTINGS (PRODUCTION)
# ===========================================
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=20
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=5
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1200000
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=20000
```

### Step 2: Secure Environment Files

#### 2.1 Set Proper Permissions
```bash
# Secure environment files
chmod 600 .env .env.production

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.production" >> .gitignore
echo "data/" >> .gitignore
echo "logs/" >> .gitignore
echo "backups/" >> .gitignore
```

#### 2.2 Create Environment Validation Script
Create `infra/scripts/validate-env.sh`:

```bash
#!/bin/bash

# ===========================================
# ENVIRONMENT VALIDATION SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Validating environment configuration...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Load environment variables
source .env

# Required variables
required_vars=(
    "NEON_DATABASE_URL"
    "NEON_DATABASE_USERNAME"
    "NEON_DATABASE_PASSWORD"
    "TOLGEE_FRONTEND_URL"
    "TOLGEE_BASE_URL"
    "JWT_SECRET"
)

# Check required variables
missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

# Validate database URL format
if [[ ! "$NEON_DATABASE_URL" =~ ^jdbc:postgresql:// ]]; then
    echo -e "${RED}❌ Invalid database URL format${NC}"
    exit 1
fi

# Validate JWT secret length
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT secret must be at least 32 characters long${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}🔗 Testing database connection...${NC}"
if command -v psql &> /dev/null; then
    # Extract connection details
    DB_URL=$(echo "$NEON_DATABASE_URL" | sed 's/jdbc:postgresql:\/\///')
    DB_HOST=$(echo "$DB_URL" | cut -d'/' -f1 | cut -d':' -f1)
    DB_PORT=$(echo "$DB_URL" | cut -d'/' -f1 | cut -d':' -f2)
    DB_NAME=$(echo "$DB_URL" | cut -d'/' -f2 | cut -d'?' -f1)
    
    if PGPASSWORD="$NEON_DATABASE_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$NEON_DATABASE_USERNAME" \
        -d "$DB_NAME" \
        -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not found, skipping database connection test${NC}"
fi

echo -e "${GREEN}✅ Environment validation passed${NC}"
```

### Step 3: Create Environment-Specific Configurations

#### 3.1 Development Configuration
Create `infra/config/application-dev.yml`:

```yaml
# ===========================================
# DEVELOPMENT CONFIGURATION
# ===========================================

spring:
  profiles:
    active: dev
    
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        
logging:
  level:
    root: DEBUG
    tolgee: DEBUG
    org.springframework: DEBUG
    org.hibernate: DEBUG
    
tolgee:
  cors:
    allowed-origins: "*"
```

#### 3.2 Production Configuration
Create `infra/config/application-prod.yml`:

```yaml
# ===========================================
# PRODUCTION CONFIGURATION
# ===========================================

spring:
  profiles:
    active: production
    
  jpa:
    show-sql: false
    properties:
      hibernate:
        format_sql: false
        
logging:
  level:
    root: INFO
    tolgee: INFO
    org.springframework: WARN
    org.hibernate: WARN
    
tolgee:
  cors:
    allowed-origins: "${TOLGEE_CORS_ALLOWED_ORIGINS}"
```

---

**✅ Environment Configuration Complete!**

You now have:
- ✅ Local development environment
- ✅ Production environment template
- ✅ Secure file permissions
- ✅ Environment validation script
- ✅ Profile-specific configurations

**Next Step**: Set up local development environment

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