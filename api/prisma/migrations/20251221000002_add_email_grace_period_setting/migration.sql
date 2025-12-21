-- Add email grace period setting for admin dashboard configuration
-- This setting controls how many days to wait before deleting old email addresses
-- after a user's email is changed (allows users to recover if needed)

-- Only insert if the setting doesn't already exist
-- NOTE: Prisma maps model `SystemSettings` -> table `public.system_settings` (see @@map).
-- Using "SystemSettings" (quoted) would look for a case-sensitive table that doesn't exist.
INSERT INTO "public"."system_settings" ("id", "key", "value", "description", "category", "isEncrypted", "isPublic", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'email.grace_period_days',
    to_jsonb(7),
    'Number of days to keep old email addresses before automatic deletion after an email change. This grace period allows users to recover access if needed.',
    'email',
    false,
    false,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."system_settings" WHERE "key" = 'email.grace_period_days'
);
