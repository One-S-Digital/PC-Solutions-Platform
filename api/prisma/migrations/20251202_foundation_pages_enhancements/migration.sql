-- Foundation Pages Enhancements Migration
-- This migration adds tables for:
-- 1. Foundation Lead Responses (tracking foundation responses to parent leads)
-- 2. Support Tickets (support ticket system)
-- 3. Ticket Responses (responses to support tickets)
-- 4. Calendar Events (foundation calendar events)

-- CreateTable: foundation_lead_responses
CREATE TABLE "foundation_lead_responses" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "foundationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foundation_lead_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: support_tickets
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket_responses
CREATE TABLE "ticket_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: calendar_events
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: foundation_lead_responses
CREATE UNIQUE INDEX "foundation_lead_responses_leadId_foundationId_key" ON "foundation_lead_responses"("leadId", "foundationId");
CREATE INDEX "foundation_lead_responses_foundationId_idx" ON "foundation_lead_responses"("foundationId");
CREATE INDEX "foundation_lead_responses_status_idx" ON "foundation_lead_responses"("status");

-- CreateIndex: support_tickets
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");
CREATE INDEX "support_tickets_assignedTo_idx" ON "support_tickets"("assignedTo");

-- CreateIndex: ticket_responses
CREATE INDEX "ticket_responses_ticketId_idx" ON "ticket_responses"("ticketId");

-- CreateIndex: calendar_events
CREATE INDEX "calendar_events_organizationId_idx" ON "calendar_events"("organizationId");
CREATE INDEX "calendar_events_startTime_idx" ON "calendar_events"("startTime");
CREATE INDEX "calendar_events_eventType_idx" ON "calendar_events"("eventType");

-- CreateIndex: parent_leads (add missing indexes)
CREATE INDEX IF NOT EXISTS "parent_leads_status_idx" ON "parent_leads"("status");
CREATE INDEX IF NOT EXISTS "parent_leads_foundationId_idx" ON "parent_leads"("foundationId");

-- AddForeignKey: foundation_lead_responses
ALTER TABLE "foundation_lead_responses" ADD CONSTRAINT "foundation_lead_responses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "parent_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "foundation_lead_responses" ADD CONSTRAINT "foundation_lead_responses_foundationId_fkey" FOREIGN KEY ("foundationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: support_tickets
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ticket_responses
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: calendar_events
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
