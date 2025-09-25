-- Add accentColor column to frontend_settings
ALTER TABLE "frontend_settings"
ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#F59E0B';

