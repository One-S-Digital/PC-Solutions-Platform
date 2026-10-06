-- Addresses that must not receive campaign mail, keyed by email.
-- See the MailingSuppression model in schema.prisma for why this is not just
-- UserNotificationPreferences.mailingListOptOut: an unsubscribe link can belong
-- to an out-of-database "extra" address that has no user row to flag.

CREATE TABLE "mailing_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'unsubscribe',
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailing_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mailing_suppressions_email_key" ON "mailing_suppressions"("email");
