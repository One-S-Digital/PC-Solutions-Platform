-- Create canton tables for policy crawler functionality

-- Create cantons table
CREATE TABLE IF NOT EXISTS "public"."cantons" (
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

-- Create unique constraint on canton code
CREATE UNIQUE INDEX IF NOT EXISTS "cantons_code_key" ON "public"."cantons"("code");

-- Create canton_sources table
CREATE TABLE IF NOT EXISTS "public"."canton_sources" (
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

-- Create foreign key from canton_sources to cantons
ALTER TABLE "public"."canton_sources" 
ADD CONSTRAINT "canton_sources_cantonId_fkey" 
FOREIGN KEY ("cantonId") REFERENCES "public"."cantons"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes on canton_sources
CREATE INDEX IF NOT EXISTS "canton_sources_cantonId_idx" ON "public"."canton_sources"("cantonId");
CREATE INDEX IF NOT EXISTS "canton_sources_isActive_nextCrawlAt_idx" ON "public"."canton_sources"("isActive", "nextCrawlAt");

-- Create policy_crawl_history table
CREATE TABLE IF NOT EXISTS "public"."policy_crawl_history" (
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

-- Create foreign key from policy_crawl_history to canton_sources
ALTER TABLE "public"."policy_crawl_history" 
ADD CONSTRAINT "policy_crawl_history_sourceId_fkey" 
FOREIGN KEY ("sourceId") REFERENCES "public"."canton_sources"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes on policy_crawl_history
CREATE INDEX IF NOT EXISTS "policy_crawl_history_assetId_idx" ON "public"."policy_crawl_history"("assetId");
CREATE INDEX IF NOT EXISTS "policy_crawl_history_sourceId_fetchedAt_idx" ON "public"."policy_crawl_history"("sourceId", "fetchedAt");

-- Now add the foreign key constraint to assets.crawlSourceId that was skipped earlier
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'canton_sources'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'assets_crawlSourceId_fkey'
        ) THEN
            ALTER TABLE "assets"
            ADD CONSTRAINT "assets_crawlSourceId_fkey"
            FOREIGN KEY ("crawlSourceId") REFERENCES "canton_sources"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

