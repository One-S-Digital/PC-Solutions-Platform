-- Durable, queryable trace of every signup journey.
-- See the SignupEventLog model in schema.prisma for why this is a table and not
-- console output, and why it deliberately carries no FK to users.

CREATE TABLE "signup_event_logs" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'OK',
    "role" TEXT,
    "userId" TEXT,
    "clerkId" TEXT,
    "email" TEXT,
    "approvalStatusBefore" TEXT,
    "approvalStatusAfter" TEXT,
    "detail" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "signup_event_logs_correlationId_createdAt_idx" ON "signup_event_logs"("correlationId", "createdAt");
CREATE INDEX "signup_event_logs_email_idx" ON "signup_event_logs"("email");
CREATE INDEX "signup_event_logs_userId_idx" ON "signup_event_logs"("userId");
CREATE INDEX "signup_event_logs_createdAt_idx" ON "signup_event_logs"("createdAt");
CREATE INDEX "signup_event_logs_outcome_createdAt_idx" ON "signup_event_logs"("outcome", "createdAt");
