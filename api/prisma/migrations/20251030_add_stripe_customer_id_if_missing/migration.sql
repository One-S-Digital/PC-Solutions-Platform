-- Add stripeCustomerId column if it doesn't exist
-- This is a safety migration to ensure the column exists in production

DO $$ 
BEGIN
    -- Add stripeCustomerId to users table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'stripeCustomerId'
    ) THEN
        ALTER TABLE "public"."users" ADD COLUMN "stripeCustomerId" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
        RAISE NOTICE 'Added stripeCustomerId column to users table';
    ELSE
        RAISE NOTICE 'stripeCustomerId column already exists in users table';
    END IF;
END $$;
