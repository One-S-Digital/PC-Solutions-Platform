-- Enums
CREATE TYPE "AIConversationStatus" AS ENUM ('ACTIVE', 'ENDED', 'ARCHIVED');
CREATE TYPE "AIChannel" AS ENUM ('WEB', 'WHATSAPP', 'EMAIL');
CREATE TYPE "AIMessageSender" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
CREATE TYPE "AIToolCallStatus" AS ENUM ('PROPOSED', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED');
CREATE TYPE "AIActionLevel" AS ENUM ('L1_ANSWER', 'L2_DRAFT', 'L3_EXECUTE');

-- Tables
CREATE TABLE "ai_conversations" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "role" "UserRole" NOT NULL,
  "channel" "AIChannel" NOT NULL DEFAULT 'WEB',
  "status" "AIConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "ai_conversations_userId_startedAt_idx" ON "ai_conversations"("userId", "startedAt" DESC);

CREATE TABLE "ai_messages" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL,
  "sender" "AIMessageSender" NOT NULL,
  "content" TEXT NOT NULL,
  "structuredIntent" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE
);
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

CREATE TABLE "ai_tool_calls" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL,
  "messageId" TEXT,
  "toolName" TEXT NOT NULL,
  "level" "AIActionLevel" NOT NULL,
  "inputJson" JSONB NOT NULL,
  "outputJson" JSONB,
  "status" "AIToolCallStatus" NOT NULL DEFAULT 'PROPOSED',
  "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
  "approvedById" TEXT,
  "executedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
  FOREIGN KEY ("messageId") REFERENCES "ai_messages"("id")
);
CREATE INDEX "ai_tool_calls_conversationId_createdAt_idx" ON "ai_tool_calls"("conversationId", "createdAt");
CREATE INDEX "ai_tool_calls_status_idx" ON "ai_tool_calls"("status");

CREATE TABLE "ai_action_approvals" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "toolCallId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT,
  "approvalContext" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("toolCallId") REFERENCES "ai_tool_calls"("id") ON DELETE CASCADE
);

CREATE TABLE "ai_context_memory" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "memoryType" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "memoryType", "key")
);
