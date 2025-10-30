-- FORCE ADD MISSING COLUMNS
-- This migration forcefully adds any missing columns without checking if they exist
-- Uses ALTER TABLE IF EXISTS pattern to be safe

-- Add lastActiveAt column
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "public"."users" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
        RAISE NOTICE '✅ Added lastActiveAt column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⏭️  lastActiveAt column already exists';
    END;
END $$;

-- Add stripeCustomerId column if missing
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "public"."users" ADD COLUMN "stripeCustomerId" TEXT;
        RAISE NOTICE '✅ Added stripeCustomerId column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⏭️  stripeCustomerId column already exists';
    END;
END $$;

-- Create unique index on stripeCustomerId if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'users_stripeCustomerId_key'
    ) THEN
        CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
        RAISE NOTICE '✅ Created index on stripeCustomerId';
    ELSE
        RAISE NOTICE '⏭️  Index on stripeCustomerId already exists';
    END IF;
END $$;

-- Make firstName nullable
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "public"."users" ALTER COLUMN "firstName" DROP NOT NULL;
        RAISE NOTICE '✅ Made firstName nullable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⏭️  firstName already nullable or error: %', SQLERRM;
    END;
END $$;

-- Make lastName nullable
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "public"."users" ALTER COLUMN "lastName" DROP NOT NULL;
        RAISE NOTICE '✅ Made lastName nullable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⏭️  lastName already nullable or error: %', SQLERRM;
    END;
END $$;

-- Verify columns exist
DO $$
DECLARE
    has_lastActiveAt BOOLEAN;
    has_stripeCustomerId BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'lastActiveAt'
    ) INTO has_lastActiveAt;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripeCustomerId'
    ) INTO has_stripeCustomerId;
    
    IF has_lastActiveAt AND has_stripeCustomerId THEN
        RAISE NOTICE '✅ ✅ ✅ ALL CRITICAL COLUMNS VERIFIED ✅ ✅ ✅';
    ELSE
        IF NOT has_lastActiveAt THEN
            RAISE EXCEPTION '❌ CRITICAL: lastActiveAt column still missing!';
        END IF;
        IF NOT has_stripeCustomerId THEN
            RAISE EXCEPTION '❌ CRITICAL: stripeCustomerId column still missing!';
        END IF;
    END IF;
END $$;
