-- AI Foundation (Phase 0): new tables for audit logging, caching, agent config,
-- knowledge documents, and candidate consent.
-- All statements are idempotent (IF NOT EXISTS / exception guards).

CREATE TABLE IF NOT EXISTS "candidate_consents" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "version"   INTEGER      NOT NULL DEFAULT 1,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isActive"  BOOLEAN      NOT NULL DEFAULT true,

    CONSTRAINT "candidate_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_agent_runs" (
    "id"             TEXT         NOT NULL,
    "orchestration"  TEXT         NOT NULL,
    "principalId"    TEXT,
    "organizationId" TEXT,
    "entityRef"      TEXT,
    "status"         TEXT         NOT NULL DEFAULT 'running',
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"    TIMESTAMP(3),

    CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
    "id"              TEXT           NOT NULL,
    "agentName"       TEXT           NOT NULL,
    "promptVersion"   TEXT           NOT NULL,
    "model"           TEXT           NOT NULL,
    "fallbackUsed"    BOOLEAN        NOT NULL DEFAULT false,
    "inputHash"       TEXT           NOT NULL,
    "outputHash"      TEXT,
    "tokenUsage"      JSONB          NOT NULL,
    "costUsd"         DECIMAL(10, 8) NOT NULL DEFAULT 0,
    "latencyMs"       INTEGER        NOT NULL,
    "cacheHit"        BOOLEAN        NOT NULL DEFAULT false,
    "principalId"     TEXT,
    "organizationId"  TEXT,
    "entityRef"       TEXT,
    "retrievedDocIds" TEXT[]         NOT NULL DEFAULT ARRAY[]::TEXT[],
    "agentRunId"      TEXT,
    "createdAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_agent_configs" (
    "id"            TEXT         NOT NULL,
    "agentName"     TEXT         NOT NULL,
    "promptVersion" TEXT         NOT NULL,
    "environment"   TEXT         NOT NULL DEFAULT 'production',
    "foundationId"  TEXT,
    "isActive"      BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_result_cache" (
    "id"        TEXT         NOT NULL,
    "cacheKey"  TEXT         NOT NULL,
    "agentName" TEXT         NOT NULL,
    "payload"   JSONB        NOT NULL,
    "modelUsed" TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_result_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id"          TEXT         NOT NULL,
    "source"      TEXT         NOT NULL,
    "cantonScope" TEXT,
    "locale"      TEXT         NOT NULL DEFAULT 'fr',
    "audience"    TEXT,
    "version"     INTEGER      NOT NULL DEFAULT 1,
    "title"       TEXT         NOT NULL,
    "content"     TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "ai_agent_configs_agentName_environment_foundationId_key"
    ON "ai_agent_configs"("agentName", "environment", "foundationId");

CREATE UNIQUE INDEX IF NOT EXISTS "ai_result_cache_cacheKey_key"
    ON "ai_result_cache"("cacheKey");

-- Indexes
CREATE INDEX IF NOT EXISTS "candidate_consents_userId_isActive_idx"   ON "candidate_consents"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "ai_agent_runs_principalId_startedAt_idx"  ON "ai_agent_runs"("principalId", "startedAt");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_agentName_createdAt_idx"    ON "ai_audit_logs"("agentName", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_principalId_createdAt_idx"  ON "ai_audit_logs"("principalId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_agentRunId_idx"             ON "ai_audit_logs"("agentRunId");
CREATE INDEX IF NOT EXISTS "ai_result_cache_agentName_idx"            ON "ai_result_cache"("agentName");
CREATE INDEX IF NOT EXISTS "ai_result_cache_expiresAt_idx"            ON "ai_result_cache"("expiresAt");
CREATE INDEX IF NOT EXISTS "knowledge_documents_source_locale_idx"    ON "knowledge_documents"("source", "locale");

-- Foreign keys (guarded against duplicate constraint errors)
DO $$ BEGIN
  ALTER TABLE "candidate_consents"
    ADD CONSTRAINT "candidate_consents_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ai_audit_logs"
    ADD CONSTRAINT "ai_audit_logs_agentRunId_fkey"
    FOREIGN KEY ("agentRunId") REFERENCES "ai_agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
