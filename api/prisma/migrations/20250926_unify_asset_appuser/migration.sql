ALTER TABLE "AppUser" RENAME COLUMN "clerkUserId" TO "clerkId";

ALTER INDEX IF EXISTS "AppUser_clerkUserId_key" RENAME TO "AppUser_clerkId_key";

ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email");

ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_uploadedBy_fkey";

ALTER TABLE "assets" RENAME COLUMN "uploadedBy" TO "uploadedById";

ALTER TABLE "assets"
  ADD CONSTRAINT "assets_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
