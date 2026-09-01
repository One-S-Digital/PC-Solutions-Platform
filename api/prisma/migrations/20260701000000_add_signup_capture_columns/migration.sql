-- Signup fields that were collected on the signup form but never persisted.
-- `childAge`/`childStartDate` are collected from PARENT signups; `termsAcceptedAt`
-- records the consent given at signup. All three are now written by the shared
-- applier in api/src/users/signup-profile.service.ts, from both the Clerk
-- webhook path and the /users/complete-profile path.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "childAge" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "childStartDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
