-- Create AppUser table (companion to existing User table)
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX "AppUser_clerkUserId_key" ON "AppUser"("clerkUserId");

-- Create AppUserRoleHistory table for audit trail
CREATE TABLE "AppUserRoleHistory" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "previousRole" "UserRole",
    "newRole" "UserRole" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUserRoleHistory_pkey" PRIMARY KEY ("id")
);

-- Create index for userId lookups
CREATE INDEX "AppUserRoleHistory_userId_idx" ON "AppUserRoleHistory"("userId");

-- Create Outbox table for reliable sync
CREATE TABLE "Outbox" (
    "id" BIGSERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- Create index for polling
CREATE INDEX "Outbox_nextRunAt_idx" ON "Outbox"("nextRunAt");

-- Add foreign key constraints
ALTER TABLE "AppUserRoleHistory" ADD CONSTRAINT "AppUserRoleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing users to AppUser
INSERT INTO "AppUser" ("id", "clerkUserId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "clerkId", "role", "createdAt", "updatedAt"
FROM "users"
ON CONFLICT DO NOTHING;