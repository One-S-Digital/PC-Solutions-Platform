-- Add maxSubpageDepth field to canton_sources table
-- This allows crawlers to recursively follow links to subpages
-- 0 = only source page (default, current behavior)
-- 1 = source + direct subpages
-- 2+ = deeper recursion levels

ALTER TABLE "canton_sources" ADD COLUMN IF NOT EXISTS "maxSubpageDepth" INTEGER NOT NULL DEFAULT 0;
