-- CreateEnum
CREATE TYPE "MailingListType" AS ENUM ('ALL_USERS', 'ROLE_FILTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MailingCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "MailingCampaignDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "mailing_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "MailingListType" NOT NULL,
    "roles" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[],
    "regions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "includeInactive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mailing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_list_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailingListId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mailing_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailingListId" UUID NOT NULL,
    "status" "MailingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT,
    "textContent" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "totalRecipients" INTEGER,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "mailing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_campaign_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userId" UUID,
    "status" "MailingCampaignDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mailing_campaign_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_global_opt_outs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "userId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mailing_global_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailing_list_opt_outs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mailingListId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mailing_list_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_lists_type_idx" ON "mailing_lists"("type");
CREATE INDEX "mailing_lists_createdAt_idx" ON "mailing_lists"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_members_mailingListId_userId_key" ON "mailing_list_members"("mailingListId", "userId");
CREATE INDEX "mailing_list_members_userId_idx" ON "mailing_list_members"("userId");

-- CreateIndex
CREATE INDEX "mailing_campaigns_mailingListId_idx" ON "mailing_campaigns"("mailingListId");
CREATE INDEX "mailing_campaigns_status_idx" ON "mailing_campaigns"("status");
CREATE INDEX "mailing_campaigns_createdAt_idx" ON "mailing_campaigns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_campaign_deliveries_campaignId_email_key" ON "mailing_campaign_deliveries"("campaignId", "email");
CREATE INDEX "mailing_campaign_deliveries_email_idx" ON "mailing_campaign_deliveries"("email");
CREATE INDEX "mailing_campaign_deliveries_userId_idx" ON "mailing_campaign_deliveries"("userId");
CREATE INDEX "mailing_campaign_deliveries_status_idx" ON "mailing_campaign_deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_global_opt_outs_email_key" ON "mailing_global_opt_outs"("email");
CREATE INDEX "mailing_global_opt_outs_createdAt_idx" ON "mailing_global_opt_outs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_opt_outs_mailingListId_email_key" ON "mailing_list_opt_outs"("mailingListId", "email");
CREATE INDEX "mailing_list_opt_outs_email_idx" ON "mailing_list_opt_outs"("email");
CREATE INDEX "mailing_list_opt_outs_createdAt_idx" ON "mailing_list_opt_outs"("createdAt");

-- AddForeignKey
ALTER TABLE "mailing_lists" ADD CONSTRAINT "mailing_lists_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list_members" ADD CONSTRAINT "mailing_list_members_mailingListId_fkey"
    FOREIGN KEY ("mailingListId") REFERENCES "mailing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list_members" ADD CONSTRAINT "mailing_list_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_campaigns" ADD CONSTRAINT "mailing_campaigns_mailingListId_fkey"
    FOREIGN KEY ("mailingListId") REFERENCES "mailing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_campaigns" ADD CONSTRAINT "mailing_campaigns_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_campaign_deliveries" ADD CONSTRAINT "mailing_campaign_deliveries_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "mailing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_campaign_deliveries" ADD CONSTRAINT "mailing_campaign_deliveries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_global_opt_outs" ADD CONSTRAINT "mailing_global_opt_outs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list_opt_outs" ADD CONSTRAINT "mailing_list_opt_outs_mailingListId_fkey"
    FOREIGN KEY ("mailingListId") REFERENCES "mailing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list_opt_outs" ADD CONSTRAINT "mailing_list_opt_outs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

