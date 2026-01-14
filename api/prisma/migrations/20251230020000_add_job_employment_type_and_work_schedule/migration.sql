-- Add JobEmploymentType enum + employmentType/workSchedule fields to job_listings
-- Safe additive migration (works on existing DBs with partial drift).

-- 1) Ensure JobEmploymentType enum exists with expected values
DO $$
DECLARE
  enum_type_oid OID;
BEGIN
  SELECT t.oid INTO enum_type_oid
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'JobEmploymentType'
    AND n.nspname = 'public';

  IF enum_type_oid IS NULL THEN
    CREATE TYPE "public"."JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'REPLACEMENT');
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum WHERE enumtypid = enum_type_oid AND enumlabel = 'FULL_TIME'
    ) THEN
      ALTER TYPE "public"."JobEmploymentType" ADD VALUE 'FULL_TIME';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum WHERE enumtypid = enum_type_oid AND enumlabel = 'PART_TIME'
    ) THEN
      ALTER TYPE "public"."JobEmploymentType" ADD VALUE 'PART_TIME';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum WHERE enumtypid = enum_type_oid AND enumlabel = 'REPLACEMENT'
    ) THEN
      ALTER TYPE "public"."JobEmploymentType" ADD VALUE 'REPLACEMENT';
    END IF;
  END IF;
END $$;

-- 2) Add columns if missing
ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "employmentType" "public"."JobEmploymentType";

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "employmentType" SET DEFAULT 'FULL_TIME';

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "workSchedule" JSONB;

-- 3) Backfill employmentType for existing rows
-- Heuristic: map contractType -> employmentType where obvious, else FULL_TIME.
UPDATE "public"."job_listings"
SET "employmentType" = CASE
  WHEN "contractType" = 'PART_TIME' THEN 'PART_TIME'::"public"."JobEmploymentType"
  WHEN "contractType" = 'REPLACEMENT' THEN 'REPLACEMENT'::"public"."JobEmploymentType"
  ELSE 'FULL_TIME'::"public"."JobEmploymentType"
END
WHERE "employmentType" IS NULL;

-- 4) Enforce NOT NULL (Prisma model expects default + not-null semantics)
ALTER TABLE "public"."job_listings"
  ALTER COLUMN "employmentType" SET NOT NULL;

