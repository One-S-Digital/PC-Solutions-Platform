-- CreateTable
CREATE TABLE IF NOT EXISTS "organization_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CATALOG',
    "title" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organization_documents_organizationId_idx" ON "organization_documents"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "organization_documents_documentType_idx" ON "organization_documents"("documentType");

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_documents_organizationId_fkey'
    ) THEN
        ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_documents_assetId_fkey'
    ) THEN
        ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_assetId_fkey" 
        FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
