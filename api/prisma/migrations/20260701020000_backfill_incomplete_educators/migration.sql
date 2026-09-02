-- Reclassify existing educator accounts that were never actually submitted.
--
-- These are accounts created by the signup webhook whose owner never completed
-- step 3: no biography and no CV. They have been sitting in the admin approval
-- queue as blank rows. Moving them to INCOMPLETE makes the queue truthful and
-- routes the owners to the "Finish your application" prompt on next login.
--
-- Deliberately scoped to PENDING_REVIEW only: an APPROVED or REJECTED educator
-- has already been decided on by an admin and must not be reopened.
UPDATE "users"
SET "approvalStatus" = 'INCOMPLETE'
WHERE "role" = 'EDUCATOR'
  AND "approvalStatus" = 'PENDING_REVIEW'
  AND COALESCE(TRIM("shortBio"), '') = ''
  AND COALESCE(TRIM("cvUrl"), '') = '';
