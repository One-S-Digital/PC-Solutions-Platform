-- Add Swiss canton policy crawler tables and asset metadata

-- 1) Cantons
CREATE TABLE IF NOT EXISTS "cantons" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameDe" TEXT,
  "nameIt" TEXT,
  "nameFr" TEXT,
  "defaultLang" TEXT NOT NULL DEFAULT 'de',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cantons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cantons_code_key" ON "cantons"("code");

-- 2) Canton sources
CREATE TABLE IF NOT EXISTS "canton_sources" (
  "id" SERIAL NOT NULL,
  "cantonId" INTEGER NOT NULL,

  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'landing',
  "renderType" TEXT NOT NULL DEFAULT 'static',
  "cssSelector" TEXT,

  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "crawlFrequencyDays" INTEGER NOT NULL DEFAULT 7,

  "lastCrawlAt" TIMESTAMP(3),
  "lastCrawlStatus" TEXT,
  "lastCrawlError" TEXT,
  "nextCrawlAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "canton_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "canton_sources_cantonId_idx" ON "canton_sources"("cantonId");
CREATE INDEX IF NOT EXISTS "canton_sources_isActive_nextCrawlAt_idx" ON "canton_sources"("isActive", "nextCrawlAt");

ALTER TABLE "canton_sources"
  ADD CONSTRAINT "canton_sources_cantonId_fkey"
  FOREIGN KEY ("cantonId") REFERENCES "cantons"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Policy crawl history
CREATE TABLE IF NOT EXISTS "policy_crawl_history" (
  "id" SERIAL NOT NULL,
  "assetId" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,

  "contentHash" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changeType" TEXT,
  "diffSummary" TEXT,
  "contentText" TEXT,

  CONSTRAINT "policy_crawl_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "policy_crawl_history_assetId_idx" ON "policy_crawl_history"("assetId");
CREATE INDEX IF NOT EXISTS "policy_crawl_history_sourceId_fetchedAt_idx" ON "policy_crawl_history"("sourceId", "fetchedAt");

ALTER TABLE "policy_crawl_history"
  ADD CONSTRAINT "policy_crawl_history_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "canton_sources"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) Asset crawler metadata (additive, nullable)
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "crawlSourceId" INTEGER,
  ADD COLUMN IF NOT EXISTS "officialUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "contentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "lastCrawledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "crawlStatus" TEXT;

CREATE INDEX IF NOT EXISTS "assets_crawlSourceId_idx" ON "assets"("crawlSourceId");
CREATE INDEX IF NOT EXISTS "assets_crawlStatus_idx" ON "assets"("crawlStatus");

ALTER TABLE "assets"
  ADD CONSTRAINT "assets_crawlSourceId_fkey"
  FOREIGN KEY ("crawlSourceId") REFERENCES "canton_sources"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

