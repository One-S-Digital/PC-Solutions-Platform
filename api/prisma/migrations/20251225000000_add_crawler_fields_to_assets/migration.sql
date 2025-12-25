-- Add crawler integration fields to assets table
-- These fields support the canton policy crawler functionality

-- Add crawlSourceId (FK to CantonSource, nullable)
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "crawlSourceId" INTEGER;

-- Add officialUrl (canonical URL on official site)
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "officialUrl" TEXT;

-- Add contentHash (for change detection)
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- Add lastCrawledAt (timestamp of last crawl)
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "lastCrawledAt" TIMESTAMP(3);

-- Add crawlStatus (pending_review, approved, rejected, manual)
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "crawlStatus" TEXT;

-- Add foreign key constraint for crawlSourceId (only if canton_sources table exists)
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

-- Add index on crawlStatus for filtering
CREATE INDEX IF NOT EXISTS "assets_crawlStatus_idx" ON "assets"("crawlStatus");

-- Add index on crawlSourceId for joins
CREATE INDEX IF NOT EXISTS "assets_crawlSourceId_idx" ON "assets"("crawlSourceId");

