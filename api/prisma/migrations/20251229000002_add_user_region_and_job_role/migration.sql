-- Add candidate location + role fields to users table
ALTER TABLE "users" ADD COLUMN "region" TEXT;
ALTER TABLE "users" ADD COLUMN "jobRole" TEXT;

-- Optional indexes to speed up candidate pool filtering
CREATE INDEX IF NOT EXISTS "users_region_idx" ON "users" ("region");
CREATE INDEX IF NOT EXISTS "users_jobRole_idx" ON "users" ("jobRole");

