-- Store admin-selected suspension/cancellation reason shown to the user
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "deactivatedReasonCode" TEXT;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "deactivatedReasonText" TEXT;

