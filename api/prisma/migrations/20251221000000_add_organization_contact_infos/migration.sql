-- Add organization_contact_infos table to store contact email separately
-- from authentication email (User.email / AppUser.email).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organization_contact_infos'
  ) THEN
    CREATE TABLE "public"."organization_contact_infos" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "contactEmail" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "organization_contact_infos_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "organization_contact_infos_organizationId_key"
      ON "public"."organization_contact_infos" ("organizationId");

    ALTER TABLE "public"."organization_contact_infos"
      ADD CONSTRAINT "organization_contact_infos_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    RAISE NOTICE '✅ Created organization_contact_infos table';
  ELSE
    RAISE NOTICE '⏭️  organization_contact_infos table already exists';
  END IF;
END $$;

