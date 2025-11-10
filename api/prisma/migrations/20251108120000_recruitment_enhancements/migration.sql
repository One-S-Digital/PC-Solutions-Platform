-- Ensure JobContractType enum exists and has the expected values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'JobContractType'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."JobContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CDI', 'CDD', 'INTERNSHIP');
  END IF;

  PERFORM 1 FROM pg_enum
  WHERE enumtypid = 'JobContractType'::regtype AND enumlabel = 'FULL_TIME';
  IF NOT FOUND THEN
    ALTER TYPE "public"."JobContractType" ADD VALUE 'FULL_TIME';
  END IF;

  PERFORM 1 FROM pg_enum
  WHERE enumtypid = 'JobContractType'::regtype AND enumlabel = 'PART_TIME';
  IF NOT FOUND THEN
    ALTER TYPE "public"."JobContractType" ADD VALUE 'PART_TIME';
  END IF;

  PERFORM 1 FROM pg_enum
  WHERE enumtypid = 'JobContractType'::regtype AND enumlabel = 'CDI';
  IF NOT FOUND THEN
    ALTER TYPE "public"."JobContractType" ADD VALUE 'CDI';
  END IF;

  PERFORM 1 FROM pg_enum
  WHERE enumtypid = 'JobContractType'::regtype AND enumlabel = 'CDD';
  IF NOT FOUND THEN
    ALTER TYPE "public"."JobContractType" ADD VALUE 'CDD';
  END IF;

  PERFORM 1 FROM pg_enum
  WHERE enumtypid = 'JobContractType'::regtype AND enumlabel = 'INTERNSHIP';
  IF NOT FOUND THEN
    ALTER TYPE "public"."JobContractType" ADD VALUE 'INTERNSHIP';
  END IF;
END $$ LANGUAGE plpgsql;

-- Ensure job_listings table exists
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

ALTER TABLE "public"."job_listings"
  ADD CONSTRAINT IF NOT EXISTS "job_listings_foundationId_fkey"
  FOREIGN KEY ("foundationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure new columns and defaults exist
ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "contractType" "public"."JobContractType";

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "contractType" SET DEFAULT 'FULL_TIME';

ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "salaryRange" TEXT;

ALTER TABLE IF EXISTS "public"."job_listings"
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "requirements" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "benefits" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "responsibilities" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "qualifications" SET DEFAULT ARRAY[]::TEXT[];

-- Backfill missing data
UPDATE "public"."job_listings"
SET "contractType" = 'FULL_TIME'
WHERE "contractType" IS NULL;

UPDATE "public"."job_listings"
SET "responsibilities" = ARRAY[]::TEXT[]
WHERE "responsibilities" IS NULL;

UPDATE "public"."job_listings"
SET "qualifications" = ARRAY[]::TEXT[]
WHERE "qualifications" IS NULL;

UPDATE "public"."job_listings"
SET "benefits" = ARRAY[]::TEXT[]
WHERE "benefits" IS NULL;

UPDATE "public"."job_listings"
SET "requirements" = ARRAY[]::TEXT[]
WHERE "requirements" IS NULL;

UPDATE "public"."job_listings"
SET "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP)
WHERE "status" = 'PUBLISHED';

-- Enforce NOT NULL where appropriate
ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "contractType" SET NOT NULL;

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "requirements" SET NOT NULL;

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "benefits" SET NOT NULL;

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "responsibilities" SET NOT NULL;

ALTER TABLE IF EXISTS "public"."job_listings"
  ALTER COLUMN "qualifications" SET NOT NULL;
