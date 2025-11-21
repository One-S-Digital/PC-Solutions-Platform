-- AlterTable
ALTER TABLE "assets" ADD COLUMN "contentCategory" TEXT;

-- CreateIndex
CREATE INDEX "assets_contentCategory_idx" ON "assets"("contentCategory");

