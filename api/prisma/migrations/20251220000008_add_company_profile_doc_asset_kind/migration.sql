-- AlterEnum
-- Add COMPANY_PROFILE_DOC to AssetKind enum for company profile document uploads
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'COMPANY_PROFILE_DOC';
