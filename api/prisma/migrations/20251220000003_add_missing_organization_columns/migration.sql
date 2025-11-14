-- Add missing columns to organizations table
-- This fixes P2022 errors for missing columns like vatNumber, region, etc.
-- Safe to run multiple times - uses IF NOT EXISTS checks

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

    -- Add capacity column if missing
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

    -- Add pedagogy array column if missing
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

    -- Add productCategory column if missing
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

    -- Add serviceType column if missing
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

    -- Add minimumOrderQuantity column if missing
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

    -- Add directOrderLink column if missing
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

    -- Add catalogUrl column if missing
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

    -- Add serviceCategories array column if missing
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

    -- Add deliveryType column if missing
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

    -- Add bookingLink column if missing
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

    RAISE NOTICE '✅ ✅ ✅ All organization columns verified/added ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding organization columns: %', SQLERRM;
        RAISE;
END $$;
