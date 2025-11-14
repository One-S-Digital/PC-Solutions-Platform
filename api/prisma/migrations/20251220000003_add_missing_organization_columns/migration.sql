-- Comprehensive migration to add missing columns for ALL roles
-- This fixes P2022 errors for missing columns across User, Organization, and AppUser models
-- Safe to run multiple times - uses IF NOT EXISTS checks

-- =====================================================================
-- USER MODEL COLUMNS (for Educator and Parent roles)
-- =====================================================================
DO $$ 
BEGIN
    -- Add phoneNumber column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'phoneNumber'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "phoneNumber" TEXT;
        RAISE NOTICE '✅ Added phoneNumber column to users table';
    ELSE
        RAISE NOTICE '⏭️  phoneNumber column already exists in users table';
    END IF;

    -- Add workExperience column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'workExperience'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "workExperience" TEXT;
        RAISE NOTICE '✅ Added workExperience column to users table';
    ELSE
        RAISE NOTICE '⏭️  workExperience column already exists in users table';
    END IF;

    -- Add education column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'education'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "education" TEXT;
        RAISE NOTICE '✅ Added education column to users table';
    ELSE
        RAISE NOTICE '⏭️  education column already exists in users table';
    END IF;

    -- Add certifications array column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'certifications'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added certifications column to users table';
    ELSE
        RAISE NOTICE '⏭️  certifications column already exists in users table';
    END IF;

    -- Add skills array column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'skills'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added skills column to users table';
    ELSE
        RAISE NOTICE '⏭️  skills column already exists in users table';
    END IF;

    -- Add availability column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'availability'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "availability" TEXT;
        RAISE NOTICE '✅ Added availability column to users table';
    ELSE
        RAISE NOTICE '⏭️  availability column already exists in users table';
    END IF;

    -- Add cvUrl column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'cvUrl'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "cvUrl" TEXT;
        RAISE NOTICE '✅ Added cvUrl column to users table';
    ELSE
        RAISE NOTICE '⏭️  cvUrl column already exists in users table';
    END IF;

    -- Add shortBio column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'shortBio'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "shortBio" TEXT;
        RAISE NOTICE '✅ Added shortBio column to users table';
    ELSE
        RAISE NOTICE '⏭️  shortBio column already exists in users table';
    END IF;

    -- Add avatarAssetId column if missing (for educators)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'avatarAssetId'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "avatarAssetId" TEXT;
        RAISE NOTICE '✅ Added avatarAssetId column to users table';
    ELSE
        RAISE NOTICE '⏭️  avatarAssetId column already exists in users table';
    END IF;

    -- Add stripeCustomerId column if missing (already handled in previous migrations, but double-check)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'stripeCustomerId'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "stripeCustomerId" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
        RAISE NOTICE '✅ Added stripeCustomerId column to users table';
    ELSE
        RAISE NOTICE '⏭️  stripeCustomerId column already exists in users table';
    END IF;

    -- Add lastActiveAt column if missing (already handled in previous migrations, but double-check)
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

    -- Add isActive column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added isActive column to users table';
    ELSE
        RAISE NOTICE '⏭️  isActive column already exists in users table';
    END IF;

    RAISE NOTICE '✅ ✅ ✅ All User model columns verified/added ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding User columns: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================================
-- ORGANIZATION MODEL COLUMNS (for Foundation, Supplier, Service Provider roles)
-- =====================================================================
DO $$ 
BEGIN
    -- Add vatNumber column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'vatNumber'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "vatNumber" TEXT;
        RAISE NOTICE '✅ Added vatNumber column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  vatNumber column already exists in organizations table';
    END IF;

    -- Add region column if missing (in case previous migration didn't run)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'region'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "region" TEXT;
        RAISE NOTICE '✅ Added region column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  region column already exists in organizations table';
    END IF;

    -- Add contactPerson column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'contactPerson'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "contactPerson" TEXT;
        RAISE NOTICE '✅ Added contactPerson column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  contactPerson column already exists in organizations table';
    END IF;

    -- Add phoneNumber column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'phoneNumber'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "phoneNumber" TEXT;
        RAISE NOTICE '✅ Added phoneNumber column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  phoneNumber column already exists in organizations table';
    END IF;

    -- Add canton column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'canton'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "canton" TEXT;
        RAISE NOTICE '✅ Added canton column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  canton column already exists in organizations table';
    END IF;

    -- Add regionsServed array column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'regionsServed'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "regionsServed" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added regionsServed column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  regionsServed column already exists in organizations table';
    END IF;

    -- Add languages array column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'languages'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added languages column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  languages column already exists in organizations table';
    END IF;

    -- Add capacity column if missing (for foundations)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'capacity'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "capacity" INTEGER;
        RAISE NOTICE '✅ Added capacity column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  capacity column already exists in organizations table';
    END IF;

    -- Add pedagogy array column if missing (for foundations)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'pedagogy'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "pedagogy" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added pedagogy column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  pedagogy column already exists in organizations table';
    END IF;

    -- Add productCategory column if missing (for suppliers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'productCategory'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "productCategory" TEXT;
        RAISE NOTICE '✅ Added productCategory column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  productCategory column already exists in organizations table';
    END IF;

    -- Add serviceType column if missing (for suppliers and service providers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'serviceType'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "serviceType" TEXT;
        RAISE NOTICE '✅ Added serviceType column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  serviceType column already exists in organizations table';
    END IF;

    -- Add minimumOrderQuantity column if missing (for suppliers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'minimumOrderQuantity'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "minimumOrderQuantity" INTEGER;
        RAISE NOTICE '✅ Added minimumOrderQuantity column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  minimumOrderQuantity column already exists in organizations table';
    END IF;

    -- Add directOrderLink column if missing (for suppliers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'directOrderLink'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "directOrderLink" TEXT;
        RAISE NOTICE '✅ Added directOrderLink column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  directOrderLink column already exists in organizations table';
    END IF;

    -- Add catalogUrl column if missing (for suppliers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'catalogUrl'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "catalogUrl" TEXT;
        RAISE NOTICE '✅ Added catalogUrl column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  catalogUrl column already exists in organizations table';
    END IF;

    -- Add serviceCategories array column if missing (for service providers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'serviceCategories'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added serviceCategories column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  serviceCategories column already exists in organizations table';
    END IF;

    -- Add deliveryType column if missing (for service providers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'deliveryType'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "deliveryType" TEXT;
        RAISE NOTICE '✅ Added deliveryType column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  deliveryType column already exists in organizations table';
    END IF;

    -- Add bookingLink column if missing (for service providers)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'bookingLink'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "bookingLink" TEXT;
        RAISE NOTICE '✅ Added bookingLink column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  bookingLink column already exists in organizations table';
    END IF;

    -- Add isActive column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added isActive column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  isActive column already exists in organizations table';
    END IF;

    RAISE NOTICE '✅ ✅ ✅ All Organization model columns verified/added ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding Organization columns: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================================
-- APPUSER MODEL COLUMNS (used for email updates across all roles)
-- =====================================================================
DO $$ 
BEGIN
    -- Add email column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'app_users' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE "public"."app_users" ADD COLUMN "email" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "app_users_email_key" ON "public"."app_users"("email");
        RAISE NOTICE '✅ Added email column to app_users table';
    ELSE
        RAISE NOTICE '⏭️  email column already exists in app_users table';
    END IF;

    -- Add role column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'app_users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE "public"."app_users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PARENT';
        RAISE NOTICE '✅ Added role column to app_users table';
    ELSE
        RAISE NOTICE '⏭️  role column already exists in app_users table';
    END IF;

    -- Add updatedAt column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'app_users' 
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "public"."app_users" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updatedAt column to app_users table';
    ELSE
        RAISE NOTICE '⏭️  updatedAt column already exists in app_users table';
    END IF;

    RAISE NOTICE '✅ ✅ ✅ All AppUser model columns verified/added ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding AppUser columns: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================================
-- FINAL VERIFICATION
-- =====================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '✅ ✅ ✅ COMPREHENSIVE MIGRATION COMPLETE ✅ ✅ ✅';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE 'All columns for all roles have been verified/added:';
    RAISE NOTICE '  ✅ User model (Educator, Parent roles)';
    RAISE NOTICE '  ✅ Organization model (Foundation, Supplier, Service Provider roles)';
    RAISE NOTICE '  ✅ AppUser model (all roles)';
    RAISE NOTICE '=====================================================================';
END $$;
