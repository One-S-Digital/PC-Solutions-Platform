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

-- Clean up orphaned asset references before adding column (no FKs added here)
UPDATE "public"."frontend_settings" fs
SET "logoAssetId" = NULL
WHERE "logoAssetId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "public"."assets" a WHERE a."id" = fs."logoAssetId"
);
UPDATE "public"."frontend_settings" fs
SET "faviconAssetId" = NULL
WHERE "faviconAssetId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "public"."assets" a WHERE a."id" = fs."faviconAssetId"
);
UPDATE "public"."frontend_settings" fs
SET "ogImageAssetId" = NULL
WHERE "ogImageAssetId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "public"."assets" a WHERE a."id" = fs."ogImageAssetId"
);
UPDATE "public"."frontend_settings" fs
SET "adminLogoAssetId" = NULL
WHERE "adminLogoAssetId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "public"."assets" a WHERE a."id" = fs."adminLogoAssetId"
);
UPDATE "public"."frontend_settings" fs
SET "adminFaviconAssetId" = NULL
WHERE "adminFaviconAssetId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "public"."assets" a WHERE a."id" = fs."adminFaviconAssetId"
);

-- Add accentColor column (idempotent)
ALTER TABLE "public"."frontend_settings"
  ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#F59E0B';

