-- Add role + subscription tier scoping to pricing tiers
-- This enables foundation-only Subscription Tier management in admin.

-- 1) Columns (with safe defaults for existing rows)
ALTER TABLE "public"."pricing_tiers"
ADD COLUMN IF NOT EXISTS "role" "public"."UserRole" NOT NULL DEFAULT 'FOUNDATION';

ALTER TABLE "public"."pricing_tiers"
ADD COLUMN IF NOT EXISTS "subscription_tier" "public"."SubscriptionTier" NOT NULL DEFAULT 'BASIC';

ALTER TABLE "public"."pricing_tiers"
ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0;

-- 2) Best-effort backfill for existing data (if any)
-- If names contain tier keywords, set subscription_tier accordingly.
UPDATE "public"."pricing_tiers"
SET "subscription_tier" = 'ESSENTIAL'
WHERE LOWER("name") LIKE '%essential%';

UPDATE "public"."pricing_tiers"
SET "subscription_tier" = 'PROFESSIONAL'
WHERE LOWER("name") LIKE '%professional%';

UPDATE "public"."pricing_tiers"
SET "subscription_tier" = 'ENTERPRISE'
WHERE LOWER("name") LIKE '%enterprise%';

UPDATE "public"."pricing_tiers"
SET "subscription_tier" = 'BASIC'
WHERE LOWER("name") LIKE '%basic%';

-- 3) Indexes / constraint
CREATE INDEX IF NOT EXISTS "pricing_tiers_role_idx" ON "public"."pricing_tiers" ("role");
CREATE INDEX IF NOT EXISTS "pricing_tiers_subscription_tier_idx" ON "public"."pricing_tiers" ("subscription_tier");
CREATE INDEX IF NOT EXISTS "pricing_tiers_role_subscription_tier_idx" ON "public"."pricing_tiers" ("role", "subscription_tier");

-- Ensure uniqueness per role+tier+period (prevents duplicate config rows).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pricing_tiers_role_subscription_tier_billing_period_key'
  ) THEN
    ALTER TABLE "public"."pricing_tiers"
      ADD CONSTRAINT "pricing_tiers_role_subscription_tier_billing_period_key"
      UNIQUE ("role", "subscription_tier", "billingPeriod");
  END IF;
END $$;

-- 4) Seed default Foundation tiers if missing
-- We use billingPeriod='monthly' and express yearly discount via discounts JSON.
-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "public"."pricing_tiers" (
  "id",
  "role",
  "subscription_tier",
  "name",
  "basePrice",
  "currency",
  "billingPeriod",
  "discounts",
  "isActive",
  "display_order",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'FOUNDATION'::"public"."UserRole",
  v.subscription_tier::"public"."SubscriptionTier",
  v.name,
  v.base_price,
  'CHF',
  'monthly',
  jsonb_build_object('yearlyDiscount', 0, 'volumeDiscounts', '[]'::jsonb),
  TRUE,
  v.display_order,
  NOW(),
  NOW()
FROM (
  VALUES
    ('BASIC', 'Foundation - Basic', 0.0, 10),
    ('ESSENTIAL', 'Foundation - Essential', 0.0, 20),
    ('PROFESSIONAL', 'Foundation - Professional', 0.0, 30),
    ('ENTERPRISE', 'Foundation - Enterprise', 0.0, 40)
) AS v(subscription_tier, name, base_price, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM "public"."pricing_tiers" pt
  WHERE pt."role" = 'FOUNDATION'::"public"."UserRole"
    AND pt."subscription_tier" = v.subscription_tier::"public"."SubscriptionTier"
    AND pt."billingPeriod" = 'monthly'
);

