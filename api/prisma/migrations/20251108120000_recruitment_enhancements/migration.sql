-- Ensure JobContractType enum exists
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
END;
$$;

-- Create or update job_listings table
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'job_listings'
  ) INTO table_exists;

  IF NOT table_exists THEN
    CREATE TABLE "public"."job_listings" (
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
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
    );

    ALTER TABLE "public"."job_listings"
      ADD CONSTRAINT "job_listings_foundationId_fkey"
      FOREIGN KEY ("foundationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'contractType'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "contractType" "public"."JobContractType" NOT NULL DEFAULT ''FULL_TIME''';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'startDate'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "startDate" TIMESTAMP(3)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'responsibilities'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'qualifications'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'salaryRange'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "salaryRange" TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'publishedAt'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ADD COLUMN "publishedAt" TIMESTAMP(3)';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'requirements'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ALTER COLUMN "requirements" SET DEFAULT ARRAY[]::TEXT[]';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_listings'
        AND column_name = 'benefits'
    ) THEN
      EXECUTE 'ALTER TABLE "public"."job_listings" ALTER COLUMN "benefits" SET DEFAULT ARRAY[]::TEXT[]';
    END IF;
  END IF;
END;
$$;

-- Backfill publishedAt for already published listings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_listings'
      AND column_name = 'publishedAt'
  ) THEN
    UPDATE "public"."job_listings"
    SET "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP)
    WHERE "status" = 'PUBLISHED';
  END IF;
END;
$$;
