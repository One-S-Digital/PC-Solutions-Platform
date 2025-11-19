-- Allow NULL emails on users and enforce non-empty strings when present.

-- 1. Ensure empty strings are normalised to NULL before adding constraints.
UPDATE "public"."users"
SET "email" = NULL
WHERE "email" = '';

UPDATE "public"."app_users"
SET "email" = NULL
WHERE "email" = '';

-- 2. Make users.email nullable (app_users.email is already nullable in schema).
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_users_email_not_empty'
      AND conrelid = 'public.app_users'::regclass
  ) THEN
    ALTER TABLE "public"."app_users"
      ADD CONSTRAINT "app_users_email_not_empty"
      CHECK ("email" IS NULL OR btrim("email") <> '');
  END IF;
END $$;
