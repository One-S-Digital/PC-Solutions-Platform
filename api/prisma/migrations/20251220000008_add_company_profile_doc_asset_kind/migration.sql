-- AlterEnum
-- Add COMPANY_PROFILE_DOC to AssetKind enum for company profile document uploads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'AssetKind'
          AND e.enumlabel = 'COMPANY_PROFILE_DOC'
    ) THEN
        ALTER TYPE "AssetKind" ADD VALUE 'COMPANY_PROFILE_DOC';
    END IF;
END
$$;
