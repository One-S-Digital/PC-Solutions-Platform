-- Recruitment enhancements cleanup migration
-- This migration replaces the failed 20251108120000_recruitment_enhancements run.

-- 1. Ensure JobContractType enum exists with expected values
DO $$
DECLARE
  enum_type_oid OID;
BEGIN
  -- Check if enum type exists and get its OID
  SELECT t.oid INTO enum_type_oid
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'JobContractType'
    AND n.nspname = 'public';

  -- If type doesn't exist, create it with all values
  IF enum_type_oid IS NULL THEN
    CREATE TYPE "public"."JobContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CDI', 'CDD', 'INTERNSHIP');
  ELSE
    -- Type exists, check and add missing enum values
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_type_oid AND enumlabel = 'FULL_TIME'
    ) THEN
      ALTER TYPE "public"."JobContractType" ADD VALUE 'FULL_TIME';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_type_oid AND enumlabel = 'PART_TIME'
    ) THEN
      ALTER TYPE "public"."JobContractType" ADD VALUE 'PART_TIME';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_type_oid AND enumlabel = 'CDI'
    ) THEN
      ALTER TYPE "public"."JobContractType" ADD VALUE 'CDI';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_type_oid AND enumlabel = 'CDD'
    ) THEN
      ALTER TYPE "public"."JobContractType" ADD VALUE 'CDD';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = enum_type_oid AND enumlabel = 'INTERNSHIP'
    ) THEN
      ALTER TYPE "public"."JobContractType" ADD VALUE 'INTERNSHIP';
    END IF;
  END IF;
END $$;

-- 2. Ensure job_listings table exists (creates only if missing)
CREATE TABLE IF NOT EXISTS "public"."job_listings" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "location" TEXT,
  "salary" TEXT,
  "salaryRange" TEXT,
  "contractType" "public"."JobContractType" NOT NULL DEFAULT 'FULL_TIME',
  "startDate" TIMESTAMP(3),
  "status" "public"."JobStatus" NOT NULL DEFAULT 'DRAFT',
  "foundationId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint safely (PostgreSQL <16 doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'job_listings'
      AND c.conname = 'job_listings_foundationId_fkey'
  ) THEN
    ALTER TABLE public.job_listings
      ADD CONSTRAINT job_listings_foundationId_fkey
      FOREIGN KEY ("foundationId")
      REFERENCES public.organizations("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Ensure new columns and defaults are in place
ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "contractType" "public"."JobContractType";

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "contractType" SET DEFAULT 'FULL_TIME';

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "salaryRange" TEXT;

ALTER TABLE "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "requirements" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "benefits" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "responsibilities" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "qualifications" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 4. Backfill nullable fields
UPDATE "public"."job_listings"
SET "contractType" = 'FULL_TIME'
WHERE "contractType" IS NULL;

UPDATE "public"."job_listings"
SET "requirements" = ARRAY[]::TEXT[]
WHERE "requirements" IS NULL;

UPDATE "public"."job_listings"
SET "benefits" = ARRAY[]::TEXT[]
WHERE "benefits" IS NULL;

UPDATE "public"."job_listings"
SET "responsibilities" = ARRAY[]::TEXT[]
WHERE "responsibilities" IS NULL;

UPDATE "public"."job_listings"
SET "qualifications" = ARRAY[]::TEXT[]
WHERE "qualifications" IS NULL;

UPDATE "public"."job_listings"
SET "publishedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;

-- 5. Enforce NOT NULL on array columns
ALTER TABLE "public"."job_listings"
  ALTER COLUMN "requirements" SET NOT NULL;

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "benefits" SET NOT NULL;

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "responsibilities" SET NOT NULL;

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "qualifications" SET NOT NULL;

ALTER TABLE "public"."job_listings"
  ALTER COLUMN "contractType" SET NOT NULL;
