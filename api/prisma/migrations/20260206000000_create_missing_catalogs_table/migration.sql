-- CreateTable (idempotent: only if not exists)
-- The catalogs table was defined in the initial migration but may not exist
-- in some database instances, causing download failures (P2021 error).
CREATE TABLE IF NOT EXISTS "public"."catalogs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "supplierId" TEXT NOT NULL,
    "pdfAssetId" TEXT,
    "csvAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent: only if constraint does not exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'catalogs_pdfAssetId_fkey'
    ) THEN
        ALTER TABLE "public"."catalogs"
            ADD CONSTRAINT "catalogs_pdfAssetId_fkey"
            FOREIGN KEY ("pdfAssetId")
            REFERENCES "public"."assets"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'catalogs_csvAssetId_fkey'
    ) THEN
        ALTER TABLE "public"."catalogs"
            ADD CONSTRAINT "catalogs_csvAssetId_fkey"
            FOREIGN KEY ("csvAssetId")
            REFERENCES "public"."assets"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'catalogs_supplierId_fkey'
    ) THEN
        ALTER TABLE "public"."catalogs"
            ADD CONSTRAINT "catalogs_supplierId_fkey"
            FOREIGN KEY ("supplierId")
            REFERENCES "public"."organizations"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
