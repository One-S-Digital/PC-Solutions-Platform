-- AlterTable
ALTER TABLE "mailing_campaigns" ADD COLUMN "extra_emails_json" JSONB,
ADD COLUMN "extra_emails_sent" BOOLEAN NOT NULL DEFAULT false;
