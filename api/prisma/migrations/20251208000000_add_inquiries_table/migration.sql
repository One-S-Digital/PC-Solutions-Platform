-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'PENDING', 'CONTACTED', 'QUOTED', 'FULFILLED', 'DECLINED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "inquiries" (
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
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
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
CREATE INDEX IF NOT EXISTS "inquiries_supplierId_status_idx" ON "inquiries"("supplierId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiries_organizationId_idx" ON "inquiries"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiries_createdAt_idx" ON "inquiries"("createdAt");

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
