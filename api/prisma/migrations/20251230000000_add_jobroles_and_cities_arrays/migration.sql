-- Add missing jobRoles and cities array columns to users table
-- These were added to the Prisma schema but the migration was not created

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "jobRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cities" TEXT[] DEFAULT ARRAY[]::TEXT[];
