-- Add missing columns to products table
-- This fixes P2022 errors for missing columns like title, etc.
-- Safe to run multiple times - uses IF NOT EXISTS checks

DO $$ 
BEGIN
    -- Add title column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Added title column to products table';
    ELSE
        RAISE NOTICE '⏭️  title column already exists in products table';
    END IF;

    -- Add description column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "description" TEXT;
        RAISE NOTICE '✅ Added description column to products table';
    ELSE
        RAISE NOTICE '⏭️  description column already exists in products table';
    END IF;

    -- Add price column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "price" DOUBLE PRECISION;
        RAISE NOTICE '✅ Added price column to products table';
    ELSE
        RAISE NOTICE '⏭️  price column already exists in products table';
    END IF;

    -- Add category column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "category" TEXT;
        RAISE NOTICE '✅ Added category column to products table';
    ELSE
        RAISE NOTICE '⏭️  category column already exists in products table';
    END IF;

    -- Add tags array column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added tags column to products table';
    ELSE
        RAISE NOTICE '⏭️  tags column already exists in products table';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
        RAISE NOTICE '✅ Added status column to products table';
    ELSE
        RAISE NOTICE '⏭️  status column already exists in products table';
    END IF;

    -- Add isActive column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added isActive column to products table';
    ELSE
        RAISE NOTICE '⏭️  isActive column already exists in products table';
    END IF;

    -- Add supplierId column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'supplierId'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "supplierId" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Added supplierId column to products table';
    ELSE
        RAISE NOTICE '⏭️  supplierId column already exists in products table';
    END IF;

    -- Add imageAssetId column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'imageAssetId'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "imageAssetId" TEXT;
        RAISE NOTICE '✅ Added imageAssetId column to products table';
    ELSE
        RAISE NOTICE '⏭️  imageAssetId column already exists in products table';
    END IF;

    -- Add createdAt column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added createdAt column to products table';
    ELSE
        RAISE NOTICE '⏭️  createdAt column already exists in products table';
    END IF;

    -- Add updatedAt column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "public"."products" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updatedAt column to products table';
    ELSE
        RAISE NOTICE '⏭️  updatedAt column already exists in products table';
    END IF;

    RAISE NOTICE '✅ ✅ ✅ All Product model columns verified/added ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding Product columns: %', SQLERRM;
        RAISE;
END $$;
