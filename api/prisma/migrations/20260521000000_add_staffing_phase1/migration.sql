-- Staffing Phase 1 migration
-- Enables pgvector and earthdistance extensions, then creates all Phase 1 tables.
-- Run `api/scripts/enable-pg-extensions.sql` on production first if the DB user
-- lacks SUPERUSER (the CREATE EXTENSION commands require it).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ─── New enums ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "StaffingRequestStatus" AS ENUM (
    'PENDING_PARSE', 'PARSED', 'MATCHING', 'SHORTLISTED', 'CLOSED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MatchResultStatus" AS ENUM (
    'PENDING', 'EXPLAINED', 'SHORTLISTED', 'CONTACTED', 'ACCEPTED', 'DECLINED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend existing NotificationType enum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHORTLIST_READY';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CANDIDATE_RESPONDED';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─── Additive columns on users ────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "latitude"                  DECIMAL,
  ADD COLUMN IF NOT EXISTS "longitude"                 DECIMAL,
  ADD COLUMN IF NOT EXISTS "geocodedAt"                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "maxCommuteKm"              INTEGER,
  ADD COLUMN IF NOT EXISTS "availabilitySchemaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastMatchedAt"             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "responsivenessScore"       DECIMAL NOT NULL DEFAULT 0;

-- ─── Additive columns on organizations ───────────────────────────────────────

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "latitude"    DECIMAL,
  ADD COLUMN IF NOT EXISTS "longitude"   DECIMAL,
  ADD COLUMN IF NOT EXISTS "geocodedAt"  TIMESTAMPTZ;

-- ─── Additive column on job_listings ─────────────────────────────────────────

ALTER TABLE "job_listings"
  ADD COLUMN IF NOT EXISTS "staffingRequestId" TEXT;

-- ─── Additive column on knowledge_documents ──────────────────────────────────

ALTER TABLE "knowledge_documents"
  ADD COLUMN IF NOT EXISTS "embedding" vector(768);

CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_hnsw
  ON "knowledge_documents"
  USING hnsw ("embedding" vector_cosine_ops);

-- ─── staffing_requests ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "staffing_requests" (
  "id"             TEXT NOT NULL,
  "foundationId"   TEXT NOT NULL,
  "createdById"    TEXT NOT NULL,
  "rawText"        TEXT NOT NULL,
  "roleRequired"   TEXT,
  "contractType"   "JobContractType",
  "startDate"      TIMESTAMPTZ,
  "endDate"        TIMESTAMPTZ,
  "hoursPerWeek"   INTEGER,
  "canton"         TEXT,
  "city"           TEXT,
  "ageGroups"      TEXT[] NOT NULL DEFAULT '{}',
  "languages"      TEXT[] NOT NULL DEFAULT '{}',
  "qualifications" TEXT[] NOT NULL DEFAULT '{}',
  "notes"          TEXT,
  "status"         "StaffingRequestStatus" NOT NULL DEFAULT 'PENDING_PARSE',
  "locale"         TEXT NOT NULL DEFAULT 'fr',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "staffing_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staffing_requests_foundationId_fkey"
    FOREIGN KEY ("foundationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "staffing_requests_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "staffing_requests_foundationId_idx" ON "staffing_requests"("foundationId");

ALTER TABLE "job_listings"
  ADD CONSTRAINT IF NOT EXISTS "job_listings_staffingRequestId_fkey"
    FOREIGN KEY ("staffingRequestId") REFERENCES "staffing_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── staffing_request_embeddings ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "staffing_request_embeddings" (
  "id"                TEXT NOT NULL,
  "staffingRequestId" TEXT NOT NULL,
  "model"             TEXT NOT NULL DEFAULT 'voyage-3-lite',
  "profileHash"       TEXT NOT NULL,
  "embedding"         vector(768),
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "staffing_request_embeddings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staffing_request_embeddings_staffingRequestId_key" UNIQUE ("staffingRequestId"),
  CONSTRAINT "staffing_request_embeddings_staffingRequestId_fkey"
    FOREIGN KEY ("staffingRequestId") REFERENCES "staffing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS staffing_request_embeddings_hnsw
  ON "staffing_request_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);

-- ─── match_results ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_results" (
  "id"                TEXT NOT NULL,
  "staffingRequestId" TEXT NOT NULL,
  "candidateId"       TEXT NOT NULL,
  "totalScore"        DECIMAL(5,2) NOT NULL,
  "roleScore"         DECIMAL(5,2) NOT NULL DEFAULT 0,
  "availabilityScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "locationScore"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "qualificationScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "languageScore"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "ageGroupScore"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "contractScore"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "responsivenessScr" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "distanceKm"        DECIMAL(8,2),
  "vectorSimilarity"  DECIMAL(5,4),
  "explanation"       TEXT,
  "status"            "MatchResultStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "match_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_results_staffingRequestId_candidateId_key"
    UNIQUE ("staffingRequestId", "candidateId"),
  CONSTRAINT "match_results_staffingRequestId_fkey"
    FOREIGN KEY ("staffingRequestId") REFERENCES "staffing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "match_results_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "match_results_staffingRequestId_idx"
  ON "match_results"("staffingRequestId");

-- ─── educator_embeddings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "educator_embeddings" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "model"       TEXT NOT NULL DEFAULT 'voyage-3-lite',
  "profileHash" TEXT NOT NULL,
  "embedding"   vector(768),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "educator_embeddings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "educator_embeddings_userId_key" UNIQUE ("userId"),
  CONSTRAINT "educator_embeddings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS educator_embeddings_hnsw
  ON "educator_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);
