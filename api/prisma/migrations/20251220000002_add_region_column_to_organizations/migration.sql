-- Add region column to organizations table if missing
-- This fixes the P2022 error: "The column `region` does not exist in the current database"
DO $$ 
BEGIN
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Error adding region column: %', SQLERRM;
END $$;
