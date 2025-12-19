-- Recreate user_notification_preferences table if it is missing in production.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'user_notification_preferences'
  ) THEN
    EXECUTE '
      CREATE TABLE "public"."user_notification_preferences" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
        "authentication" BOOLEAN NOT NULL DEFAULT true,
        "userManagement" BOOLEAN NOT NULL DEFAULT true,
        "jobRecruitment" BOOLEAN NOT NULL DEFAULT true,
        "messaging" BOOLEAN NOT NULL DEFAULT true,
        "marketplace" BOOLEAN NOT NULL DEFAULT true,
        "leadManagement" BOOLEAN NOT NULL DEFAULT true,
        "subscription" BOOLEAN NOT NULL DEFAULT true,
        "contentModeration" BOOLEAN NOT NULL DEFAULT true,
        "systemAdmin" BOOLEAN NOT NULL DEFAULT true,
        "marketing" BOOLEAN NOT NULL DEFAULT true,
        "frequency" TEXT NOT NULL DEFAULT ''immediate'',
        "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
        "quietHoursStart" TEXT,
        "quietHoursEnd" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
      );
    ';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_preferences_userId_key"
ON "public"."user_notification_preferences" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_notification_preferences_userId_fkey'
      AND conrelid = 'public.user_notification_preferences'::regclass
  ) THEN
    ALTER TABLE "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
