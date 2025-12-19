-- CreateTable: promo_codes for Product Suppliers and Service Providers
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "description" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsage" INTEGER,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on code + organizationId
CREATE UNIQUE INDEX "promo_codes_code_organizationId_key" ON "promo_codes"("code", "organizationId");

-- CreateIndex: index on organizationId
CREATE INDEX "promo_codes_organizationId_idx" ON "promo_codes"("organizationId");

-- CreateIndex: index on status
CREATE INDEX "promo_codes_status_idx" ON "promo_codes"("status");

-- AddForeignKey: organization relationship with cascade delete
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
