-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");
