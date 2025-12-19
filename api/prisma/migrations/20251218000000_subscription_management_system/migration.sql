-- Subscription Management System Migration
-- Adds new subscription statuses, audit logging, scheduling, and enhanced fields

-- Add new enum values to SubscriptionStatus
-- First check if values already exist
DO $$
BEGIN
    -- Add PAUSED status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAUSED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';
    END IF;
END$$;

DO $$
BEGIN
    -- Add EXPIRED status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPIRED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';
    END IF;
END$$;

DO $$
BEGIN
    -- Add TRIAL status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRIAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL';
    END IF;
END$$;

DO $$
BEGIN
    -- Add PENDING status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
    END IF;
END$$;

DO $$
BEGIN
    -- Add GRACE_PERIOD status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GRACE_PERIOD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE_PERIOD';
    END IF;
END$$;

-- Add new columns to subscriptions table
ALTER TABLE "subscriptions" 
    ADD COLUMN IF NOT EXISTS "trial_start" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "trial_end" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "paused_until" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "is_manual" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "activated_by" TEXT,
    ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "grace_period_end" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "notes" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add new columns to subscription_plans table
ALTER TABLE "subscription_plans" 
    ADD COLUMN IF NOT EXISTS "code" TEXT,
    ADD COLUMN IF NOT EXISTS "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "stripe_product_id" TEXT;

-- Create unique index on subscription_plans code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code") WHERE "code" IS NOT NULL;

-- Create SubscriptionAction table for audit logging
CREATE TABLE IF NOT EXISTS "subscription_actions" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    
    CONSTRAINT "subscription_actions_pkey" PRIMARY KEY ("id")
);

-- Create SubscriptionSchedule table for scheduled actions
CREATE TABLE IF NOT EXISTS "subscription_schedules" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "scheduled_action" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "target_plan_id" TEXT,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "subscription_schedules_pkey" PRIMARY KEY ("id")
);

-- Create SubscriptionNote table for admin notes
CREATE TABLE IF NOT EXISTS "subscription_notes" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "subscription_notes_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "subscription_actions" 
    DROP CONSTRAINT IF EXISTS "subscription_actions_subscription_id_fkey";
ALTER TABLE "subscription_actions" 
    ADD CONSTRAINT "subscription_actions_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_schedules" 
    DROP CONSTRAINT IF EXISTS "subscription_schedules_subscription_id_fkey";
ALTER TABLE "subscription_schedules" 
    ADD CONSTRAINT "subscription_schedules_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_notes" 
    DROP CONSTRAINT IF EXISTS "subscription_notes_subscription_id_fkey";
ALTER TABLE "subscription_notes" 
    ADD CONSTRAINT "subscription_notes_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "subscription_actions_subscription_id_idx" ON "subscription_actions"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_actions_performed_at_idx" ON "subscription_actions"("performed_at");
CREATE INDEX IF NOT EXISTS "subscription_schedules_scheduled_date_is_processed_idx" ON "subscription_schedules"("scheduled_date", "is_processed");
CREATE INDEX IF NOT EXISTS "subscription_notes_subscription_id_idx" ON "subscription_notes"("subscription_id");

-- Add indexes to subscriptions table for new queries
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");
CREATE INDEX IF NOT EXISTS "subscriptions_is_manual_idx" ON "subscriptions"("is_manual");
