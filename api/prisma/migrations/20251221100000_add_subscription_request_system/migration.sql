-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'INVOICE_SENT', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'ACTIVATED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "planId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "contact_name" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "preferred_contact" TEXT DEFAULT 'email',
    "message" TEXT,
    "notes" TEXT,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "invoice_number" TEXT,
    "invoice_sent_at" TIMESTAMP(3),
    "invoice_amount" DOUBLE PRECISION,
    "invoice_currency" TEXT DEFAULT 'CHF',
    "payment_received_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "declined_at" TIMESTAMP(3),
    "declined_by" TEXT,
    "decline_reason" TEXT,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL,
    "notification_email" TEXT,
    "enable_email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "default_trial_days" INTEGER NOT NULL DEFAULT 14,
    "default_grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoice_next_number" INTEGER NOT NULL DEFAULT 1001,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "estimated_response_hours" INTEGER NOT NULL DEFAULT 48,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_requests_subscription_id_key" ON "subscription_requests"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_requests_status_idx" ON "subscription_requests"("status");

-- CreateIndex
CREATE INDEX "subscription_requests_created_at_idx" ON "subscription_requests"("created_at");

-- CreateIndex
CREATE INDEX "subscription_requests_userId_idx" ON "subscription_requests"("userId");

-- CreateIndex
CREATE INDEX "subscription_requests_organizationId_idx" ON "subscription_requests"("organizationId");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default subscription settings
INSERT INTO "subscription_settings" (
    "id", 
    "notification_email", 
    "enable_email_notifications", 
    "default_trial_days",
    "default_grace_period_days",
    "invoice_prefix",
    "invoice_next_number",
    "payment_terms_days",
    "estimated_response_hours",
    "created_at",
    "updated_at"
) VALUES (
    gen_random_uuid(),
    NULL,
    true,
    14,
    7,
    'INV-',
    1001,
    30,
    48,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
