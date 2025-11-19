-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');

-- AlterTable
ALTER TABLE "entity_translations" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "mtProvider" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "translatedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "static_translations" (
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
CREATE TABLE "translation_memory" (
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
CREATE TABLE "translation_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "translation_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_audit_logs" (
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
CREATE TABLE "mt_cost_tracking" (
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
CREATE INDEX "static_translations_namespace_lang_idx" ON "static_translations"("namespace", "lang");

-- CreateIndex
CREATE INDEX "static_translations_key_idx" ON "static_translations"("key");

-- CreateIndex
CREATE INDEX "translation_memory_sourceLang_targetLang_idx" ON "translation_memory"("sourceLang", "targetLang");

-- CreateIndex
CREATE UNIQUE INDEX "translation_memory_sourceTextHash_sourceLang_targetLang_key" ON "translation_memory"("sourceTextHash", "sourceLang", "targetLang");

-- CreateIndex
CREATE UNIQUE INDEX "translation_releases_version_key" ON "translation_releases"("version");

-- CreateIndex
CREATE INDEX "translation_releases_isActive_createdAt_idx" ON "translation_releases"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "translation_audit_logs_type_createdAt_idx" ON "translation_audit_logs"("type", "createdAt");

-- CreateIndex
CREATE INDEX "translation_audit_logs_userId_createdAt_idx" ON "translation_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "mt_cost_tracking_date_provider_idx" ON "mt_cost_tracking"("date", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "mt_cost_tracking_date_provider_sourceLang_targetLang_key" ON "mt_cost_tracking"("date", "provider", "sourceLang", "targetLang");

-- CreateIndex
CREATE INDEX "entity_translations_entityType_lang_idx" ON "entity_translations"("entityType", "lang");

-- CreateIndex
CREATE INDEX "entity_translations_status_updatedAt_idx" ON "entity_translations"("status", "updatedAt");
