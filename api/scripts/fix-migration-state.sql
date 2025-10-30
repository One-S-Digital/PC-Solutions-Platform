-- =====================================================================
-- MIGRATION STATE FIX SCRIPT
-- =====================================================================
-- This script manually resolves migration state issues in production
-- Run this if automated migration resolution fails
-- =====================================================================

-- STEP 1: Check current migration state
SELECT migration_name, finished_at, logs 
FROM "_prisma_migrations" 
ORDER BY finished_at DESC 
LIMIT 20;

-- =====================================================================
-- STEP 2: Remove duplicate ghost migrations
-- =====================================================================
-- These migrations appear in the database but don't exist locally
-- They are likely duplicates or from a previous deployment

-- Delete duplicate entries of 20250926_unify_asset_appuser
-- Keep only the first one (oldest)
WITH duplicates AS (
    SELECT id, migration_name, finished_at,
           ROW_NUMBER() OVER (PARTITION BY migration_name ORDER BY finished_at ASC) as rn
    FROM "_prisma_migrations"
    WHERE migration_name = '20250926_unify_asset_appuser'
)
DELETE FROM "_prisma_migrations"
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Remove migration that doesn't exist locally
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251017_add_firstname_lastname_to_appuser';

-- =====================================================================
-- STEP 3: Remove failed migration entry
-- =====================================================================
-- Remove the failed migration so it can be re-applied
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251030_comprehensive_schema_audit_fix'
AND started_at IS NOT NULL
AND finished_at IS NULL;

-- =====================================================================
-- STEP 4: Ensure critical columns exist
-- =====================================================================
-- Add storageKey to assets if missing (defensive)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'storageKey'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "storageKey" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Added storageKey column to assets table';
    ELSE
        RAISE NOTICE '⏭️  storageKey column already exists';
    END IF;
END $$;

-- Add publicUrl to assets if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'publicUrl'
    ) THEN
        ALTER TABLE "assets" ADD COLUMN "publicUrl" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Added publicUrl column to assets table';
    ELSE
        RAISE NOTICE '⏭️  publicUrl column already exists';
    END IF;
END $$;

-- Add uploadedById to assets if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'uploadedById'
    ) THEN
        -- Check if we have app_users table (new system) or just users table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_users') THEN
            ALTER TABLE "assets" ADD COLUMN "uploadedById" TEXT NOT NULL DEFAULT '';
            RAISE NOTICE '✅ Added uploadedById column to assets table';
        ELSE
            RAISE NOTICE '⚠️  app_users table does not exist yet';
        END IF;
    ELSE
        RAISE NOTICE '⏭️  uploadedById column already exists';
    END IF;
END $$;

-- =====================================================================
-- STEP 5: Verify the fixes
-- =====================================================================
SELECT 
    'Migration cleanup complete' as status,
    COUNT(*) as total_migrations,
    COUNT(CASE WHEN finished_at IS NULL THEN 1 END) as failed_migrations
FROM "_prisma_migrations";

-- Check assets table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- =====================================================================
-- INSTRUCTIONS FOR USE:
-- =====================================================================
-- 1. Connect to your production database:
--    psql $DATABASE_URL
--
-- 2. Run this entire script:
--    \i api/scripts/fix-migration-state.sql
--
-- 3. After running, try the deployment again on Render
--
-- 4. If issues persist, check logs with:
--    SELECT * FROM "_prisma_migrations" 
--    ORDER BY started_at DESC LIMIT 10;
-- =====================================================================
