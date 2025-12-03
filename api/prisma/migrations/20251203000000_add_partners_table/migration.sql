-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('ACADEMIC', 'CORPORATE', 'GOVERNMENTAL', 'NON_PROFIT', 'MEDIA', 'TECHNOLOGY');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "countryRegion" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactPerson" TEXT,
    "logoAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "partnershipStart" TIMESTAMP(3),
    "partnershipEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partners_type_idx" ON "partners"("type");

-- CreateIndex
CREATE INDEX "partners_isActive_idx" ON "partners"("isActive");

-- CreateIndex
CREATE INDEX "partners_isFeatured_idx" ON "partners"("isFeatured");

-- CreateIndex
CREATE INDEX "partners_displayOrder_idx" ON "partners"("displayOrder");
