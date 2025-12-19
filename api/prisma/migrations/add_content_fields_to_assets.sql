-- Migration: Add dedicated content management fields to Asset model
-- This migration adds typed columns to replace JSON metadata storage

-- Add content-specific columns to assets table
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "content_type" VARCHAR(50);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "access_roles" TEXT[];
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "content_preview" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';

-- E-Learning specific fields
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "duration" VARCHAR(100);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "lessons" INTEGER;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "video_source_type" VARCHAR(20); -- 'upload' or 'url'

-- HR Document specific fields
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(20);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "version_number" VARCHAR(20);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "effective_date" TIMESTAMP;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "review_date" TIMESTAMP;

-- State Policy specific fields
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "country" VARCHAR(50);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "region" VARCHAR(100);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "policy_type" VARCHAR(50);
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "is_critical" BOOLEAN DEFAULT FALSE;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "expiration_date" TIMESTAMP;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "external_link" VARCHAR(500);

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS "idx_assets_content_type" ON "assets"("content_type");
CREATE INDEX IF NOT EXISTS "idx_assets_language" ON "assets"("language");
CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets"("status");
CREATE INDEX IF NOT EXISTS "idx_assets_country" ON "assets"("country");
CREATE INDEX IF NOT EXISTS "idx_assets_region" ON "assets"("region");
CREATE INDEX IF NOT EXISTS "idx_assets_is_critical" ON "assets"("is_critical");

-- Create index for full-text search on title and description
CREATE INDEX IF NOT EXISTS "idx_assets_title_search" ON "assets" USING gin(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS "idx_assets_description_search" ON "assets" USING gin(to_tsvector('english', COALESCE(description, '')));

-- Migrate existing metadata to new columns (if any existing data exists)
-- This is a best-effort migration for content that used JSON metadata
UPDATE "assets" 
SET 
  content_type = metadata->>'contentType',
  language = metadata->>'language',
  status = metadata->>'status',
  duration = metadata->>'duration',
  lessons = CAST(metadata->>'lessons' AS INTEGER),
  access_roles = CASE 
    WHEN metadata->>'accessRoles' IS NOT NULL 
    THEN ARRAY(SELECT json_array_elements_text((metadata->'accessRoles')::json))
    ELSE NULL
  END,
  tags = CASE 
    WHEN metadata->>'tags' IS NOT NULL 
    THEN ARRAY(SELECT json_array_elements_text((metadata->'tags')::json))
    ELSE '{}'
  END
WHERE metadata IS NOT NULL 
  AND category IN ('ELEARNING', 'HR_DOCUMENT', 'STATE_POLICY');

-- Add comment to document the migration
COMMENT ON COLUMN "assets"."content_type" IS 'Type of e-learning content: COURSE, VIDEO, PDF, LINK';
COMMENT ON COLUMN "assets"."language" IS 'Content language: EN, FR, DE';
COMMENT ON COLUMN "assets"."status" IS 'Content status: Draft, Published, Archived, etc.';
COMMENT ON COLUMN "assets"."access_roles" IS 'Array of UserRole enums that can access this content';
COMMENT ON COLUMN "assets"."is_critical" IS 'Flag for critical state policies';

