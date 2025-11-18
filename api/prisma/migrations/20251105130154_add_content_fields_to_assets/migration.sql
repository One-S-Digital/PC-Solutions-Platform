-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "accessRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contentPreview" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "externalLink" TEXT,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "isCritical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lessons" INTEGER,
ADD COLUMN     "policyType" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "reviewDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT DEFAULT 'Draft',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "versionNumber" TEXT,
ADD COLUMN     "videoSourceType" TEXT;

-- CreateIndex
CREATE INDEX "assets_contentType_idx" ON "assets"("contentType");

-- CreateIndex
CREATE INDEX "assets_language_idx" ON "assets"("language");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_country_idx" ON "assets"("country");

-- CreateIndex
CREATE INDEX "assets_region_idx" ON "assets"("region");

-- CreateIndex
CREATE INDEX "assets_isCritical_idx" ON "assets"("isCritical");
