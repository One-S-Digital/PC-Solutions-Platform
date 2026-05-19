-- Backfill: set approvalStatus = 'PENDING_REVIEW' for all EDUCATOR users
-- where approvalStatus is still NULL (rows created before the approval workflow
-- was enforced). Previously visible educators disappear from candidate queries
-- once the APPROVED filter is applied, so this must run before that deployment.
UPDATE "users"
SET "approvalStatus" = 'PENDING_REVIEW'
WHERE "role" = 'EDUCATOR'
  AND "approvalStatus" IS NULL;
