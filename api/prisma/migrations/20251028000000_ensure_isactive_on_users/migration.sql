-- Ensure isActive column exists on users table
-- This migration is idempotent and safe to run multiple times

-- Add isActive column to users table if it doesn't exist
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Verify the column was added/exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'isActive'
    ) THEN
        RAISE EXCEPTION 'Failed to add isActive column to users table';
    END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN "users"."isActive" IS 'Indicates whether the user account is active. Used for soft deletion and account suspension.';
