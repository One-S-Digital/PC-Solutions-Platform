-- AlterTable: Add coverAssetId to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coverAssetId" TEXT;

-- AddForeignKey: Add foreign key constraint for coverAssetId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_coverAssetId_fkey'
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_coverAssetId_fkey"
        FOREIGN KEY ("coverAssetId")
        REFERENCES "assets"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: Add index for coverAssetId if it doesn't exist
CREATE INDEX IF NOT EXISTS "users_coverAssetId_idx" ON "users"("coverAssetId");

