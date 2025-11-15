-- =====================================================================
-- Add missing asset columns to organizations table
-- =====================================================================
-- This migration adds logoAssetId and coverAssetId columns that are
-- defined in the Prisma schema but missing from the production database
-- Safe to run multiple times - uses IF NOT EXISTS checks
-- =====================================================================

DO $$ 
BEGIN
    -- Add logoAssetId column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'logoAssetId'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "logoAssetId" TEXT;
        RAISE NOTICE '✅ Added logoAssetId column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  logoAssetId column already exists in organizations table';
    END IF;

    -- Add coverAssetId column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'coverAssetId'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "coverAssetId" TEXT;
        RAISE NOTICE '✅ Added coverAssetId column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  coverAssetId column already exists in organizations table';
    END IF;

    RAISE NOTICE '✅ Organization asset columns migration complete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding organization asset columns: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================================
-- Add foreign key constraints
-- =====================================================================
DO $$
BEGIN
    -- Add foreign key constraint for logoAssetId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_logoAssetId_fkey'
        AND table_name = 'organizations'
    ) THEN
        ALTER TABLE "public"."organizations" 
        ADD CONSTRAINT "organizations_logoAssetId_fkey" 
        FOREIGN KEY ("logoAssetId") REFERENCES "public"."assets"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint for logoAssetId';
    ELSE
        RAISE NOTICE '⏭️  Foreign key constraint for logoAssetId already exists';
    END IF;

    -- Add foreign key constraint for coverAssetId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_coverAssetId_fkey'
        AND table_name = 'organizations'
    ) THEN
        ALTER TABLE "public"."organizations" 
        ADD CONSTRAINT "organizations_coverAssetId_fkey" 
        FOREIGN KEY ("coverAssetId") REFERENCES "public"."assets"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint for coverAssetId';
    ELSE
        RAISE NOTICE '⏭️  Foreign key constraint for coverAssetId already exists';
    END IF;

    RAISE NOTICE '✅ Foreign key constraints added successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding foreign key constraints: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================================
-- Final verification
-- =====================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '✅ ✅ ✅ ORGANIZATION ASSET COLUMNS MIGRATION COMPLETE ✅ ✅ ✅';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE 'Columns added:';
    RAISE NOTICE '  ✅ organizations.logoAssetId';
    RAISE NOTICE '  ✅ organizations.coverAssetId';
    RAISE NOTICE '  ✅ Foreign key constraints added';
    RAISE NOTICE '=====================================================================';
END $$;
