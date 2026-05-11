-- Add contactEmail directly to organizations table (camelCase matches schema convention)
-- Uses IF NOT EXISTS so this is safe to re-run after a failed attempt
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;

-- Migrate existing data from the separate contact-info table (only when it still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_contact_infos'
  ) THEN
    UPDATE "organizations" o
    SET "contactEmail" = oci."contactEmail"
    FROM "organization_contact_infos" oci
    WHERE oci."organization_id" = o."id"
      AND oci."contactEmail" IS NOT NULL;

    -- Drop the now-redundant contact-info table
    DROP TABLE "organization_contact_infos";
  END IF;
END $$;
