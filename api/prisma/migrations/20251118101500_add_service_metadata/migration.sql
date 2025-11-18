-- Add service metadata fields used by the frontend upload form
ALTER TABLE "services"
ADD COLUMN "priceInfo" TEXT,
ADD COLUMN "availability" TEXT,
ADD COLUMN "deliveryType" TEXT NOT NULL DEFAULT 'On-site',
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "imageUrl" TEXT;
