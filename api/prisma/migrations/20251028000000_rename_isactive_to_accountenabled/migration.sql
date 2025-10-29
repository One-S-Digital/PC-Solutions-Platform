-- Rename isActive to accountEnabled in users table for clarity
-- This field controls whether admin has suspended the account
-- NOT for session management (Clerk JWT handles that)

-- Step 1: Add new accountEnabled column with default true
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "accountEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Copy data from isActive to accountEnabled (if isActive exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'isActive'
    ) THEN
        UPDATE "users" SET "accountEnabled" = "isActive";
    END IF;
END $$;

-- Step 3: Drop old isActive column (if it exists)
ALTER TABLE "users" 
DROP COLUMN IF EXISTS "isActive";

-- Verify the column was added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'accountEnabled'
    ) THEN
        RAISE EXCEPTION 'Failed to add accountEnabled column to users table';
    END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN "users"."accountEnabled" IS 'Admin-controlled account suspension flag. When false, user cannot authenticate (enforced in ClerkAuthGuard). NOT for session management - Clerk handles that.';
