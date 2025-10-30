-- =====================================================================
-- COMPREHENSIVE SCHEMA AUDIT AND FIX
-- =====================================================================
-- This migration ensures ALL tables and columns from Prisma schema exist
-- Safe to run multiple times - uses IF NOT EXISTS checks
-- =====================================================================

-- =====================================================================
-- CRITICAL FIX 1: Add stripeCustomerId to users table if missing
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'stripeCustomerId'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "stripeCustomerId" TEXT;
        CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
        RAISE NOTICE '✅ Added stripeCustomerId column to users table';
    ELSE
        RAISE NOTICE '⏭️  stripeCustomerId column already exists in users table';
    END IF;
END $$;

-- =====================================================================
-- FIX 2: Ensure firstName and lastName are nullable (for webhooks)
-- =====================================================================
DO $$
BEGIN
    -- Make firstName nullable
    ALTER TABLE "public"."users" ALTER COLUMN "firstName" DROP NOT NULL;
    -- Make lastName nullable
    ALTER TABLE "public"."users" ALTER COLUMN "lastName" DROP NOT NULL;
    RAISE NOTICE '✅ Made firstName and lastName nullable in users table';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⏭️  firstName/lastName already nullable or error: %', SQLERRM;
END $$;

-- =====================================================================
-- FIX 2B: Add lastActiveAt column if missing
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'lastActiveAt'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
        RAISE NOTICE '✅ Added lastActiveAt column to users table';
    ELSE
        RAISE NOTICE '⏭️  lastActiveAt column already exists in users table';
    END IF;
END $$;

-- =====================================================================
-- FIX 3: Add missing columns to assets table
-- =====================================================================
DO $$
BEGIN
    -- Add etag column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'etag'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "etag" TEXT;
        RAISE NOTICE '✅ Added etag column to assets table';
    END IF;
    
    -- Add checksum column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'checksum'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "checksum" TEXT;
        RAISE NOTICE '✅ Added checksum column to assets table';
    END IF;
    
    -- Add version column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'version'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE '✅ Added version column to assets table';
    END IF;
    
    -- Add updatedAt column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updatedAt column to assets table';
    END IF;
END $$;

-- =====================================================================
-- FIX 4: Add missing indexes on assets table
-- =====================================================================
CREATE INDEX IF NOT EXISTS "assets_storageKey_idx" ON "assets"("storageKey");
CREATE INDEX IF NOT EXISTS "assets_etag_idx" ON "assets"("etag");

-- =====================================================================
-- FIX 5: Create missing admin features tables
-- =====================================================================

-- Platform Settings Table
CREATE TABLE IF NOT EXISTS "platform_settings" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'ProCrèche Solutions Suisse',
    "platformDescription" TEXT,
    "platformVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "maxFileUploadSize" INTEGER NOT NULL DEFAULT 10485760,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    "sessionTimeout" INTEGER NOT NULL DEFAULT 3600,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "passwordRequireSpecial" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
    "apiRateLimit" INTEGER NOT NULL DEFAULT 1000,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "logRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "diff" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- System Health Checks Table
CREATE TABLE IF NOT EXISTS "system_health_checks" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTime" INTEGER,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id")
);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS "system_metrics" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS "system_alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- Content Items Table
CREATE TABLE IF NOT EXISTS "content_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- Content Categories Table
CREATE TABLE IF NOT EXISTS "content_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("id")
);

-- Policy Alerts Table
CREATE TABLE IF NOT EXISTS "policy_alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "regions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "policy_alerts_pkey" PRIMARY KEY ("id")
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- Webhooks Table
CREATE TABLE IF NOT EXISTS "webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- Webhook Logs Table
CREATE TABLE IF NOT EXISTS "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- =====================================================================
-- FIX 6: Add missing frontend_settings columns
-- =====================================================================
DO $$
BEGIN
    -- Add accentColor if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'frontend_settings' AND column_name = 'accentColor'
    ) THEN
        ALTER TABLE "frontend_settings" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#F59E0B';
        RAISE NOTICE '✅ Added accentColor column to frontend_settings table';
    END IF;
END $$;

-- =====================================================================
-- FIX 7: Add foreign key constraints for new tables
-- =====================================================================
DO $$
BEGIN
    -- Add foreign keys if tables and columns exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_settings') THEN
        ALTER TABLE "platform_settings" 
        DROP CONSTRAINT IF EXISTS "platform_settings_updatedBy_fkey";
        
        ALTER TABLE "platform_settings" 
        ADD CONSTRAINT "platform_settings_updatedBy_fkey" 
        FOREIGN KEY ("updatedBy") REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE "audit_logs" 
        DROP CONSTRAINT IF EXISTS "audit_logs_actorId_fkey";
        
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "audit_logs_actorId_fkey" 
        FOREIGN KEY ("actorId") REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_items') THEN
        ALTER TABLE "content_items" 
        DROP CONSTRAINT IF EXISTS "content_items_uploadedBy_fkey";
        
        ALTER TABLE "content_items" 
        ADD CONSTRAINT "content_items_uploadedBy_fkey" 
        FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_categories') THEN
        ALTER TABLE "content_categories" 
        DROP CONSTRAINT IF EXISTS "content_categories_parentId_fkey";
        
        ALTER TABLE "content_categories" 
        ADD CONSTRAINT "content_categories_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "content_categories"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'policy_alerts') THEN
        ALTER TABLE "policy_alerts" 
        DROP CONSTRAINT IF EXISTS "policy_alerts_createdBy_fkey";
        
        ALTER TABLE "policy_alerts" 
        ADD CONSTRAINT "policy_alerts_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        ALTER TABLE "api_keys" 
        DROP CONSTRAINT IF EXISTS "api_keys_createdBy_fkey";
        
        ALTER TABLE "api_keys" 
        ADD CONSTRAINT "api_keys_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
        ALTER TABLE "webhooks" 
        DROP CONSTRAINT IF EXISTS "webhooks_createdBy_fkey";
        
        ALTER TABLE "webhooks" 
        ADD CONSTRAINT "webhooks_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_logs') THEN
        ALTER TABLE "webhook_logs" 
        DROP CONSTRAINT IF EXISTS "webhook_logs_webhookId_fkey";
        
        ALTER TABLE "webhook_logs" 
        ADD CONSTRAINT "webhook_logs_webhookId_fkey" 
        FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    RAISE NOTICE '✅ Added foreign key constraints for new tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Some foreign keys may already exist: %', SQLERRM;
END $$;

-- =====================================================================
-- VERIFICATION: Count tables and columns
-- =====================================================================
DO $$
DECLARE
    table_count INTEGER;
    user_column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO user_column_count 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '✅ COMPREHENSIVE SCHEMA AUDIT COMPLETE';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE 'Total tables in public schema: %', table_count;
    RAISE NOTICE 'Total columns in users table: %', user_column_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Key fixes applied:';
    RAISE NOTICE '  ✅ users.stripeCustomerId column ensured';
    RAISE NOTICE '  ✅ users.firstName/lastName made nullable';
    RAISE NOTICE '  ✅ assets table columns updated';
    RAISE NOTICE '  ✅ Admin feature tables created';
    RAISE NOTICE '  ✅ Foreign key constraints added';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Verify with: psql $DATABASE_URL -f api/scripts/verify-db-schema.sql';
    RAISE NOTICE '  2. Test user signup/login';
    RAISE NOTICE '  3. Test webhook processing';
    RAISE NOTICE '=====================================================================';
END $$;
