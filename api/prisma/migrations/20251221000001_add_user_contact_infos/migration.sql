-- Add user_contact_infos table to store contact email separately
-- from authentication email (User.email / AppUser.email).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_contact_infos'
  ) THEN
    CREATE TABLE "public"."user_contact_infos" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "contactEmail" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "user_contact_infos_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "user_contact_infos_userId_key"
      ON "public"."user_contact_infos" ("userId");

    ALTER TABLE "public"."user_contact_infos"
      ADD CONSTRAINT "user_contact_infos_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    RAISE NOTICE '✅ Created user_contact_infos table';
  ELSE
    RAISE NOTICE '⏭️  user_contact_infos table already exists';
  END IF;
END $$;

