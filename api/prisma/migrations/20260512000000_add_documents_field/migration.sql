-- Add documents JSON field to User model for multiple document uploads (up to 5)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "documents" JSONB;
