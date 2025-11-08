-- CreateEnum
CREATE TYPE "public"."JobContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CDI', 'CDD', 'INTERNSHIP');

-- AlterTable
ALTER TABLE "public"."job_listings"
    ADD COLUMN     "contractType" "public"."JobContractType" NOT NULL DEFAULT 'FULL_TIME',
    ADD COLUMN     "startDate" TIMESTAMP(3),
    ADD COLUMN     "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN     "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN     "salaryRange" TEXT,
    ADD COLUMN     "publishedAt" TIMESTAMP(3);

ALTER TABLE "public"."job_listings"
    ALTER COLUMN "requirements" SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "benefits" SET DEFAULT ARRAY[]::TEXT[];

-- Backfill publishedAt for already published listings
UPDATE "public"."job_listings"
SET "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP)
WHERE "status" = 'PUBLISHED';
