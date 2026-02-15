-- CreateEnum
CREATE TYPE "MailingCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "mailing_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters_json" JSONB NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "estimated_size" INTEGER,
    "last_computed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "segment_id" TEXT,
    "filters_json" JSONB,
    "status" "MailingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "total_estimated" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "cursor" TEXT,
    "created_by_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_segments_created_by_id_idx" ON "mailing_segments"("created_by_id");

-- CreateIndex
CREATE INDEX "mailing_campaigns_status_idx" ON "mailing_campaigns"("status");
CREATE INDEX "mailing_campaigns_created_by_id_idx" ON "mailing_campaigns"("created_by_id");
CREATE INDEX "mailing_campaigns_segment_id_idx" ON "mailing_campaigns"("segment_id");

-- AddForeignKey
ALTER TABLE "mailing_campaigns" ADD CONSTRAINT "mailing_campaigns_segment_id_fkey"
    FOREIGN KEY ("segment_id") REFERENCES "mailing_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
