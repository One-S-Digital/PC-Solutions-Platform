-- v2 staffing remodel: Phase 2
-- Extends ApplicationStatus enum with 4 new pipeline stages.
-- Adds savedCandidateIds JSON column to organizations.
-- All changes are additive; no existing rows are touched.

-- 1. Extend ApplicationStatus enum
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SHORTLISTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'OFFER';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'HIRED';

-- 2. Add savedCandidateIds to organizations (foundation shortlist — no join table)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "savedCandidateIds" JSONB NOT NULL DEFAULT '[]';
