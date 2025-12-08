-- CreateEnum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'InquiryStatus'
    ) THEN
        CREATE TYPE "public"."InquiryStatus" AS ENUM ('NEW', 'PENDING', 'CONTACTED', 'QUOTED', 'FULFILLED', 'DECLINED', 'CANCELLED');
    END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "productInterest" TEXT,
    "quantity" INTEGER,
    "budget" TEXT,
    "urgency" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "preferredContactMethod" TEXT,
    "status" "public"."InquiryStatus" NOT NULL DEFAULT 'NEW',
    "supplierNotes" TEXT,
    "responseMessage" TEXT,
    "quotedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_supplierId_status_idx'
    ) THEN
        CREATE INDEX "inquiries_supplierId_status_idx" ON "public"."inquiries"("supplierId", "status");
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_organizationId_idx'
    ) THEN
        CREATE INDEX "inquiries_organizationId_idx" ON "public"."inquiries"("organizationId");
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_createdAt_idx'
    ) THEN
        CREATE INDEX "inquiries_createdAt_idx" ON "public"."inquiries"("createdAt");
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inquiries_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."inquiries" 
        ADD CONSTRAINT "inquiries_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inquiries_supplierId_fkey'
    ) THEN
        ALTER TABLE "public"."inquiries" 
        ADD CONSTRAINT "inquiries_supplierId_fkey" 
        FOREIGN KEY ("supplierId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
