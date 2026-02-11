-- Link parent leads to concrete parent user accounts.
-- This allows enquiries submitted before signup to be attached
-- to the parent account once it is created.

ALTER TABLE "parent_leads"
ADD COLUMN IF NOT EXISTS "parentUserId" TEXT;

-- Backfill existing leads by matching parentEmail to users.email.
UPDATE "parent_leads" AS pl
SET "parentUserId" = u."id"
FROM "users" AS u
WHERE pl."parentUserId" IS NULL
  AND u."email" IS NOT NULL
  AND LOWER(TRIM(pl."parentEmail")) = LOWER(TRIM(u."email"));

CREATE INDEX IF NOT EXISTS "parent_leads_parentUserId_idx"
ON "parent_leads"("parentUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parent_leads_parentUserId_fkey'
  ) THEN
    ALTER TABLE "parent_leads"
    ADD CONSTRAINT "parent_leads_parentUserId_fkey"
    FOREIGN KEY ("parentUserId") REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
