-- Add billing_transactions table if it doesn't exist
-- This table supports the billing service for transaction tracking
-- It was defined in the schema but may not have been deployed in all environments

CREATE TABLE IF NOT EXISTS "public"."billing_transactions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_transactions_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint if the table was just created
-- Uses DO block to handle case where constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'billing_transactions_subscriptionId_fkey'
    ) THEN
        ALTER TABLE "public"."billing_transactions" 
        ADD CONSTRAINT "billing_transactions_subscriptionId_fkey" 
        FOREIGN KEY ("subscriptionId") 
        REFERENCES "public"."subscriptions"("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "billing_transactions_subscriptionId_idx" ON "public"."billing_transactions"("subscriptionId");
CREATE INDEX IF NOT EXISTS "billing_transactions_status_idx" ON "public"."billing_transactions"("status");
CREATE INDEX IF NOT EXISTS "billing_transactions_createdAt_idx" ON "public"."billing_transactions"("createdAt");
