-- Add contact_email directly to organizations table
ALTER TABLE "organizations" ADD COLUMN "contact_email" TEXT;

-- Migrate existing data from the separate contact-info table
UPDATE "organizations" o
SET "contact_email" = oci."contact_email"
FROM "organization_contact_infos" oci
WHERE oci."organization_id" = o."id"
  AND oci."contact_email" IS NOT NULL;

-- Drop the now-redundant contact-info table
DROP TABLE "organization_contact_infos";
