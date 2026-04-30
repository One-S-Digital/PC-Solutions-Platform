DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TranslationStatus'
    ) THEN
        CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');
    END IF;
END
$$;

-- Ensure base table exists with the post-migration shape
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
    ) THEN
        CREATE TABLE "entity_translations" (
            "entityType" TEXT NOT NULL,
            "entityId" TEXT NOT NULL,
            "lang" TEXT NOT NULL,
            "field" TEXT NOT NULL,
            "text" TEXT NOT NULL,
            "origin" TEXT NOT NULL DEFAULT 'machine',
            "verified" BOOLEAN NOT NULL DEFAULT false,
            "sourceHash" TEXT NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "approvedAt" TIMESTAMP(3),
            "approvedBy" TEXT,
            "mtProvider" TEXT,
            "reviewedAt" TIMESTAMP(3),
            "reviewedBy" TEXT,
            "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
            "translatedAt" TIMESTAMP(3),
            CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("entityType","entityId","lang","field")
        );
    END IF;
END
$$;

-- AlterTable
ALTER TABLE "entity_translations" ADD COLUMN IF NOT EXISTS     "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "approvedBy" TEXT,
ADD COLUMN IF NOT EXISTS     "mtProvider" TEXT,
ADD COLUMN IF NOT EXISTS     "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "reviewedBy" TEXT,
ADD COLUMN IF NOT EXISTS     "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS     "translatedAt" TIMESTAMP(3);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
          AND column_name = 'updatedAt'
          AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE "entity_translations" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "static_translations" (
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "static_translations_pkey" PRIMARY KEY ("namespace","key","lang")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "translation_memory" (
    "id" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "mtProvider" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "translation_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "translation_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "translation_audit_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "namespace" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "key" TEXT,
    "field" TEXT,
    "lang" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mt_cost_tracking" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "characters" INTEGER NOT NULL,
    "cost" DECIMAL(10,4) NOT NULL,
    "jobCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mt_cost_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "static_translations_namespace_lang_idx" ON "static_translations"("namespace", "lang");

CREATE INDEX IF NOT EXISTS "static_translations_key_idx" ON "static_translations"("key");

CREATE INDEX IF NOT EXISTS "translation_memory_sourceLang_targetLang_idx" ON "translation_memory"("sourceLang", "targetLang");

CREATE UNIQUE INDEX IF NOT EXISTS "translation_memory_sourceTextHash_sourceLang_targetLang_key" ON "translation_memory"("sourceTextHash", "sourceLang", "targetLang");

CREATE UNIQUE INDEX IF NOT EXISTS "translation_releases_version_key" ON "translation_releases"("version");

CREATE INDEX IF NOT EXISTS "translation_releases_isActive_createdAt_idx" ON "translation_releases"("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "translation_audit_logs_type_createdAt_idx" ON "translation_audit_logs"("type", "createdAt");

CREATE INDEX IF NOT EXISTS "translation_audit_logs_userId_createdAt_idx" ON "translation_audit_logs"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "mt_cost_tracking_date_provider_idx" ON "mt_cost_tracking"("date", "provider");

CREATE UNIQUE INDEX IF NOT EXISTS "mt_cost_tracking_date_provider_sourceLang_targetLang_key" ON "mt_cost_tracking"("date", "provider", "sourceLang", "targetLang");

CREATE INDEX IF NOT EXISTS "entity_translations_entityType_lang_idx" ON "entity_translations"("entityType", "lang");

CREATE INDEX IF NOT EXISTS "entity_translations_status_updatedAt_idx" ON "entity_translations"("status", "updatedAt");
