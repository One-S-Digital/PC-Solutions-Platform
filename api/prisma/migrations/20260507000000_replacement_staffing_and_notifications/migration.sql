-- Phase 3: Replacement Staffing + Phase 4: Notifications
-- Add availableForReplacement toggle to users
ALTER TABLE "users" ADD COLUMN "availableForReplacement" BOOLEAN NOT NULL DEFAULT false;

-- Replacement request status enum
CREATE TYPE "ReplacementRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'FILLED', 'CANCELLED');

-- Replacement match status enum
CREATE TYPE "ReplacementMatchStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'CONFIRMED');

-- Replacement requests (foundation posts a need)
CREATE TABLE "replacement_requests" (
    "id" TEXT NOT NULL,
    "foundationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "ReplacementRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replacement_requests_pkey" PRIMARY KEY ("id")
);

-- Replacement matches (educator proposed for a request)
CREATE TABLE "replacement_matches" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "status" "ReplacementMatchStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "replacement_matches_pkey" PRIMARY KEY ("id")
);

-- Indexes and constraints for replacement tables
CREATE INDEX "replacement_requests_foundationId_idx" ON "replacement_requests"("foundationId");
CREATE INDEX "replacement_requests_status_idx" ON "replacement_requests"("status");
CREATE INDEX "replacement_matches_requestId_idx" ON "replacement_matches"("requestId");
CREATE INDEX "replacement_matches_educatorId_idx" ON "replacement_matches"("educatorId");
CREATE UNIQUE INDEX "replacement_matches_requestId_educatorId_key" ON "replacement_matches"("requestId", "educatorId");

-- FK constraints
ALTER TABLE "replacement_requests" ADD CONSTRAINT "replacement_requests_foundationId_fkey"
    FOREIGN KEY ("foundationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "replacement_requests" ADD CONSTRAINT "replacement_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "replacement_matches" ADD CONSTRAINT "replacement_matches_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "replacement_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replacement_matches" ADD CONSTRAINT "replacement_matches_educatorId_fkey"
    FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 4: Notification type enum
CREATE TYPE "NotificationType" AS ENUM (
    'REPLACEMENT_REQUEST_CREATED',
    'REPLACEMENT_MATCH_PROPOSED',
    'REPLACEMENT_MATCH_ACCEPTED',
    'REPLACEMENT_MATCH_DECLINED',
    'REPLACEMENT_MATCH_CONFIRMED',
    'JOB_APPLICATION_RECEIVED',
    'JOB_APPLICATION_STATUS_CHANGED',
    'LOW_REPLACEMENT_POOL',
    'GENERAL'
);

-- In-app notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
