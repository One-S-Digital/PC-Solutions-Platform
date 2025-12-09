-- Allow NULL emails on users and enforce non-empty strings when present.

-- 1. Ensure empty strings are normalised to NULL before adding constraints.
UPDATE "public"."users"
SET "email" = NULL
WHERE "email" = '';

-- Check if AppUser table exists and has email column before updating
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'AppUser' 
    AND column_name = 'email'
  ) THEN
    UPDATE "public"."AppUser"
    SET "email" = NULL
    WHERE "email" = '';
  END IF;
END $$;

-- 2. Make users.email nullable (AppUser.email is already nullable in schema).
ALTER TABLE "public"."users"
  ALTER COLUMN "email" DROP NOT NULL;

-- 3. Add CHECK constraints to prevent empty-string emails.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_not_empty'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE "public"."users"
      ADD CONSTRAINT "users_email_not_empty"
      CHECK ("email" IS NULL OR btrim("email") <> '');
  END IF;
END $$;

-- Add constraint to AppUser if it exists and has email column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'AppUser' 
    AND column_name = 'email'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'AppUser_email_not_empty'
        AND conrelid = 'public.AppUser'::regclass
    ) THEN
      ALTER TABLE "public"."AppUser"
        ADD CONSTRAINT "AppUser_email_not_empty"
        CHECK ("email" IS NULL OR btrim("email") <> '');
    END IF;
  END IF;
END $$;
