-- Add promo code fields to orders (marketplace checkout)
ALTER TABLE "orders"
  ADD COLUMN "subtotalAmount" DOUBLE PRECISION,
  ADD COLUMN "promoCodeId" TEXT,
  ADD COLUMN "promoCode" TEXT,
  ADD COLUMN "discountType" TEXT,
  ADD COLUMN "discountValue" DOUBLE PRECISION,
  ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill subtotalAmount for existing rows (pre-discount subtotal)
UPDATE "orders"
SET "subtotalAmount" = "totalAmount"
WHERE "subtotalAmount" IS NULL;

-- Foreign key to promo_codes (optional, keep historical data even if code is deleted)
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for reporting / joins
CREATE INDEX "orders_promoCodeId_idx" ON "orders"("promoCodeId");

