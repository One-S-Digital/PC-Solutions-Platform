-- AlterTable: Add regionsServed array to organizations table
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "regionsServed" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing canton data to regionsServed if canton exists
-- This is idempotent - only updates rows where regionsServed is empty/null and canton has a value
UPDATE "organizations" 
SET "regionsServed" = ARRAY["canton"]::TEXT[]
WHERE "canton" IS NOT NULL 
  AND "canton" != '' 
  AND ("regionsServed" IS NULL OR array_length("regionsServed", 1) IS NULL OR array_length("regionsServed", 1) = 0);
