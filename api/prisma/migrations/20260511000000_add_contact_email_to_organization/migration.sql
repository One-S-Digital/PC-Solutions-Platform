-- Add contactEmail directly to organizations table (camelCase matches schema convention)
ALTER TABLE "organizations" ADD COLUMN "contactEmail" TEXT;

-- Migrate existing data from the separate contact-info table
UPDATE "organizations" o
SET "contactEmail" = oci."contactEmail"
FROM "organization_contact_infos" oci
WHERE oci."organization_id" = o."id"
  AND oci."contactEmail" IS NOT NULL;

-- Drop the now-redundant contact-info table
DROP TABLE "organization_contact_infos";
