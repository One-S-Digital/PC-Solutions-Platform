-- Fix subscription_plans column names to match Prisma schema @map directives
-- The initial migration created camelCase columns, but the schema expects snake_case

-- Rename billingPeriod to billing_period
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'billingPeriod') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "billingPeriod" TO "billing_period";
    END IF;
END$$;

-- Rename isActive to is_active
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'isActive') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "isActive" TO "is_active";
    END IF;
END$$;

-- Rename isPopular to is_popular
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'isPopular') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "isPopular" TO "is_popular";
    END IF;
END$$;

-- Rename stripePriceId to stripe_price_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'stripePriceId') THEN
        ALTER TABLE "subscription_plans" RENAME COLUMN "stripePriceId" TO "stripe_price_id";
    END IF;
END$$;

-- Note: code, allowed_roles, trial_days, display_order, stripe_product_id were already added
-- with correct snake_case names in the 20251218000000_subscription_management_system migration
