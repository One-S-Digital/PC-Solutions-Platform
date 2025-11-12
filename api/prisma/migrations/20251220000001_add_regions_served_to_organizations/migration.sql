-- AlterTable: Add regionsServed array to organizations table
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "regionsServed" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing canton data to regionsServed if canton column exists
-- This is idempotent - only updates rows where regionsServed is empty/null and canton has a value
DO $$
BEGIN
    -- Check if canton column exists before trying to migrate data
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'canton'
    ) THEN
        -- Migrate canton data to regionsServed
        UPDATE "organizations" 
        SET "regionsServed" = ARRAY["canton"]::TEXT[]
        WHERE "canton" IS NOT NULL 
          AND "canton" != '' 
          AND ("regionsServed" IS NULL OR array_length("regionsServed", 1) IS NULL OR array_length("regionsServed", 1) = 0);
        
        RAISE NOTICE '✅ Migrated canton data to regionsServed';
    ELSE
        RAISE NOTICE '⏭️  canton column does not exist, skipping data migration';
    END IF;
END $$;
