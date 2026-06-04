-- Add cvUrl and cvAssetId columns that are referenced in the Prisma schema
-- but were missing from the initial job_applications table definition.
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "cvUrl" TEXT;
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "cvAssetId" TEXT;
