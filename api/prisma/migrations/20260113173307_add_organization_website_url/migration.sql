-- Add websiteUrl to organizations (public website field)
-- Safe to run multiple times - uses IF NOT EXISTS checks

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'websiteUrl'
    ) THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "websiteUrl" TEXT;
        RAISE NOTICE '✅ Added websiteUrl column to organizations table';
    ELSE
        RAISE NOTICE '⏭️  websiteUrl column already exists in organizations table';
    END IF;
END $$;

