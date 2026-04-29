-- Add service metadata fields used by the frontend upload form
ALTER TABLE "services"
ADD COLUMN IF NOT EXISTS "priceInfo" TEXT,
ADD COLUMN IF NOT EXISTS "availability" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryType" TEXT NOT NULL DEFAULT 'On-site',
ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
