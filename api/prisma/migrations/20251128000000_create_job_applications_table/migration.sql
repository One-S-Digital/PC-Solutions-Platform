-- CreateTable (if not exists) for job_applications
-- This migration addresses the missing job_applications table in production

-- Create the job_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."job_applications" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "cvUrl" TEXT,
    "cvAssetId" TEXT,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_applications_jobListingId_candidateId_key'
    ) THEN
        CREATE UNIQUE INDEX "job_applications_jobListingId_candidateId_key" ON "public"."job_applications"("jobListingId", "candidateId");
    END IF;
END $$;

-- AddForeignKey for jobListingId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_applications_jobListingId_fkey'
    ) THEN
        ALTER TABLE "public"."job_applications" 
        ADD CONSTRAINT "job_applications_jobListingId_fkey" 
        FOREIGN KEY ("jobListingId") REFERENCES "public"."job_listings"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey for candidateId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_applications_candidateId_fkey'
    ) THEN
        ALTER TABLE "public"."job_applications" 
        ADD CONSTRAINT "job_applications_candidateId_fkey" 
        FOREIGN KEY ("candidateId") REFERENCES "public"."users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
