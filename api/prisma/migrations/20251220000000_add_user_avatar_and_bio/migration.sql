-- AlterTable: Add avatarAssetId and shortBio to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarAssetId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "shortBio" TEXT;

-- AddForeignKey: Add foreign key constraint for avatarAssetId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_avatarAssetId_fkey'
    ) THEN
        ALTER TABLE "users" 
        ADD CONSTRAINT "users_avatarAssetId_fkey" 
        FOREIGN KEY ("avatarAssetId") 
        REFERENCES "assets"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: Add index for avatarAssetId if it doesn't exist
CREATE INDEX IF NOT EXISTS "users_avatarAssetId_idx" ON "users"("avatarAssetId");
