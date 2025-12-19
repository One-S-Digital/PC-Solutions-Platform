-- Create new enum for product availability if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ProductAvailabilityStatus'
    ) THEN
        CREATE TYPE "ProductAvailabilityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'OUT_OF_STOCK');
    END IF;
END
$$;

ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "subtitle" TEXT,
    ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'CHF',
    ADD COLUMN IF NOT EXISTS "primaryCategory" TEXT,
    ADD COLUMN IF NOT EXISTS "productHighlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT,
    ADD COLUMN IF NOT EXISTS "availabilityStatus" "ProductAvailabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS "sku" TEXT,
    ADD COLUMN IF NOT EXISTS "vendorSku" TEXT,
    ADD COLUMN IF NOT EXISTS "ean" TEXT,
    ADD COLUMN IF NOT EXISTS "minOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "maxOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "stockStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "deliveryLeadTimeDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "restockCadence" TEXT,
    ADD COLUMN IF NOT EXISTS "usageNotes" TEXT,
    ADD COLUMN IF NOT EXISTS "packagingDetails" TEXT,
    ADD COLUMN IF NOT EXISTS "materials" TEXT,
    ADD COLUMN IF NOT EXISTS "complianceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "ageRanges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryFees" JSONB,
    ADD COLUMN IF NOT EXISTS "supportedCantons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "visibilityStart" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "visibilityEnd" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "volumePricing" JSONB,
    ADD COLUMN IF NOT EXISTS "variants" JSONB,
    ADD COLUMN IF NOT EXISTS "galleryAssetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "specSheetAssetId" TEXT,
    ADD COLUMN IF NOT EXISTS "msdsAssetId" TEXT;

ALTER TABLE "products"
    ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "categories" SET DEFAULT ARRAY[]::TEXT[];
