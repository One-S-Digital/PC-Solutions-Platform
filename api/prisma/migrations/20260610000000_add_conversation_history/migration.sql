-- Assistant workspace Phase B: conversation history fields.
-- All statements are idempotent (IF NOT EXISTS / exception guards).

-- Enum
DO $$ BEGIN
  CREATE TYPE "AIConversationKind" AS ENUM ('CHAT', 'DRAFT', 'BRIEFING', 'ORDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "kind" "AIConversationKind" NOT NULL DEFAULT 'CHAT';
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "statusLabel" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: derive last activity from the newest message, falling back to the start time
UPDATE "ai_conversations" c
SET "lastActivityAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "ai_messages" m WHERE m."conversationId" = c."id"),
  c."startedAt"
);

-- Index for the sidebar list query
CREATE INDEX IF NOT EXISTS "ai_conversations_userId_lastActivityAt_idx" ON "ai_conversations"("userId", "lastActivityAt" DESC);
