-- Create service_providers and services tables if they don't exist
-- This fixes P2021 errors for missing service_providers table
-- Safe to run multiple times - uses IF NOT EXISTS checks

DO $$ 
BEGIN
    -- Check if ServiceCategory enum exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceCategory') THEN
        CREATE TYPE "public"."ServiceCategory" AS ENUM (
            'EDUCATION',
            'CARE',
            'SUPPORT',
            'CONSULTING',
            'OTHER'
        );
        RAISE NOTICE '✅ Created ServiceCategory enum';
    ELSE
        RAISE NOTICE '⏭️  ServiceCategory enum already exists';
    END IF;

    -- Create services table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
    ) THEN
        CREATE TABLE "public"."services" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "category" "public"."ServiceCategory" NOT NULL,
            "price" DOUBLE PRECISION,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "providerId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "services_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE '✅ Created services table';
    ELSE
        RAISE NOTICE '⏭️  services table already exists';
    END IF;

    -- Create service_providers table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'service_providers'
    ) THEN
        CREATE TABLE "public"."service_providers" (
            "id" TEXT NOT NULL,
            "organizationId" TEXT NOT NULL,
            "deliveryType" TEXT,
            "bookingLink" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "service_providers_organizationId_key" UNIQUE ("organizationId")
        );
        RAISE NOTICE '✅ Created service_providers table';
    ELSE
        RAISE NOTICE '⏭️  service_providers table already exists';
    END IF;

    -- Add foreign key constraint from service_providers to organizations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'service_providers_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."service_providers" 
        ADD CONSTRAINT "service_providers_organizationId_fkey" 
        FOREIGN KEY ("organizationId") 
        REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint from service_providers to organizations';
    ELSE
        RAISE NOTICE '⏭️  Foreign key constraint service_providers_organizationId_fkey already exists';
    END IF;

    -- Add foreign key constraint from services to service_providers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'services_providerId_fkey'
    ) THEN
        ALTER TABLE "public"."services" 
        ADD CONSTRAINT "services_providerId_fkey" 
        FOREIGN KEY ("providerId") 
        REFERENCES "public"."service_providers"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint from services to service_providers';
    ELSE
        RAISE NOTICE '⏭️  Foreign key constraint services_providerId_fkey already exists';
    END IF;

    RAISE NOTICE '✅ ✅ ✅ Service providers and services tables verified/created ✅ ✅ ✅';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error creating service_providers/services tables: %', SQLERRM;
        RAISE;
END $$;
