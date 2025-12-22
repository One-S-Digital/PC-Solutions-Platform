-- CreateEnum
CREATE TYPE "public"."VendorClientReason" AS ENUM ('NEW', 'TRIAL', 'CONTRACT', 'PAUSED', 'TERMINATED');

-- CreateTable
CREATE TABLE "public"."vendor_clients" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "reason" "public"."VendorClientReason",
  "note" TEXT,
  "markedByUserId" TEXT NOT NULL,
  "markedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deactivatedAt" TIMESTAMPTZ,
  "lastAdminNotifiedAt" TIMESTAMPTZ,

  CONSTRAINT "vendor_clients_pkey" PRIMARY KEY ("id")
);

-- Unique vendor<->org pair
CREATE UNIQUE INDEX "vendor_clients_vendorId_orgId_key" ON "public"."vendor_clients"("vendorId", "orgId");

-- Indexes for querying
CREATE INDEX "vendor_clients_vendorId_idx" ON "public"."vendor_clients"("vendorId");
CREATE INDEX "vendor_clients_orgId_idx" ON "public"."vendor_clients"("orgId");

-- Foreign keys
ALTER TABLE "public"."vendor_clients"
  ADD CONSTRAINT "vendor_clients_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."vendor_clients"
  ADD CONSTRAINT "vendor_clients_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."vendor_clients"
  ADD CONSTRAINT "vendor_clients_markedByUserId_fkey"
  FOREIGN KEY ("markedByUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

