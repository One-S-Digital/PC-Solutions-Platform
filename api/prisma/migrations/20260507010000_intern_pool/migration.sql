-- Migration: Intern Pool
-- Adds availableForInternship flag on users, new NotificationType values,
-- and the intern_pool_requests / intern_pool_applications tables.

-- 1. User availability flag
ALTER TABLE "users" ADD COLUMN "availableForInternship" BOOLEAN NOT NULL DEFAULT false;

-- 2. NotificationType enum – add intern pool values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_REQUEST_POSTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_APPLICATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_APPLICATION_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_APPLICATION_CONFIRMED';

-- 3. New enums
CREATE TYPE "InternPoolRequestStatus" AS ENUM ('OPEN', 'REVIEWING', 'FILLED', 'CANCELLED');
CREATE TYPE "InternPoolApplicationStatus" AS ENUM ('APPLIED', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'CONFIRMED');

-- 4. intern_pool_requests table
CREATE TABLE "intern_pool_requests" (
    "id"               TEXT NOT NULL,
    "foundationId"     TEXT NOT NULL,
    "postedById"       TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "startDate"        TIMESTAMP(3) NOT NULL,
    "endDate"          TIMESTAMP(3) NOT NULL,
    "role"             TEXT NOT NULL,
    "description"      TEXT,
    "location"         TEXT,
    "supervisorName"   TEXT,
    "compensationType" TEXT NOT NULL DEFAULT 'UNPAID',
    "weeklyHours"      INTEGER,
    "status"           "InternPoolRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_pool_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intern_pool_requests_foundationId_idx" ON "intern_pool_requests"("foundationId");
CREATE INDEX "intern_pool_requests_status_idx" ON "intern_pool_requests"("status");

ALTER TABLE "intern_pool_requests"
    ADD CONSTRAINT "intern_pool_requests_foundationId_fkey"
    FOREIGN KEY ("foundationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intern_pool_requests"
    ADD CONSTRAINT "intern_pool_requests_postedById_fkey"
    FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. intern_pool_applications table
CREATE TABLE "intern_pool_applications" (
    "id"               TEXT NOT NULL,
    "requestId"        TEXT NOT NULL,
    "applicantId"      TEXT NOT NULL,
    "status"           "InternPoolApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "motivationLetter" TEXT,
    "appliedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt"      TIMESTAMP(3),
    "note"             TEXT,

    CONSTRAINT "intern_pool_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "intern_pool_applications_requestId_applicantId_key"
    ON "intern_pool_applications"("requestId", "applicantId");
CREATE INDEX "intern_pool_applications_requestId_idx" ON "intern_pool_applications"("requestId");
CREATE INDEX "intern_pool_applications_applicantId_idx" ON "intern_pool_applications"("applicantId");

ALTER TABLE "intern_pool_applications"
    ADD CONSTRAINT "intern_pool_applications_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "intern_pool_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intern_pool_applications"
    ADD CONSTRAINT "intern_pool_applications_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
