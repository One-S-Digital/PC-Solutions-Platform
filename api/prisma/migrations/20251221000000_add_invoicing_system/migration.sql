-- Swiss QR Invoice System Migration
-- Phase 1: Database Schema Foundation

-- Add new AssetKind enum values for invoicing
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'INVOICE_PDF';
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'QUOTE_PDF';
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE_PDF';
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'PROFORMA_PDF';
ALTER TYPE "AssetKind" ADD VALUE IF NOT EXISTS 'RECEIPT_PDF';

-- Create InvoiceDocumentType enum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'QUOTE');

-- Create InvoiceDocumentStatus enum
CREATE TYPE "InvoiceDocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID', 'ARCHIVED');

-- Create QuoteStatus enum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED');

-- Create InvoiceReferenceType enum
CREATE TYPE "InvoiceReferenceType" AS ENUM ('QRR', 'SCOR', 'NON');

-- Create InvoiceAddressType enum
CREATE TYPE "InvoiceAddressType" AS ENUM ('STRUCTURED', 'COMBINED');

-- Create InvoicePaymentTerms enum
CREATE TYPE "InvoicePaymentTerms" AS ENUM ('DUE_ON_RECEIPT', 'NET_7', 'NET_10', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'CUSTOM');

-- Create VatDisplayMode enum
CREATE TYPE "VatDisplayMode" AS ENUM ('EXCLUDED', 'INCLUDED');

-- Create InvoicingSettings table
CREATE TABLE "invoicing_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT,
    "tradingName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CH',
    "addressType" "InvoiceAddressType" NOT NULL DEFAULT 'STRUCTURED',
    "vatNumber" TEXT,
    "registrationNumber" TEXT,
    "defaultBankAccountId" TEXT,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultReferenceType" "InvoiceReferenceType" NOT NULL DEFAULT 'SCOR',
    "defaultPaymentTerms" "InvoicePaymentTerms" NOT NULL DEFAULT 'NET_30',
    "defaultDueDays" INTEGER NOT NULL DEFAULT 30,
    "defaultVatDisplayMode" "VatDisplayMode" NOT NULL DEFAULT 'EXCLUDED',
    "defaultNotes" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'de',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "creditNotePrefix" TEXT NOT NULL DEFAULT 'CN',
    "proformaPrefix" TEXT NOT NULL DEFAULT 'PF',
    "quotePrefix" TEXT NOT NULL DEFAULT 'QT',
    "numberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ:5}',
    "yearlyReset" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoicing_settings_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationBankAccount table
CREATE TABLE "organization_bank_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bankName" TEXT,
    "bic" TEXT,
    "isQrIban" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- Create DocumentSequence table
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "InvoiceDocumentType" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- Create InvoiceDocument table
CREATE TABLE "invoice_documents" (
    "id" TEXT NOT NULL,
    "documentType" "InvoiceDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "referenceNumber" TEXT,
    "referenceType" "InvoiceReferenceType" NOT NULL DEFAULT 'SCOR',
    "status" "InvoiceDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "quoteStatus" "QuoteStatus",
    "issuerOrgId" TEXT NOT NULL,
    "recipientOrgId" TEXT NOT NULL,
    "recipientContactId" TEXT,
    "createdById" TEXT NOT NULL,
    "issuedById" TEXT,
    "issuerSnapshot" JSONB,
    "recipientSnapshot" JSONB,
    "bankAccountId" TEXT,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qrPayloadHash" TEXT,
    "subtotalMinor" BIGINT NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "netMinor" BIGINT NOT NULL DEFAULT 0,
    "vatMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL DEFAULT 0,
    "roundingAdjustmentMinor" BIGINT NOT NULL DEFAULT 0,
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "balanceMinor" BIGINT NOT NULL DEFAULT 0,
    "vatDisplayMode" "VatDisplayMode" NOT NULL DEFAULT 'EXCLUDED',
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "documentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paymentTerms" "InvoicePaymentTerms" NOT NULL DEFAULT 'NET_30',
    "validUntil" TIMESTAMP(3),
    "servicePeriodStart" TIMESTAMP(3),
    "servicePeriodEnd" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "poNumber" TEXT,
    "originalDocumentId" TEXT,
    "currentPdfVersion" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'de',
    "issuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_documents_pkey" PRIMARY KEY ("id")
);

-- Create InvoiceLineItem table
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitLabel" TEXT,
    "unitPriceMinor" BIGINT NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "lineSubtotalMinor" BIGINT NOT NULL DEFAULT 0,
    "lineNetMinor" BIGINT NOT NULL DEFAULT 0,
    "vatRateBps" INTEGER NOT NULL DEFAULT 0,
    "vatMinor" BIGINT NOT NULL DEFAULT 0,
    "lineTotalMinor" BIGINT NOT NULL DEFAULT 0,
    "originalLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- Create InvoicePayment table
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "notes" TEXT,
    "stripePaymentIntentId" TEXT,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "refundedPaymentId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- Create InvoicePdfVersion table
CREATE TABLE "invoice_pdf_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "assetId" TEXT NOT NULL,
    "qrPayloadHash" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regenerationReason" TEXT,

    CONSTRAINT "invoice_pdf_versions_pkey" PRIMARY KEY ("id")
);

-- Create InvoiceAuditLog table
CREATE TABLE "invoice_audit_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "snapshot" JSONB,
    "actorId" TEXT NOT NULL,
    "actorIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create InvoicingSettingsAuditLog table
CREATE TABLE "invoicing_settings_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "actorId" TEXT NOT NULL,
    "actorIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoicing_settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "invoicing_settings_organizationId_key" ON "invoicing_settings"("organizationId");
CREATE UNIQUE INDEX "organization_bank_accounts_organizationId_iban_key" ON "organization_bank_accounts"("organizationId", "iban");
CREATE UNIQUE INDEX "document_sequences_organizationId_documentType_year_key" ON "document_sequences"("organizationId", "documentType", "year");
CREATE UNIQUE INDEX "invoice_documents_issuerOrgId_documentNumber_key" ON "invoice_documents"("issuerOrgId", "documentNumber");
CREATE UNIQUE INDEX "invoice_pdf_versions_documentId_version_key" ON "invoice_pdf_versions"("documentId", "version");

-- Create indexes
CREATE INDEX "invoicing_settings_organizationId_idx" ON "invoicing_settings"("organizationId");
CREATE INDEX "organization_bank_accounts_organizationId_idx" ON "organization_bank_accounts"("organizationId");
CREATE INDEX "organization_bank_accounts_isDefault_idx" ON "organization_bank_accounts"("isDefault");
CREATE INDEX "document_sequences_organizationId_idx" ON "document_sequences"("organizationId");
CREATE INDEX "invoice_documents_issuerOrgId_idx" ON "invoice_documents"("issuerOrgId");
CREATE INDEX "invoice_documents_recipientOrgId_idx" ON "invoice_documents"("recipientOrgId");
CREATE INDEX "invoice_documents_status_idx" ON "invoice_documents"("status");
CREATE INDEX "invoice_documents_documentType_idx" ON "invoice_documents"("documentType");
CREATE INDEX "invoice_documents_documentDate_idx" ON "invoice_documents"("documentDate");
CREATE INDEX "invoice_documents_dueDate_idx" ON "invoice_documents"("dueDate");
CREATE INDEX "invoice_documents_createdById_idx" ON "invoice_documents"("createdById");
CREATE INDEX "invoice_line_items_documentId_idx" ON "invoice_line_items"("documentId");
CREATE INDEX "invoice_line_items_position_idx" ON "invoice_line_items"("position");
CREATE INDEX "invoice_payments_documentId_idx" ON "invoice_payments"("documentId");
CREATE INDEX "invoice_payments_paymentDate_idx" ON "invoice_payments"("paymentDate");
CREATE INDEX "invoice_payments_recordedById_idx" ON "invoice_payments"("recordedById");
CREATE INDEX "invoice_pdf_versions_documentId_idx" ON "invoice_pdf_versions"("documentId");
CREATE INDEX "invoice_audit_logs_documentId_idx" ON "invoice_audit_logs"("documentId");
CREATE INDEX "invoice_audit_logs_actorId_idx" ON "invoice_audit_logs"("actorId");
CREATE INDEX "invoice_audit_logs_action_idx" ON "invoice_audit_logs"("action");
CREATE INDEX "invoice_audit_logs_createdAt_idx" ON "invoice_audit_logs"("createdAt");
CREATE INDEX "invoicing_settings_audit_logs_organizationId_idx" ON "invoicing_settings_audit_logs"("organizationId");
CREATE INDEX "invoicing_settings_audit_logs_actorId_idx" ON "invoicing_settings_audit_logs"("actorId");
CREATE INDEX "invoicing_settings_audit_logs_createdAt_idx" ON "invoicing_settings_audit_logs"("createdAt");

-- Add foreign key constraints
ALTER TABLE "invoicing_settings" ADD CONSTRAINT "invoicing_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoicing_settings" ADD CONSTRAINT "invoicing_settings_defaultBankAccountId_fkey" FOREIGN KEY ("defaultBankAccountId") REFERENCES "organization_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_bank_accounts" ADD CONSTRAINT "organization_bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_issuerOrgId_fkey" FOREIGN KEY ("issuerOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_recipientOrgId_fkey" FOREIGN KEY ("recipientOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "organization_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_originalDocumentId_fkey" FOREIGN KEY ("originalDocumentId") REFERENCES "invoice_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "invoice_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_originalLineId_fkey" FOREIGN KEY ("originalLineId") REFERENCES "invoice_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "invoice_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_refundedPaymentId_fkey" FOREIGN KEY ("refundedPaymentId") REFERENCES "invoice_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_pdf_versions" ADD CONSTRAINT "invoice_pdf_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "invoice_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_pdf_versions" ADD CONSTRAINT "invoice_pdf_versions_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoice_audit_logs" ADD CONSTRAINT "invoice_audit_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "invoice_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_audit_logs" ADD CONSTRAINT "invoice_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoicing_settings_audit_logs" ADD CONSTRAINT "invoicing_settings_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoicing_settings_audit_logs" ADD CONSTRAINT "invoicing_settings_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
