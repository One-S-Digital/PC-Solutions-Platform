-- AlterTable
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "contentCategory" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assets_contentCategory_idx" ON "assets"("contentCategory");
