-- Simplify PromoCode model for display-only functionality
-- This migration converts the complex discount system to a simple text-based display

-- Step 1: Add new columns
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "discount" TEXT;
ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Migrate existing data - convert discountType + value to discount text
-- Use LOWER() for case-insensitive matching to handle any unexpected casing
UPDATE "promo_codes" 
SET "discount" = CASE 
    WHEN LOWER("discountType") = 'percentage' THEN CONCAT(CAST("value" AS TEXT), '% off')
    WHEN LOWER("discountType") IN ('fixedamount', 'fixed_amount') THEN CONCAT('CHF ', CAST("value" AS TEXT), ' off')
    WHEN LOWER("discountType") IN ('freeminutes', 'free_minutes') THEN CONCAT(CAST("value" AS TEXT), ' free minutes')
    ELSE CONCAT(CAST("value" AS TEXT), ' off')
END
WHERE "discount" IS NULL;

-- Step 3: Set isActive based on old status column
UPDATE "promo_codes" 
SET "isActive" = CASE 
    WHEN "status" = 'Active' THEN true
    ELSE false
END;

-- Step 4: Make discount required for new records (set default for any remaining nulls)
UPDATE "promo_codes" SET "discount" = 'Discount' WHERE "discount" IS NULL;
ALTER TABLE "promo_codes" ALTER COLUMN "discount" SET NOT NULL;

-- Step 5: Drop old columns that are no longer needed
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "discountType";
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "value";
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "expiryDate";
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "status";
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "usageCount";
ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "maxUsage";

-- Step 6: Drop old index on status and create new index on isActive
DROP INDEX IF EXISTS "promo_codes_status_idx";
CREATE INDEX IF NOT EXISTS "promo_codes_isActive_idx" ON "promo_codes"("isActive");
