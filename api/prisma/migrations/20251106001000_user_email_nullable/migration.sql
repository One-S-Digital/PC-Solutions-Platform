-- Allow NULL emails on users and enforce non-empty strings when present.

-- 1. Ensure empty strings are normalised to NULL before adding constraints.
UPDATE "public"."users"
SET "email" = NULL
WHERE "email" = '';

DO $$
DECLARE
  app_schema text;
  app_table text;
BEGIN
  SELECT n.nspname, c.relname
    INTO app_schema, app_table
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = to_regclass('public.AppUser');

  IF app_table IS NULL THEN
    SELECT n.nspname, c.relname
      INTO app_schema, app_table
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.oid = to_regclass('public.app_users');
  END IF;

  IF app_table IS NOT NULL THEN
    EXECUTE format('UPDATE %I.%I SET "email" = NULL WHERE "email" = '''''';', app_schema, app_table);
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

DO $$
DECLARE
  app_regclass regclass := COALESCE(to_regclass('public.AppUser'), to_regclass('public.app_users'));
  app_schema text;
  app_table text;
BEGIN
  IF app_regclass IS NOT NULL THEN
    SELECT n.nspname, c.relname
      INTO app_schema, app_table
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.oid = app_regclass;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = app_regclass
        AND conname = 'AppUser_email_not_empty'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK ("email" IS NULL OR btrim("email") <> '''')',
        app_schema,
        app_table,
        'AppUser_email_not_empty'
      );
    END IF;
  END IF;
END $$;
