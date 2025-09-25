-- Ensure frontend_settings table exists (create if missing)
CREATE TABLE IF NOT EXISTS "public"."frontend_settings" (
  "id" TEXT NOT NULL,
  "siteName" TEXT NOT NULL DEFAULT 'Pro Crèche Solutions',
  "siteDescription" TEXT DEFAULT 'Leading childcare solutions platform in Switzerland',
  "siteKeywords" TEXT DEFAULT 'childcare, daycare, switzerland, education',
  "logoAssetId" TEXT,
  "faviconAssetId" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
  "secondaryColor" TEXT NOT NULL DEFAULT '#1E40AF',
  "adminLogoAssetId" TEXT,
  "adminFaviconAssetId" TEXT,
  "adminPrimaryColor" TEXT NOT NULL DEFAULT '#1F2937',
  "adminSecondaryColor" TEXT NOT NULL DEFAULT '#374151',
  "adminAccentColor" TEXT NOT NULL DEFAULT '#3B82F6',
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "contactAddress" TEXT,
  "facebookUrl" TEXT,
  "twitterUrl" TEXT,
  "linkedinUrl" TEXT,
  "instagramUrl" TEXT,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "ogImageAssetId" TEXT,
  "googleAnalyticsId" TEXT,
  "googleTagManagerId" TEXT,
  "privacyPolicyUrl" TEXT,
  "termsOfServiceUrl" TEXT,
  "cookiePolicyUrl" TEXT,
  "enableDarkMode" BOOLEAN NOT NULL DEFAULT true,
  "defaultTheme" TEXT NOT NULL DEFAULT 'light',
  "mainAppCustomization" JSONB,
  "adminCustomization" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "frontend_settings_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'frontend_settings_logoAssetId_fkey'
      AND table_name = 'frontend_settings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."frontend_settings"
      ADD CONSTRAINT "frontend_settings_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'frontend_settings_faviconAssetId_fkey'
      AND table_name = 'frontend_settings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."frontend_settings"
      ADD CONSTRAINT "frontend_settings_faviconAssetId_fkey" FOREIGN KEY ("faviconAssetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'frontend_settings_ogImageAssetId_fkey'
      AND table_name = 'frontend_settings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."frontend_settings"
      ADD CONSTRAINT "frontend_settings_ogImageAssetId_fkey" FOREIGN KEY ("ogImageAssetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'frontend_settings_adminLogoAssetId_fkey'
      AND table_name = 'frontend_settings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."frontend_settings"
      ADD CONSTRAINT "frontend_settings_adminLogoAssetId_fkey" FOREIGN KEY ("adminLogoAssetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'frontend_settings_adminFaviconAssetId_fkey'
      AND table_name = 'frontend_settings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."frontend_settings"
      ADD CONSTRAINT "frontend_settings_adminFaviconAssetId_fkey" FOREIGN KEY ("adminFaviconAssetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add accentColor column (idempotent)
ALTER TABLE "public"."frontend_settings"
  ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#F59E0B';

