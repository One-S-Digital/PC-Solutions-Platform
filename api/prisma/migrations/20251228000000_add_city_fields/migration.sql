-- AlterTable: Add city field to organizations table
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- AlterTable: Add preferredCities array to parent_leads table
ALTER TABLE "parent_leads" ADD COLUMN IF NOT EXISTS "preferredCities" TEXT[];
