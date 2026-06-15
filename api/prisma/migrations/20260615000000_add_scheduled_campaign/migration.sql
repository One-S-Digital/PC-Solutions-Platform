-- AddValue
ALTER TYPE "MailingCampaignStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' BEFORE 'SENDING';

-- AlterTable
ALTER TABLE "mailing_campaigns" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mailing_campaigns_scheduled_at_idx" ON "mailing_campaigns"("scheduled_at");
