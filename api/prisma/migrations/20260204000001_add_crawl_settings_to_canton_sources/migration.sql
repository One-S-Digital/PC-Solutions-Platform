-- Add configurable crawl settings to canton_sources table
-- These allow per-source tuning of crawl behavior

-- Max pages to crawl per session (default: 100)
ALTER TABLE "canton_sources" ADD COLUMN IF NOT EXISTS "maxCrawlPages" INTEGER NOT NULL DEFAULT 100;

-- Max crawl duration in seconds (default: 300 = 5 minutes)
ALTER TABLE "canton_sources" ADD COLUMN IF NOT EXISTS "maxCrawlDurationSec" INTEGER NOT NULL DEFAULT 300;

-- Delay between page fetches in milliseconds (default: 200ms)
ALTER TABLE "canton_sources" ADD COLUMN IF NOT EXISTS "crawlDelayMs" INTEGER NOT NULL DEFAULT 200;
