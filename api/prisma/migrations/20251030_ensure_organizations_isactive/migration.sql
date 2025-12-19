-- Ensure organizations table has isActive column
-- This is a defensive migration to handle edge cases where the column might be missing

DO $$
BEGIN
    -- Check if isActive column exists in organizations table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'organizations' 
        AND column_name = 'isActive'
    ) THEN
        -- Add the column with a default value
        ALTER TABLE "organizations" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added isActive column to organizations table';
    ELSE
        RAISE NOTICE 'isActive column already exists in organizations table';
    END IF;
END $$;
