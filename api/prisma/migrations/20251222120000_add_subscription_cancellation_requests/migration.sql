-- CreateEnum
CREATE TYPE "SubscriptionCancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscription_cancellation_requests" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT,
    "organization_id" TEXT,
    "reason" TEXT,
    "status" "SubscriptionCancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "subscription_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_cancellation_requests_status_idx" ON "subscription_cancellation_requests"("status");

-- CreateIndex
CREATE INDEX "subscription_cancellation_requests_requested_at_idx" ON "subscription_cancellation_requests"("requested_at");

-- CreateIndex
CREATE INDEX "subscription_cancellation_requests_subscription_id_idx" ON "subscription_cancellation_requests"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_cancellation_requests_user_id_idx" ON "subscription_cancellation_requests"("user_id");

-- CreateIndex
CREATE INDEX "subscription_cancellation_requests_organization_id_idx" ON "subscription_cancellation_requests"("organization_id");

-- AddForeignKey
ALTER TABLE "subscription_cancellation_requests" ADD CONSTRAINT "subscription_cancellation_requests_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cancellation_requests" ADD CONSTRAINT "subscription_cancellation_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cancellation_requests" ADD CONSTRAINT "subscription_cancellation_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

