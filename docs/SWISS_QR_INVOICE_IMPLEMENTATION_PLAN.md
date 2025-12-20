# Swiss QR-Bill Invoice Module - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to build a **full-featured invoicing system** with Swiss QR-bill payment generation, comparable to professional invoicing platforms like **Wave Apps** and **Invoice Ninja**. The system includes:

- **Complete Document Lifecycle**: Quotes/Estimates → Proforma → Invoice → Receipt → Credit Notes
- **Recurring Invoices**: Automated scheduling with flexible intervals
- **Swiss QR-Bill Compliance**: Validated IBAN accounts, QRR/SCOR references, PDF generation
- **Payment Management**: Partial payments, deposits, late fees, payment reminders
- **Client Portal**: Self-service invoice viewing and payment
- **Multi-currency Support**: CHF, EUR with exchange rate handling
- **Invoice Templates**: Customizable branding and layouts
- **Full Audit Trail**: Complete history of all document changes

---

## Table of Contents

1. [Swiss QR-Bill Compliance Requirements](#1-swiss-qr-bill-compliance-requirements)
2. [Database Schema Design](#2-database-schema-design)
3. [Recurring Invoices & Automation](#3-recurring-invoices--automation)
4. [Document Types & Workflow](#4-document-types--workflow)
5. [Backend Module Architecture](#5-backend-module-architecture)
6. [Swiss QR-Bill Generation Logic](#6-swiss-qr-bill-generation-logic)
7. [IBAN Validation & Account Setup](#7-iban-validation--account-setup)
8. [PDF Generation Pipeline](#8-pdf-generation-pipeline)
9. [Payment Management](#9-payment-management)
10. [Client Portal](#10-client-portal)
    - [10.5 Security Considerations](#105-security-considerations)
11. [Admin Dashboard Integration](#11-admin-dashboard-integration)
    - [11.6 Accountant Export System](#116-accountant-export-system)
12. [API Endpoints](#12-api-endpoints)
13. [Email & Notifications](#13-email--notifications)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Swiss QR-Bill Compliance Requirements

### 1.1 Mandatory Components (SIX Swiss Payment Standards)

According to the **Swiss Payment Standards 2019** and ISO 20022, a valid Swiss QR-bill must contain:

| Component | Description | Validation |
|-----------|-------------|------------|
| **QR-IBAN** | Swiss IBAN starting with CH/LI (21 chars) | Mod-97 checksum |
| **Creditor** | Name + address (max 70 chars name) | Required |
| **Amount** | CHF/EUR, 2 decimal places | 0.01 - 999,999,999.99 |
| **Currency** | CHF or EUR only | ISO 4217 |
| **Debtor** | Name + address (optional but recommended) | If present, full address |
| **Reference** | QRR (27 digits) OR SCOR (max 25 chars) OR NON | Type-specific validation |
| **Additional Info** | Unstructured message (max 140 chars) | Optional |

### 1.2 QR Code Specifications

```
┌─────────────────────────────────────────────────────────────┐
│ Swiss QR Code Structure (SPC/0200/1)                       │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                      │
│   SPC                          (QR Type)                     │
│   0200                         (Version)                     │
│   1                            (Coding Type - UTF-8)         │
├─────────────────────────────────────────────────────────────┤
│ Creditor Information:                                        │
│   Account (IBAN)               CH4431999123000889012         │
│   Address Type                 S (Structured) or K (Combined)│
│   Name                         ProCrèche GmbH                │
│   Street/PO Box                Musterstrasse 1               │
│   Building/Apt                 (optional)                    │
│   Postal Code                  8000                          │
│   City                         Zürich                        │
│   Country                      CH                            │
├─────────────────────────────────────────────────────────────┤
│ Ultimate Creditor:             (Optional, usually empty)     │
├─────────────────────────────────────────────────────────────┤
│ Payment Amount:                                              │
│   Amount                       1500.00                       │
│   Currency                     CHF                           │
├─────────────────────────────────────────────────────────────┤
│ Ultimate Debtor:                                             │
│   Address Type                 S                             │
│   Name                         Kinderkrippe Sonnenschein     │
│   Street                       Beispielweg 42                │
│   Building                                                   │
│   Postal Code                  3000                          │
│   City                         Bern                          │
│   Country                      CH                            │
├─────────────────────────────────────────────────────────────┤
│ Reference:                                                   │
│   Reference Type               QRR / SCOR / NON              │
│   Reference                    210000000003139471430009017   │
├─────────────────────────────────────────────────────────────┤
│ Additional Information:                                      │
│   Unstructured Message         Subscription Jan 2025         │
│   Trailer                      EPD                           │
│   Bill Information             (optional structured data)    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Reference Number Types

#### QRR (QR-Reference) - 27 digits
- Used with QR-IBAN accounts
- Last digit is Mod-10 recursive checksum
- Structure: Customer number (optional) + Invoice reference + Check digit

```typescript
// QRR Reference Example: 21 00000 00003 13947 14300 09017
// Check digit calculation: Mod-10 recursive (same as ESR)
```

#### SCOR (Structured Creditor Reference) - ISO 11649
- Max 25 characters: "RF" + 2 check digits + reference (max 21 chars)
- Used with standard IBAN (non-QR-IBAN)

```typescript
// SCOR Example: RF18539007547034
// Check digits calculated via ISO 7064 Mod-97
```

---

## 2. Database Schema Design

### 2.1 New Prisma Models

```prisma
// ============================================
// ENUMS - Complete Invoicing System
// ============================================

// Document Types (like Wave/Invoice Ninja)
enum DocumentType {
  QUOTE           // Estimate/Quote - non-binding offer
  PROFORMA        // Proforma invoice - pre-payment request
  INVOICE         // Standard invoice - payment request
  CREDIT_NOTE     // Credit memo - refund/adjustment
  RECEIPT         // Payment receipt - confirmation
  DELIVERY_NOTE   // Delivery/shipping document
}

enum InvoiceStatus {
  DRAFT           // Created but not finalized (editable)
  PENDING         // Awaiting approval (for approval workflows)
  APPROVED        // Approved, ready to send
  SENT            // Sent to customer
  VIEWED          // Customer has viewed (client portal)
  PARTIALLY_PAID  // Partial payment received
  PAID            // Fully paid
  OVERDUE         // Past due date, unpaid
  CANCELLED       // Voided/cancelled
  REFUNDED        // Full refund issued
  DISPUTED        // Payment dispute raised
  WRITTEN_OFF     // Bad debt written off
}

// Quote/Estimate specific statuses
enum QuoteStatus {
  DRAFT           // Being prepared
  SENT            // Sent to client
  VIEWED          // Client viewed
  ACCEPTED        // Client accepted
  DECLINED        // Client declined
  EXPIRED         // Past validity date
  CONVERTED       // Converted to invoice
}

enum InvoiceCategory {
  SUBSCRIPTION      // Recurring subscription invoice
  PRODUCT_ORDER     // Marketplace product purchase
  SERVICE_REQUEST   // Service booking
  ONBOARDING_FEE    // Initial setup fee
  PLATFORM_FEE      // Platform usage fee
  CONSULTING        // Consulting/hourly services
  PROJECT           // Project-based billing
  RETAINER          // Retainer/prepaid services
  CUSTOM            // Manual/custom invoice
}

enum RecurringFrequency {
  DAILY
  WEEKLY
  BIWEEKLY          // Every 2 weeks
  MONTHLY
  BIMONTHLY         // Every 2 months
  QUARTERLY         // Every 3 months
  SEMIANNUALLY      // Every 6 months
  ANNUALLY
  CUSTOM            // Custom interval in days
}

enum RecurringStatus {
  ACTIVE            // Actively generating invoices
  PAUSED            // Temporarily paused
  COMPLETED         // Reached end date or max occurrences
  CANCELLED         // Manually cancelled
}

enum DiscountType {
  PERCENTAGE        // e.g., 10% off
  FIXED_AMOUNT      // e.g., CHF 50 off
}

enum ReferenceType {
  QRR   // QR-Reference (27 digits, Mod-10)
  SCOR  // Structured Creditor Reference (ISO 11649)
  NON   // No reference
}

enum AddressType {
  STRUCTURED  // S - Separate fields
  COMBINED    // K - Combined address lines
}

enum PaymentTerms {
  DUE_ON_RECEIPT    // Payment due immediately
  NET_7             // Due in 7 days
  NET_10            // Due in 10 days
  NET_15            // Due in 15 days
  NET_30            // Due in 30 days (default)
  NET_45            // Due in 45 days
  NET_60            // Due in 60 days
  NET_90            // Due in 90 days
  CUSTOM            // Custom due date
}

enum ReminderType {
  BEFORE_DUE        // Reminder before due date
  ON_DUE            // Reminder on due date
  AFTER_DUE         // Overdue reminder
  FINAL_NOTICE      // Final notice before collection
}

// ============================================
// CORE INVOICE MODELS (Full-Featured)
// ============================================

model Invoice {
  id                String          @id @default(uuid())
  
  // Document Identification
  documentType      DocumentType    @default(INVOICE)
  invoiceNumber     String          @unique
  referenceNumber   String          // QRR or SCOR reference for payment
  referenceType     ReferenceType   @default(QRR)
  poNumber          String?         // Customer's purchase order number
  
  // Type & Status
  category          InvoiceCategory
  status            InvoiceStatus   @default(DRAFT)
  
  // Parties (Creditor = Issuer, Debtor = Recipient)
  issuerOrgId       String
  issuerOrg         Organization    @relation("IssuedInvoices", fields: [issuerOrgId], references: [id])
  recipientOrgId    String
  recipientOrg      Organization    @relation("ReceivedInvoices", fields: [recipientOrgId], references: [id])
  // Optional: Bill to different contact
  recipientContactId String?
  recipientContact  User?           @relation("InvoiceRecipientContact", fields: [recipientContactId], references: [id])
  createdById       String
  createdBy         User            @relation("CreatedInvoices", fields: [createdById], references: [id])
  approvedById      String?
  approvedBy        User?           @relation("ApprovedInvoices", fields: [approvedById], references: [id])
  
  // ============================================
  // AMOUNTS (all in minor units - centimes)
  // ============================================
  subtotalAmount    Int             // Sum of line items before discounts
  
  // Discount (Invoice-Level)
  discountType      DiscountType?
  discountValue     Decimal?        @db.Decimal(10, 2) // Percentage or fixed amount
  discountAmount    Int             @default(0) // Calculated discount in centimes
  
  // After discount, before tax
  netAmount         Int             // subtotalAmount - discountAmount
  
  // Tax
  taxAmount         Int             // Total tax amount
  
  // Final
  totalAmount       Int             // netAmount + taxAmount
  
  // Payment tracking
  paidAmount        Int             @default(0)
  balanceDue        Int             // totalAmount - paidAmount (computed or stored)
  
  // Deposits/Advances
  depositRequired   Boolean         @default(false)
  depositPercent    Decimal?        @db.Decimal(5, 2) // e.g., 30% deposit
  depositAmount     Int?            // Fixed deposit amount if not percentage
  depositPaid       Boolean         @default(false)
  depositPaidDate   DateTime?
  
  // Currency
  currency          String          @default("CHF") // CHF or EUR
  exchangeRate      Decimal?        @db.Decimal(10, 6) // If converted from another currency
  
  // ============================================
  // TAX INFORMATION
  // ============================================
  taxRate           Decimal?        @db.Decimal(5, 2) // Default tax rate (e.g., 8.10 for 8.1%)
  taxNumber         String?         // Issuer's VAT registration number
  taxExempt         Boolean         @default(false)
  taxExemptReason   String?         // Reason for tax exemption
  
  // ============================================
  // DATES (Complete Date Management)
  // ============================================
  // Document dates
  issueDate         DateTime        // When invoice was issued
  dueDate           DateTime        // Payment due date
  
  // Service period (for subscriptions/services)
  servicePeriodStart DateTime?      // Service period from
  servicePeriodEnd   DateTime?      // Service period to
  
  // Payment dates
  paidDate          DateTime?       // When fully paid
  lastPaymentDate   DateTime?       // Most recent payment
  
  // Sending/viewing
  sentDate          DateTime?       // When sent to customer
  viewedDate        DateTime?       // When customer first viewed (client portal)
  
  // Approval workflow
  approvedDate      DateTime?
  
  // ============================================
  // PAYMENT TERMS
  // ============================================
  paymentTerms      PaymentTerms    @default(NET_30)
  paymentTermsDays  Int             @default(30)
  paymentInstructions String?       // Custom payment instructions
  
  // Late fees
  lateFeeEnabled    Boolean         @default(false)
  lateFeeType       DiscountType?   // PERCENTAGE or FIXED_AMOUNT
  lateFeeValue      Decimal?        @db.Decimal(10, 2)
  lateFeeGraceDays  Int             @default(0) // Days after due date before late fee
  lateFeeApplied    Boolean         @default(false)
  lateFeeAmount     Int             @default(0)
  
  // ============================================
  // QR-BILL SPECIFIC (Swiss Compliance)
  // ============================================
  qrPayloadRaw      String?         // Full QR code payload for verification
  qrPayloadHash     String?         // SHA-256 hash for integrity
  
  // ============================================
  // CONTENT & MESSAGING
  // ============================================
  title             String?         // Custom document title
  introText         String?         // Text above line items (header message)
  footerText        String?         // Text below totals (footer message)
  termsAndConditions String?        // Terms & conditions
  messageToRecipient String?        // Unstructured message for QR-bill (max 140 chars)
  internalNotes     String?         // Internal-only notes (not shown to customer)
  
  // ============================================
  // TEMPLATE & BRANDING
  // ============================================
  templateId        String?
  template          InvoiceTemplate? @relation(fields: [templateId], references: [id])
  
  // ============================================
  // LINKED DOCUMENTS & ASSETS
  // ============================================
  pdfAssetId        String?         @unique
  pdfAsset          Asset?          @relation("InvoicePDF", fields: [pdfAssetId], references: [id])
  
  // Document chain (for credit notes, receipts linking back to invoice)
  parentInvoiceId   String?
  parentInvoice     Invoice?        @relation("InvoiceChain", fields: [parentInvoiceId], references: [id])
  childDocuments    Invoice[]       @relation("InvoiceChain")
  
  // Quote conversion tracking
  sourceQuoteId     String?
  sourceQuote       Quote?          @relation(fields: [sourceQuoteId], references: [id])
  
  // Recurring invoice source
  recurringInvoiceId String?
  recurringInvoice  RecurringInvoice? @relation(fields: [recurringInvoiceId], references: [id])
  
  // ============================================
  // RELATED BUSINESS ENTITIES
  // ============================================
  subscriptionId    String?
  subscription      Subscription?   @relation(fields: [subscriptionId], references: [id])
  orderId           String?
  order             Order?          @relation(fields: [orderId], references: [id])
  
  // ============================================
  // CLIENT PORTAL
  // ============================================
  clientPortalToken String?         @unique // Unique token for client portal access
  clientPortalExpiry DateTime?      // When token expires
  allowOnlinePayment Boolean        @default(true)
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // ============================================
  // RELATIONS
  // ============================================
  lineItems         InvoiceLine[]
  payments          InvoicePayment[]
  taxBreakdown      InvoiceTax[]    // Multiple tax rates support
  reminders         InvoiceReminder[]
  auditLogs         InvoiceAuditLog[]
  attachments       InvoiceAttachment[]
  
  @@index([invoiceNumber])
  @@index([documentType])
  @@index([issuerOrgId])
  @@index([recipientOrgId])
  @@index([status])
  @@index([issueDate])
  @@index([dueDate])
  @@index([referenceNumber])
  @@index([clientPortalToken])
  
  @@map("invoices")
}

model InvoiceLine {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Line Item Details
  position        Int       // Display order (1, 2, 3...)
  itemCode        String?   // SKU/Item code
  description     String
  descriptionDe   String?   // German translation
  descriptionFr   String?   // French translation
  descriptionIt   String?   // Italian translation
  
  // Quantity & Unit
  quantity        Decimal   @db.Decimal(10, 3) // e.g., 1.000, 2.500
  unit            String?   // e.g., "hours", "pieces", "licenses", "months"
  
  // Pricing (in minor units - centimes)
  unitPrice       Int       // Price per unit
  
  // Line-Level Discount
  discountType    DiscountType?
  discountValue   Decimal?  @db.Decimal(10, 2)
  discountAmount  Int       @default(0)
  
  // Amounts
  subtotalPrice   Int       // quantity * unitPrice
  netPrice        Int       // subtotalPrice - discountAmount
  totalPrice      Int       // netPrice + taxAmount
  
  // Tax per Line (supports multiple tax rates)
  taxRateId       String?
  taxRate         TaxRate?  @relation(fields: [taxRateId], references: [id])
  taxPercent      Decimal?  @db.Decimal(5, 2)
  taxAmount       Int       @default(0)
  taxExempt       Boolean   @default(false)
  
  // Date range (for services/subscriptions)
  periodStart     DateTime?
  periodEnd       DateTime?
  
  // Reference to source entity
  productId       String?
  serviceId       String?
  subscriptionPlanId String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([invoiceId])
  @@map("invoice_lines")
}

// Multiple tax rates per invoice (for mixed-rate invoices)
model InvoiceTax {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  taxRateId       String?
  taxRate         TaxRate?  @relation(fields: [taxRateId], references: [id])
  
  taxName         String    // e.g., "VAT 8.1%", "Reduced VAT 2.6%"
  taxPercent      Decimal   @db.Decimal(5, 2)
  taxableAmount   Int       // Amount this tax applies to
  taxAmount       Int       // Calculated tax
  
  @@index([invoiceId])
  @@map("invoice_taxes")
}

// Tax Rate Configuration
model TaxRate {
  id              String    @id @default(uuid())
  organizationId  String?   // null = system default
  organization    Organization? @relation(fields: [organizationId], references: [id])
  
  name            String    // e.g., "Standard VAT", "Reduced Rate"
  nameDe          String?
  nameFr          String?
  nameIt          String?
  
  rate            Decimal   @db.Decimal(5, 2) // e.g., 8.10
  isDefault       Boolean   @default(false)
  isActive        Boolean   @default(true)
  
  // Swiss-specific rates
  // Standard: 8.1%, Reduced: 2.6%, Accommodation: 3.8%
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  invoiceLines    InvoiceLine[]
  invoiceTaxes    InvoiceTax[]
  
  @@index([organizationId])
  @@map("tax_rates")
}

model InvoicePayment {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Payment Details
  amount          Int       // Amount paid in minor units
  currency        String    @default("CHF")
  paymentDate     DateTime
  paymentMethod   String    // bank_transfer, stripe, manual, cash, check, etc.
  transactionRef  String?   // Bank reference or Stripe payment ID
  
  // Payment categorization
  isDeposit       Boolean   @default(false) // Is this a deposit/advance payment?
  isRefund        Boolean   @default(false) // Is this a refund?
  
  // Stripe Integration
  stripePaymentId String?
  stripeRefundId  String?
  
  // Bank transfer details
  bankReference   String?   // Reference from bank statement
  senderIban      String?   // Sender's IBAN if known
  
  // Metadata
  notes           String?
  receiptNumber   String?   // Generated receipt number
  recordedById    String?
  recordedBy      User?     @relation(fields: [recordedById], references: [id])
  
  createdAt       DateTime  @default(now())
  
  @@index([invoiceId])
  @@index([paymentDate])
  @@index([stripePaymentId])
  @@map("invoice_payments")
}

model InvoiceReminder {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  reminderType    ReminderType
  scheduledDate   DateTime
  sentDate        DateTime?
  
  // Email details
  emailSent       Boolean   @default(false)
  emailTo         String?
  emailSubject    String?
  emailBody       String?
  
  // Response tracking
  opened          Boolean   @default(false)
  openedAt        DateTime?
  clicked         Boolean   @default(false)
  clickedAt       DateTime?
  
  createdAt       DateTime  @default(now())
  
  @@index([invoiceId])
  @@index([scheduledDate])
  @@map("invoice_reminders")
}

model InvoiceAttachment {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  assetId         String
  asset           Asset     @relation(fields: [assetId], references: [id])
  
  fileName        String
  fileType        String
  fileSize        Int
  description     String?
  
  createdAt       DateTime  @default(now())
  
  @@index([invoiceId])
  @@map("invoice_attachments")
}

model InvoiceAuditLog {
  id          String    @id @default(uuid())
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  action      String    // created, updated, issued, sent, viewed, paid, cancelled, etc.
  changes     Json?     // Before/after snapshot
  metadata    Json?     // Additional context (IP, user agent, etc.)
  
  performedById String?
  performedBy User?     @relation(fields: [performedById], references: [id])
  performedAt DateTime  @default(now())
  
  ipAddress   String?
  userAgent   String?
  
  @@index([invoiceId])
  @@index([performedAt])
  @@index([action])
  @@map("invoice_audit_logs")
}

// ============================================
// INVOICE SNAPSHOTS (Swiss Compliance)
// Immutable point-in-time records for audit/legal
// ============================================

model InvoiceSnapshot {
  id          String    @id @default(uuid())
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Snapshot trigger
  reason      String    // "finalized", "sent", "status_change", "payment_received"
  
  // Complete invoice state at this point
  snapshot    Json      // Full serialized invoice with all relations
  
  // Hash for integrity verification
  snapshotHash String   // SHA-256 of snapshot JSON
  
  // Metadata
  createdById String?
  createdBy   User?     @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  
  @@index([invoiceId, createdAt])
  @@index([reason])
  @@map("invoice_snapshots")
}

// ============================================
// QUOTES / ESTIMATES
// ============================================

model Quote {
  id              String      @id @default(uuid())
  
  // Identification
  quoteNumber     String      @unique
  title           String?
  
  // Status
  status          QuoteStatus @default(DRAFT)
  
  // Parties
  issuerOrgId     String
  issuerOrg       Organization @relation("IssuedQuotes", fields: [issuerOrgId], references: [id])
  recipientOrgId  String
  recipientOrg    Organization @relation("ReceivedQuotes", fields: [recipientOrgId], references: [id])
  createdById     String
  createdBy       User        @relation("CreatedQuotes", fields: [createdById], references: [id])
  
  // Amounts (centimes)
  subtotalAmount  Int
  discountType    DiscountType?
  discountValue   Decimal?    @db.Decimal(10, 2)
  discountAmount  Int         @default(0)
  netAmount       Int
  taxAmount       Int
  totalAmount     Int
  currency        String      @default("CHF")
  
  // Dates
  issueDate       DateTime
  validUntil      DateTime    // Quote expiry date
  acceptedDate    DateTime?
  declinedDate    DateTime?
  
  // Content
  introText       String?
  footerText      String?
  termsAndConditions String?
  internalNotes   String?
  
  // Template
  templateId      String?
  
  // Conversion tracking
  convertedToInvoices Invoice[]
  
  // PDF
  pdfAssetId      String?     @unique
  pdfAsset        Asset?      @relation("QuotePDF", fields: [pdfAssetId], references: [id])
  
  // Client portal
  clientPortalToken String?   @unique
  
  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  lineItems       QuoteLine[]
  
  @@index([quoteNumber])
  @@index([issuerOrgId])
  @@index([recipientOrgId])
  @@index([status])
  @@map("quotes")
}

model QuoteLine {
  id              String    @id @default(uuid())
  quoteId         String
  quote           Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  position        Int
  itemCode        String?
  description     String
  quantity        Decimal   @db.Decimal(10, 3)
  unit            String?
  unitPrice       Int
  discountType    DiscountType?
  discountValue   Decimal?  @db.Decimal(10, 2)
  discountAmount  Int       @default(0)
  taxPercent      Decimal?  @db.Decimal(5, 2)
  taxAmount       Int       @default(0)
  totalPrice      Int
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([quoteId])
  @@map("quote_lines")
}

// ============================================
// RECURRING INVOICES
// ============================================

model RecurringInvoice {
  id              String            @id @default(uuid())
  
  // Identification
  name            String            // Display name for this recurring invoice
  
  // Status
  status          RecurringStatus   @default(ACTIVE)
  
  // Parties
  issuerOrgId     String
  issuerOrg       Organization      @relation("IssuedRecurring", fields: [issuerOrgId], references: [id])
  recipientOrgId  String
  recipientOrg    Organization      @relation("ReceivedRecurring", fields: [recipientOrgId], references: [id])
  createdById     String
  createdBy       User              @relation("CreatedRecurring", fields: [createdById], references: [id])
  
  // Schedule
  frequency       RecurringFrequency
  customDays      Int?              // For CUSTOM frequency: interval in days
  dayOfMonth      Int?              // 1-28 for monthly (use 28 to avoid month-end issues)
  dayOfWeek       Int?              // 0-6 for weekly (0 = Sunday)
  
  // Date range
  startDate       DateTime
  endDate         DateTime?         // Optional end date
  maxOccurrences  Int?              // Optional max number of invoices
  
  // Tracking
  lastGeneratedDate DateTime?
  nextGenerationDate DateTime?
  occurrenceCount Int               @default(0)
  
  // Failure/Retry Tracking (for reliability)
  lastGenerationError   String?     // Last error message if failed
  lastGenerationAttempt DateTime?   // When last attempt was made
  failureCount          Int         @default(0) // Consecutive failures
  pausedDueToFailure    Boolean     @default(false)
  
  // Invoice template
  category        InvoiceCategory
  paymentTerms    PaymentTerms      @default(NET_30)
  paymentTermsDays Int              @default(30)
  
  // Amounts (template)
  subtotalAmount  Int
  discountType    DiscountType?
  discountValue   Decimal?          @db.Decimal(10, 2)
  discountAmount  Int               @default(0)
  taxAmount       Int
  totalAmount     Int
  currency        String            @default("CHF")
  
  // Content template
  title           String?
  introText       String?
  footerText      String?
  messageToRecipient String?
  
  // Options
  autoSend        Boolean           @default(false) // Auto-send when generated
  sendDaysBefore  Int               @default(0)     // Days before due date to send
  
  // Timestamps
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  lineItems       RecurringInvoiceLine[]
  generatedInvoices Invoice[]
  
  @@index([issuerOrgId])
  @@index([recipientOrgId])
  @@index([status])
  @@index([nextGenerationDate])
  @@map("recurring_invoices")
}

model RecurringInvoiceLine {
  id                  String          @id @default(uuid())
  recurringInvoiceId  String
  recurringInvoice    RecurringInvoice @relation(fields: [recurringInvoiceId], references: [id], onDelete: Cascade)
  
  position            Int
  itemCode            String?
  description         String
  quantity            Decimal         @db.Decimal(10, 3)
  unit                String?
  unitPrice           Int
  discountType        DiscountType?
  discountValue       Decimal?        @db.Decimal(10, 2)
  discountAmount      Int             @default(0)
  taxPercent          Decimal?        @db.Decimal(5, 2)
  taxAmount           Int             @default(0)
  totalPrice          Int
  
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  @@index([recurringInvoiceId])
  @@map("recurring_invoice_lines")
}

// ============================================
// INVOICE TEMPLATES (Branding)
// ============================================

model InvoiceTemplate {
  id              String    @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  name            String
  isDefault       Boolean   @default(false)
  
  // Branding
  logoAssetId     String?
  primaryColor    String?   // Hex color
  secondaryColor  String?
  fontFamily      String?   @default("Helvetica")
  
  // Layout options
  showLogo        Boolean   @default(true)
  showQrBill      Boolean   @default(true)
  showPaymentInfo Boolean   @default(true)
  showTerms       Boolean   @default(true)
  
  // Default text content
  defaultIntroText String?
  defaultFooterText String?
  defaultTerms    String?
  
  // Localization defaults
  defaultLanguage String    @default("de") // de, fr, it, en
  
  // Paper settings
  paperSize       String    @default("A4")
  marginTop       Int       @default(20)    // mm
  marginBottom    Int       @default(20)
  marginLeft      Int       @default(20)
  marginRight     Int       @default(20)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  invoices        Invoice[]
  
  @@index([organizationId])
  @@map("invoice_templates")
}

// ============================================
// BANKING CONFIGURATION
// ============================================

model OrganizationBankAccount {
  id              String       @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Account Details
  accountName     String       // Display name for this account
  iban            String       // Full IBAN (validated)
  isQrIban        Boolean      @default(false) // QR-IBAN vs regular IBAN
  bic             String?      // SWIFT/BIC code (optional)
  bankName        String?
  bankAddress     String?
  
  // Creditor Information (for QR-bill)
  creditorName    String       // Legal name (max 70 chars)
  creditorAddressType AddressType @default(STRUCTURED)
  creditorStreet  String?
  creditorBuildingNumber String?
  creditorPostalCode String
  creditorCity    String
  creditorCountry String       @default("CH")
  
  // Reference Configuration
  defaultReferenceType ReferenceType @default(QRR)
  qrrCustomerNumber   String?    // For QRR: optional customer number prefix
  
  // Status
  isDefault       Boolean      @default(false)
  isActive        Boolean      @default(true)
  
  // Verification
  verifiedAt      DateTime?
  verifiedBy      String?
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@unique([organizationId, iban])
  @@index([organizationId])
  @@index([isDefault])
  @@map("organization_bank_accounts")
}

model InvoiceNumberSequence {
  id              String       @id @default(uuid())
  organizationId  String       @unique
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Sequence Configuration
  prefix          String       @default("INV") // e.g., "INV", "RE", "RECH"
  currentNumber   Int          @default(0)
  year            Int          // Reset per year if desired
  format          String       @default("{prefix}-{year}-{number:5}") // e.g., INV-2025-00001
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@map("invoice_number_sequences")
}
```

### 2.2 Organization Model Extensions

```prisma
// Add to existing Organization model:

model Organization {
  // ... existing fields ...
  
  // New relations for invoicing
  issuedInvoices      Invoice[]               @relation("IssuedInvoices")
  receivedInvoices    Invoice[]               @relation("ReceivedInvoices")
  bankAccounts        OrganizationBankAccount[]
  invoiceSequence     InvoiceNumberSequence?
  
  // Billing address (if different from main address)
  billingAddressLine1 String?
  billingAddressLine2 String?
  billingPostalCode   String?
  billingCity         String?
  billingCountry      String?     @default("CH")
  
  // Tax information
  vatNumber           String?     // e.g., CHE-123.456.789 MWST
  
  // ... existing relations ...
}
```

### 2.3 Asset Model Extension

```prisma
enum AssetKind {
  // ... existing values ...
  INVOICE_PDF     // Generated invoice PDFs
  QR_CODE_IMAGE   // QR code images (if stored separately)
}
```

---

## 3. Recurring Invoices & Automation

### 3.1 Recurring Invoice Scheduling

The system supports flexible recurring invoice generation similar to Wave Apps and Invoice Ninja:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECURRING INVOICE WORKFLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATE RECURRING TEMPLATE                                    │
│     ├── Set frequency (daily/weekly/monthly/yearly/custom)       │
│     ├── Define line items                                        │
│     ├── Set payment terms                                        │
│     └── Configure auto-send options                              │
│                                                                  │
│  2. SCHEDULER RUNS (cron job)                                    │
│     ├── Check nextGenerationDate for all ACTIVE templates        │
│     ├── Generate draft invoices                                  │
│     ├── Calculate service period dates                           │
│     └── Update occurrence count and next date                    │
│                                                                  │
│  3. AUTO-ACTIONS (optional)                                      │
│     ├── Auto-finalize to ISSUED status                           │
│     ├── Generate PDF with QR-bill                                │
│     ├── Send email to customer                                   │
│     └── Create payment reminders                                 │
│                                                                  │
│  4. END CONDITIONS                                               │
│     ├── Reached endDate                                          │
│     ├── Reached maxOccurrences                                   │
│     ├── Manually paused/cancelled                                │
│     └── Recipient organization deactivated                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Recurring Invoice Service

```typescript
// api/src/invoicing/recurring/recurring-invoice.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicingService } from '../invoicing.service';
import { EmailNotificationService } from '../../email-notification/email-notification.service';
import { RecurringFrequency, RecurringStatus } from '@prisma/client';
import { DateTime } from 'luxon'; // Add luxon for timezone handling

// Maximum consecutive failures before auto-pausing
const MAX_FAILURE_COUNT = 3;

@Injectable()
export class RecurringInvoiceService {
  private readonly logger = new Logger(RecurringInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicingService: InvoicingService,
    private readonly emailService: EmailNotificationService,
  ) {}

  /**
   * Runs every day at 2:00 AM Swiss time (CET/CEST)
   * Uses explicit timezone to ensure consistency
   */
  @Cron('0 2 * * *', { timeZone: 'Europe/Zurich' })
  async processRecurringInvoices() {
    this.logger.log('Processing recurring invoices (Swiss timezone)...');
    
    // Use explicit Swiss timezone for date comparison
    const today = DateTime.now()
      .setZone('Europe/Zurich')
      .startOf('day')
      .toJSDate();
    
    const dueTemplates = await this.prisma.recurringInvoice.findMany({
      where: {
        status: RecurringStatus.ACTIVE,
        pausedDueToFailure: false,
        nextGenerationDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
      },
      include: {
        lineItems: true,
        issuerOrg: { include: { bankAccounts: true } },
        recipientOrg: true,
      },
    });

    this.logger.log(`Found ${dueTemplates.length} recurring invoices to process`);

    for (const template of dueTemplates) {
      try {
        // Check max occurrences
        if (template.maxOccurrences && template.occurrenceCount >= template.maxOccurrences) {
          await this.markAsCompleted(template.id);
          continue;
        }

        // Generate invoice from template
        const invoice = await this.generateInvoiceFromTemplate(template);
        
        // Success: Update template and reset failure count
        await this.prisma.recurringInvoice.update({
          where: { id: template.id },
          data: {
            lastGeneratedDate: new Date(),
            nextGenerationDate: this.calculateNextDate(template),
            occurrenceCount: { increment: 1 },
            // Reset failure tracking on success
            failureCount: 0,
            lastGenerationError: null,
            lastGenerationAttempt: new Date(),
          },
        });

        // Auto-send if configured
        if (template.autoSend) {
          await this.invoicingService.issueAndSendInvoice(invoice.id);
        }

        this.logger.log(`Generated invoice ${invoice.invoiceNumber} from recurring ${template.id}`);
      } catch (error) {
        // Handle failure with retry tracking
        await this.handleGenerationFailure(template, error);
      }
    }
  }

  /**
   * Handle recurring invoice generation failure
   * Tracks failures and auto-pauses after MAX_FAILURE_COUNT
   */
  private async handleGenerationFailure(template: any, error: Error) {
    const newFailureCount = (template.failureCount || 0) + 1;
    const shouldPause = newFailureCount >= MAX_FAILURE_COUNT;

    this.logger.error(
      `Failed to process recurring invoice ${template.id} (attempt ${newFailureCount}):`,
      error.message,
    );

    await this.prisma.recurringInvoice.update({
      where: { id: template.id },
      data: {
        failureCount: newFailureCount,
        lastGenerationError: error.message,
        lastGenerationAttempt: new Date(),
        pausedDueToFailure: shouldPause,
      },
    });

    // Notify admin if paused due to failures
    if (shouldPause) {
      await this.notifyAdminOfRecurringFailure(template, error);
    }
  }

  /**
   * Notify administrators about recurring invoice failure
   */
  private async notifyAdminOfRecurringFailure(template: any, error: Error) {
    this.logger.warn(
      `Recurring invoice ${template.id} paused after ${MAX_FAILURE_COUNT} failures`,
    );

    await this.emailService.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@procreche.ch',
      template: 'recurring_invoice_failure',
      data: {
        templateId: template.id,
        templateName: template.name,
        issuerOrg: template.issuerOrg.name,
        recipientOrg: template.recipientOrg.name,
        failureCount: MAX_FAILURE_COUNT,
        lastError: error.message,
      },
    });
  }

  /**
   * Calculate the next generation date based on frequency
   * Uses Luxon for timezone-safe date math (avoids DST drift issues)
   */
  calculateNextDate(template: {
    frequency: RecurringFrequency;
    customDays?: number | null;
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    nextGenerationDate: Date | null;
  }): Date {
    // Use Luxon with explicit Swiss timezone for DST-safe calculations
    const base = template.nextGenerationDate
      ? DateTime.fromJSDate(template.nextGenerationDate, { zone: 'Europe/Zurich' })
      : DateTime.now().setZone('Europe/Zurich');

    let next: DateTime;

    switch (template.frequency) {
      case 'DAILY':
        next = base.plus({ days: 1 });
        break;
      case 'WEEKLY':
        next = base.plus({ weeks: 1 });
        break;
      case 'BIWEEKLY':
        next = base.plus({ weeks: 2 });
        break;
      case 'MONTHLY':
        next = base.plus({ months: 1 });
        // If specific day of month is set, adjust (clamped to month's last day)
        if (template.dayOfMonth) {
          const lastDay = next.daysInMonth;
          const targetDay = Math.min(template.dayOfMonth, lastDay);
          next = next.set({ day: targetDay });
        }
        break;
      case 'BIMONTHLY':
        next = base.plus({ months: 2 });
        break;
      case 'QUARTERLY':
        next = base.plus({ months: 3 });
        break;
      case 'SEMIANNUALLY':
        next = base.plus({ months: 6 });
        break;
      case 'ANNUALLY':
        next = base.plus({ years: 1 });
        break;
      case 'CUSTOM':
        next = base.plus({ days: template.customDays || 30 });
        break;
      default:
        next = base.plus({ months: 1 }); // Default to monthly
    }

    // Return as JS Date at start of day (Swiss time)
    return next.startOf('day').toJSDate();
  }

  private async markAsCompleted(templateId: string) {
    await this.prisma.recurringInvoice.update({
      where: { id: templateId },
      data: { status: RecurringStatus.COMPLETED },
    });
  }

  private async generateInvoiceFromTemplate(template: any) {
    // Implementation creates invoice from template
    // Returns the created invoice
  }
}
```

### 3.3 Service Period Calculation

For subscription-based recurring invoices, the system automatically calculates service periods:

```typescript
/**
 * Calculate service period for recurring invoice
 */
function calculateServicePeriod(
  frequency: RecurringFrequency,
  generationDate: Date,
): { start: Date; end: Date } {
  const start = new Date(generationDate);
  const end = new Date(generationDate);

  switch (frequency) {
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1); // Last day of period
      break;
    case 'QUARTERLY':
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case 'ANNUALLY':
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
    // ... other frequencies
  }

  return { start, end };
}
```

---

## 4. Document Types & Workflow

### 4.1 Document Type Lifecycle

The system supports a complete document lifecycle similar to professional invoicing software:

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOCUMENT WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐                                                    │
│   │  QUOTE  │  (Estimate/Proposal)                               │
│   └────┬────┘                                                    │
│        │ Customer accepts                                        │
│        ▼                                                         │
│   ┌──────────┐                                                   │
│   │ PROFORMA │  (Optional: Request deposit/prepayment)           │
│   └────┬─────┘                                                   │
│        │ Deposit received (or skip)                              │
│        ▼                                                         │
│   ┌─────────┐                                                    │
│   │ INVOICE │  (Official payment request)                        │
│   └────┬────┘                                                    │
│        │                                                         │
│        ├─────────────────┐                                       │
│        │                 │                                       │
│        ▼                 ▼                                       │
│   ┌─────────┐      ┌─────────────┐                               │
│   │ RECEIPT │      │ CREDIT NOTE │                               │
│   └─────────┘      └─────────────┘                               │
│   (Payment         (Refund/                                      │
│    confirmation)    Adjustment)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Document Type Definitions

| Document Type | Purpose | Has QR-Bill | Affects Balance |
|--------------|---------|-------------|-----------------|
| **Quote** | Non-binding offer/estimate | No | No |
| **Proforma** | Pre-payment request (not tax invoice) | Yes | No (informational) |
| **Invoice** | Official payment request | Yes | Yes (+) |
| **Credit Note** | Refund or adjustment | Optional | Yes (-) |
| **Receipt** | Payment confirmation | No | No |
| **Delivery Note** | Proof of delivery | No | No |

### 4.3 Invoice Status Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                      INVOICE STATUS FLOW                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌───────┐                                                       │
│   │ DRAFT │◄──────────────────────────────────────┐               │
│   └───┬───┘                                        │               │
│       │ Finalize                                   │ Revert       │
│       ▼                                            │ (Admin)      │
│   ┌─────────┐                                      │               │
│   │ PENDING │ ─── Approval workflow (optional) ────┤               │
│   └────┬────┘                                      │               │
│        │ Approve                                   │               │
│        ▼                                           │               │
│   ┌──────────┐                                     │               │
│   │ APPROVED │                                     │               │
│   └────┬─────┘                                     │               │
│        │ Send                                      │               │
│        ▼                                           │               │
│   ┌──────┐                                         │               │
│   │ SENT │                                         │               │
│   └───┬──┘                                         │               │
│       │ Customer views (client portal)             │               │
│       ▼                                            │               │
│   ┌────────┐                                       │               │
│   │ VIEWED │                                       │               │
│   └───┬────┘                                       │               │
│       │                                            │               │
│       ├──────────────────────┐                     │               │
│       │                      │                     │               │
│       ▼                      ▼                     │               │
│   ┌────────────────┐    ┌─────────┐               │               │
│   │ PARTIALLY_PAID │    │ OVERDUE │ ──────────────┼───┐           │
│   └───────┬────────┘    └────┬────┘               │   │           │
│           │                  │                     │   │           │
│           │ Full payment     │ Payment received    │   │           │
│           ▼                  ▼                     │   │           │
│       ┌──────┐                                     │   │           │
│       │ PAID │                                     │   │           │
│       └──────┘                                     │   │           │
│                                                    │   │           │
│   ┌───────────┐                                    │   │           │
│   │ CANCELLED │◄───────────────────────────────────┘   │           │
│   └───────────┘                                        │           │
│                                                        │           │
│   ┌─────────────┐                                      │           │
│   │ WRITTEN_OFF │◄─────────────────────────────────────┘           │
│   └─────────────┘  (Bad debt after collection efforts)             │
│                                                                    │
│   ┌──────────┐                                                     │
│   │ REFUNDED │◄─── Credit note issued + payment returned           │
│   └──────────┘                                                     │
│                                                                    │
│   ┌──────────┐                                                     │
│   │ DISPUTED │◄─── Customer raises dispute                         │
│   └──────────┘                                                     │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Quote to Invoice Conversion

```typescript
// api/src/invoicing/invoicing.service.ts

/**
 * Convert an accepted quote to an invoice
 */
async convertQuoteToInvoice(quoteId: string, userId: string): Promise<Invoice> {
  const quote = await this.prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true },
  });

  if (!quote) {
    throw new NotFoundException('Quote not found');
  }

  if (quote.status !== 'ACCEPTED') {
    throw new BadRequestException('Only accepted quotes can be converted to invoices');
  }

  // Create invoice from quote
  const invoice = await this.prisma.invoice.create({
    data: {
      documentType: 'INVOICE',
      category: 'CUSTOM',
      status: 'DRAFT',
      issuerOrgId: quote.issuerOrgId,
      recipientOrgId: quote.recipientOrgId,
      createdById: userId,
      sourceQuoteId: quote.id,
      
      // Copy amounts
      subtotalAmount: quote.subtotalAmount,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      discountAmount: quote.discountAmount,
      netAmount: quote.netAmount,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      balanceDue: quote.totalAmount,
      currency: quote.currency,
      
      // Copy content
      introText: quote.introText,
      footerText: quote.footerText,
      termsAndConditions: quote.termsAndConditions,
      
      // Set dates
      issueDate: new Date(),
      dueDate: this.calculateDueDate(new Date(), 'NET_30'),
      
      // Generate invoice number
      invoiceNumber: await this.generateInvoiceNumber(quote.issuerOrgId),
      referenceNumber: await this.generateReference(quote.issuerOrgId),
      
      // Copy line items
      lineItems: {
        create: quote.lineItems.map((line, index) => ({
          position: index + 1,
          itemCode: line.itemCode,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          discountAmount: line.discountAmount,
          taxPercent: line.taxPercent,
          taxAmount: line.taxAmount,
          subtotalPrice: line.quantity * line.unitPrice,
          netPrice: line.quantity * line.unitPrice - line.discountAmount,
          totalPrice: line.totalPrice,
        })),
      },
    },
  });

  // Update quote status
  await this.prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'CONVERTED' },
  });

  return invoice;
}
```

### 4.5 Credit Note Generation

```typescript
/**
 * Create a credit note for an existing invoice
 */
async createCreditNote(
  invoiceId: string,
  dto: CreateCreditNoteDto,
  userId: string,
): Promise<Invoice> {
  const originalInvoice = await this.prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });

  if (!originalInvoice) {
    throw new NotFoundException('Invoice not found');
  }

  if (!['PAID', 'PARTIALLY_PAID', 'SENT', 'VIEWED'].includes(originalInvoice.status)) {
    throw new BadRequestException('Can only create credit notes for sent/paid invoices');
  }

  // Calculate credit amount (can be full or partial)
  const creditAmount = dto.fullCredit 
    ? originalInvoice.totalAmount 
    : dto.amount;

  if (creditAmount > originalInvoice.totalAmount) {
    throw new BadRequestException('Credit amount cannot exceed invoice total');
  }

  const creditNote = await this.prisma.invoice.create({
    data: {
      documentType: 'CREDIT_NOTE',
      category: originalInvoice.category,
      status: 'DRAFT',
      issuerOrgId: originalInvoice.issuerOrgId,
      recipientOrgId: originalInvoice.recipientOrgId,
      createdById: userId,
      parentInvoiceId: invoiceId,
      
      // Negative amounts for credit
      subtotalAmount: -dto.subtotalAmount,
      discountAmount: 0,
      netAmount: -dto.netAmount,
      taxAmount: -dto.taxAmount,
      totalAmount: -creditAmount,
      balanceDue: -creditAmount,
      currency: originalInvoice.currency,
      
      title: `Credit Note for ${originalInvoice.invoiceNumber}`,
      internalNotes: dto.reason,
      
      issueDate: new Date(),
      dueDate: new Date(), // Credit notes are immediate
      
      invoiceNumber: await this.generateCreditNoteNumber(originalInvoice.issuerOrgId),
      referenceNumber: await this.generateReference(originalInvoice.issuerOrgId),
      
      // Line items for credit
      lineItems: {
        create: dto.lineItems.map((line, index) => ({
          position: index + 1,
          description: line.description || 'Credit',
          quantity: new Decimal(-line.quantity),
          unitPrice: line.unitPrice,
          subtotalPrice: -line.subtotalPrice,
          netPrice: -line.netPrice,
          taxPercent: line.taxPercent,
          taxAmount: -line.taxAmount,
          totalPrice: -line.totalPrice,
        })),
      },
    },
  });

  // Log audit
  await this.logAudit(invoiceId, 'credit_note_created', {
    creditNoteId: creditNote.id,
    amount: creditAmount,
    reason: dto.reason,
  }, userId);

  return creditNote;
}
```

---

## 5. Backend Module Architecture

### 5.1 Module Structure (Full-Featured)

```
api/src/invoicing/
├── invoicing.module.ts                    # Main module definition
│
├── invoice/
│   ├── invoice.controller.ts              # Invoice REST endpoints
│   ├── invoice.service.ts                 # Core invoice logic
│   └── invoice-number.service.ts          # Number sequence management
│
├── quote/
│   ├── quote.controller.ts                # Quote REST endpoints
│   └── quote.service.ts                   # Quote logic & conversion
│
├── recurring/
│   ├── recurring-invoice.controller.ts
│   ├── recurring-invoice.service.ts       # Recurring template management
│   └── recurring-invoice.scheduler.ts     # Cron job for generation
│
├── payment/
│   ├── payment.controller.ts
│   ├── payment.service.ts                 # Payment recording & refunds
│   └── late-fee.service.ts                # Late fee calculation
│
├── credit-note/
│   ├── credit-note.controller.ts
│   └── credit-note.service.ts             # Credit note generation
│
├── dto/
│   ├── invoice/
│   │   ├── create-invoice.dto.ts
│   │   ├── update-invoice.dto.ts
│   │   ├── invoice-line.dto.ts
│   │   ├── invoice-filter.dto.ts
│   │   └── invoice-response.dto.ts
│   ├── quote/
│   │   ├── create-quote.dto.ts
│   │   └── update-quote.dto.ts
│   ├── payment/
│   │   ├── record-payment.dto.ts
│   │   └── process-refund.dto.ts
│   ├── recurring/
│   │   ├── create-recurring.dto.ts
│   │   └── update-recurring.dto.ts
│   └── bank-account.dto.ts
│
├── qr-bill/
│   ├── qr-bill.service.ts                 # QR payload generation
│   ├── qr-bill.validator.ts               # Full QR-bill validation
│   ├── qr-reference.generator.ts          # QRR/SCOR generation
│   ├── iban.validator.ts                  # Swiss IBAN validation
│   └── interfaces/
│       └── qr-bill.interfaces.ts
│
├── pdf/
│   ├── pdf.service.ts                     # PDF generation orchestration
│   ├── pdf-template.renderer.ts           # HTML→PDF conversion
│   ├── swiss-cross.service.ts             # Swiss cross overlay
│   ├── templates/
│   │   ├── invoice/
│   │   │   ├── invoice-a4.hbs             # Full A4 invoice
│   │   │   ├── invoice-header.hbs
│   │   │   ├── invoice-lines.hbs
│   │   │   └── invoice-footer.hbs
│   │   ├── qr-bill/
│   │   │   ├── qr-slip.hbs                # QR payment slip
│   │   │   └── qr-receipt.hbs             # Receipt section
│   │   ├── quote/
│   │   │   └── quote-a4.hbs
│   │   ├── credit-note/
│   │   │   └── credit-note-a4.hbs
│   │   └── receipt/
│   │       └── payment-receipt.hbs
│   └── assets/
│       ├── swiss-cross.svg
│       ├── fonts/
│       │   └── liberation-sans/
│       └── styles/
│           └── invoice.css
│
├── bank-account/
│   ├── bank-account.controller.ts
│   └── bank-account.service.ts
│
├── template/
│   ├── invoice-template.controller.ts
│   └── invoice-template.service.ts        # Branding templates
│
├── tax-rate/
│   ├── tax-rate.controller.ts
│   └── tax-rate.service.ts                # Tax rate management
│
├── reminder/
│   ├── reminder.controller.ts
│   ├── reminder.service.ts                # Reminder scheduling
│   └── reminder.scheduler.ts              # Cron job for reminders
│
├── client-portal/
│   ├── client-portal.controller.ts        # Public portal endpoints
│   ├── client-portal.service.ts           # Token validation & access
│   └── portal-payment.service.ts          # Online payment processing
│
├── reports/
│   ├── reports.controller.ts
│   └── reports.service.ts                 # Analytics & reporting
│
├── guards/
│   ├── invoice-access.guard.ts            # Role-based access
│   └── portal-token.guard.ts              # Client portal auth
│
├── events/
│   ├── invoice.events.ts                  # Event definitions
│   └── invoice.listener.ts                # Event handlers
│
└── utils/
    ├── amount-calculator.ts               # Discount/tax calculations
    ├── date-calculator.ts                 # Due date calculations
    └── currency-formatter.ts              # Currency formatting
```

### 5.2 Main Module Definition

```typescript
// api/src/invoicing/invoicing.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { InvoiceController } from './invoice/invoice.controller';
import { QuoteController } from './quote/quote.controller';
import { RecurringInvoiceController } from './recurring/recurring-invoice.controller';
import { PaymentController } from './payment/payment.controller';
import { CreditNoteController } from './credit-note/credit-note.controller';
import { BankAccountController } from './bank-account/bank-account.controller';
import { InvoiceTemplateController } from './template/invoice-template.controller';
import { TaxRateController } from './tax-rate/tax-rate.controller';
import { ReminderController } from './reminder/reminder.controller';
import { ClientPortalController } from './client-portal/client-portal.controller';
import { ReportsController } from './reports/reports.controller';

// Services
import { InvoiceService } from './invoice/invoice.service';
import { InvoiceNumberService } from './invoice/invoice-number.service';
import { QuoteService } from './quote/quote.service';
import { RecurringInvoiceService } from './recurring/recurring-invoice.service';
import { RecurringInvoiceScheduler } from './recurring/recurring-invoice.scheduler';
import { PaymentService } from './payment/payment.service';
import { LateFeeService } from './payment/late-fee.service';
import { CreditNoteService } from './credit-note/credit-note.service';
import { BankAccountService } from './bank-account/bank-account.service';
import { InvoiceTemplateService } from './template/invoice-template.service';
import { TaxRateService } from './tax-rate/tax-rate.service';
import { ReminderService } from './reminder/reminder.service';
import { ReminderScheduler } from './reminder/reminder.scheduler';
import { ClientPortalService } from './client-portal/client-portal.service';
import { PortalPaymentService } from './client-portal/portal-payment.service';
import { ReportsService } from './reports/reports.service';

// QR-Bill
import { QrBillService } from './qr-bill/qr-bill.service';
import { QrBillValidator } from './qr-bill/qr-bill.validator';
import { QrReferenceGenerator } from './qr-bill/qr-reference.generator';
import { IbanValidator } from './qr-bill/iban.validator';

// PDF
import { PdfService } from './pdf/pdf.service';
import { PdfTemplateRenderer } from './pdf/pdf-template.renderer';
import { SwissCrossService } from './pdf/swiss-cross.service';

// Events
import { InvoiceEventListener } from './events/invoice.listener';

// Utils
import { AmountCalculator } from './utils/amount-calculator';
import { DateCalculator } from './utils/date-calculator';

// Shared modules
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { BillingModule } from '../billing/billing.module'; // Stripe integration

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    EmailNotificationModule,
    BillingModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    InvoiceController,
    QuoteController,
    RecurringInvoiceController,
    PaymentController,
    CreditNoteController,
    BankAccountController,
    InvoiceTemplateController,
    TaxRateController,
    ReminderController,
    ClientPortalController,
    ReportsController,
  ],
  providers: [
    // Core services
    InvoiceService,
    InvoiceNumberService,
    QuoteService,
    RecurringInvoiceService,
    RecurringInvoiceScheduler,
    PaymentService,
    LateFeeService,
    CreditNoteService,
    BankAccountService,
    InvoiceTemplateService,
    TaxRateService,
    ReminderService,
    ReminderScheduler,
    ClientPortalService,
    PortalPaymentService,
    ReportsService,
    
    // QR-Bill
    QrBillService,
    QrBillValidator,
    QrReferenceGenerator,
    IbanValidator,
    
    // PDF
    PdfService,
    PdfTemplateRenderer,
    SwissCrossService,
    
    // Events
    InvoiceEventListener,
    
    // Utils
    AmountCalculator,
    DateCalculator,
  ],
  exports: [
    InvoiceService,
    QuoteService,
    PaymentService,
    QrBillService,
    PdfService,
    ClientPortalService,
  ],
})
export class InvoicingModule {}
```

---

## 6. Swiss QR-Bill Generation Logic

### 6.1 QR-Bill Service

```typescript
// api/src/invoicing/qr-bill/qr-bill.service.ts
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { QrBillValidator } from './qr-bill.validator';
import { QrReferenceGenerator } from './qr-reference.generator';
import {
  QrBillData,
  QrBillPayload,
  CreditorInfo,
  DebtorInfo,
} from './interfaces/qr-bill.interfaces';

@Injectable()
export class QrBillService {
  // Swiss QR-bill specification constants
  private readonly QR_TYPE = 'SPC';
  private readonly VERSION = '0200';
  private readonly CODING = '1'; // UTF-8
  private readonly TRAILER = 'EPD';
  
  constructor(
    private readonly validator: QrBillValidator,
    private readonly referenceGenerator: QrReferenceGenerator,
  ) {}

  /**
   * Generate the complete QR-bill payload string
   * Following Swiss Payment Standards SPS 2022
   */
  generateQrPayload(data: QrBillData): QrBillPayload {
    // Validate all data before generation
    this.validator.validateQrBillData(data);
    
    const lines: string[] = [];
    
    // Header (3 lines)
    lines.push(this.QR_TYPE);
    lines.push(this.VERSION);
    lines.push(this.CODING);
    
    // Creditor Account (1 line)
    lines.push(data.creditor.iban.replace(/\s/g, '').toUpperCase());
    
    // Creditor (7 lines)
    lines.push(data.creditor.addressType); // S or K
    lines.push(this.truncate(data.creditor.name, 70));
    
    if (data.creditor.addressType === 'S') {
      lines.push(this.truncate(data.creditor.street || '', 70));
      lines.push(this.truncate(data.creditor.buildingNumber || '', 16));
      lines.push(this.truncate(data.creditor.postalCode, 16));
      lines.push(this.truncate(data.creditor.city, 35));
    } else {
      // Combined address (K)
      lines.push(this.truncate(data.creditor.addressLine1 || '', 70));
      lines.push(this.truncate(data.creditor.addressLine2 || '', 70));
      lines.push(''); // Empty for combined
      lines.push(''); // Empty for combined
    }
    lines.push(data.creditor.country);
    
    // Ultimate Creditor (7 lines) - Usually empty
    lines.push(''); // Address type
    lines.push(''); // Name
    lines.push(''); // Street
    lines.push(''); // Building
    lines.push(''); // Postal code
    lines.push(''); // City
    lines.push(''); // Country
    
    // Payment Amount (2 lines)
    if (data.amount !== undefined && data.amount !== null) {
      lines.push(this.formatAmount(data.amount));
    } else {
      lines.push(''); // Empty for amount to be filled by payer
    }
    lines.push(data.currency);
    
    // Debtor (7 lines)
    if (data.debtor) {
      lines.push(data.debtor.addressType);
      lines.push(this.truncate(data.debtor.name, 70));
      
      if (data.debtor.addressType === 'S') {
        lines.push(this.truncate(data.debtor.street || '', 70));
        lines.push(this.truncate(data.debtor.buildingNumber || '', 16));
        lines.push(this.truncate(data.debtor.postalCode, 16));
        lines.push(this.truncate(data.debtor.city, 35));
      } else {
        lines.push(this.truncate(data.debtor.addressLine1 || '', 70));
        lines.push(this.truncate(data.debtor.addressLine2 || '', 70));
        lines.push('');
        lines.push('');
      }
      lines.push(data.debtor.country);
    } else {
      // Empty debtor
      lines.push(''); lines.push(''); lines.push('');
      lines.push(''); lines.push(''); lines.push(''); lines.push('');
    }
    
    // Reference (2 lines)
    lines.push(data.referenceType);
    lines.push(data.reference || '');
    
    // Additional Information (2 lines + optional AV)
    lines.push(this.truncate(data.unstructuredMessage || '', 140));
    lines.push(this.TRAILER);
    
    // Bill Information (optional)
    if (data.billInformation) {
      lines.push(this.truncate(data.billInformation, 140));
    }
    
    // Alternative procedures (optional, up to 2)
    if (data.alternativeProcedures) {
      data.alternativeProcedures.slice(0, 2).forEach(ap => {
        lines.push(this.truncate(ap, 100));
      });
    }
    
    const payloadString = lines.join('\n');
    
    return {
      payload: payloadString,
      hash: this.hashPayload(payloadString),
      qrCodeSize: 46, // mm, Swiss standard
    };
  }

  /**
   * Format amount for QR-bill (max 2 decimal places)
   */
  private formatAmount(amountCentimes: number): string {
    const amount = amountCentimes / 100;
    return amount.toFixed(2);
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLength: number): string {
    if (!str) return '';
    return str.substring(0, maxLength);
  }

  /**
   * Generate SHA-256 hash of payload for integrity verification
   */
  private hashPayload(payload: string): string {
    return createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Parse a QR-bill payload string back into structured data
   * Useful for validation and verification
   */
  parseQrPayload(payload: string): QrBillData | null {
    try {
      const lines = payload.split('\n');
      
      if (lines[0] !== this.QR_TYPE || lines[1] !== this.VERSION) {
        return null;
      }
      
      return {
        creditor: {
          iban: lines[3],
          addressType: lines[4] as 'S' | 'K',
          name: lines[5],
          street: lines[6],
          buildingNumber: lines[7],
          postalCode: lines[8],
          city: lines[9],
          country: lines[10],
        },
        amount: lines[18] ? Math.round(parseFloat(lines[18]) * 100) : undefined,
        currency: lines[19] as 'CHF' | 'EUR',
        debtor: lines[20] ? {
          addressType: lines[20] as 'S' | 'K',
          name: lines[21],
          street: lines[22],
          buildingNumber: lines[23],
          postalCode: lines[24],
          city: lines[25],
          country: lines[26],
        } : undefined,
        referenceType: lines[27] as 'QRR' | 'SCOR' | 'NON',
        reference: lines[28],
        unstructuredMessage: lines[29],
      };
    } catch {
      return null;
    }
  }
}
```

### 6.2 Reference Number Generator

```typescript
// api/src/invoicing/qr-bill/qr-reference.generator.ts
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class QrReferenceGenerator {
  
  /**
   * Generate QRR reference (27 digits with Mod-10 recursive check digit)
   * 
   * Structure: CCCCCC IIIII IIIII IIIII IIIII V
   * - C: Customer number (optional, left-pad with zeros)
   * - I: Invoice/reference number (left-pad with zeros)  
   * - V: Check digit (Mod-10 recursive)
   */
  generateQRR(invoiceNumber: string, customerNumber?: string): string {
    // Clean input: remove non-numeric characters
    const cleanInvoice = invoiceNumber.replace(/\D/g, '');
    const cleanCustomer = (customerNumber || '').replace(/\D/g, '');
    
    // Build 26-digit base (without check digit)
    // Customer: first 6 digits, Invoice: next 20 digits
    const customerPart = cleanCustomer.padStart(6, '0').slice(-6);
    const invoicePart = cleanInvoice.padStart(20, '0').slice(-20);
    
    const base26 = customerPart + invoicePart;
    
    // Calculate Mod-10 recursive check digit
    const checkDigit = this.calculateMod10Recursive(base26);
    
    const reference = base26 + checkDigit;
    
    // Validate length
    if (reference.length !== 27) {
      throw new BadRequestException('Generated QRR reference must be 27 digits');
    }
    
    return reference;
  }

  /**
   * Calculate Mod-10 recursive check digit (same as ESR/ISR)
   * Swiss standard for payment slip references
   */
  private calculateMod10Recursive(input: string): string {
    const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
    let carry = 0;
    
    for (const char of input) {
      const digit = parseInt(char, 10);
      carry = table[(carry + digit) % 10];
    }
    
    return ((10 - carry) % 10).toString();
  }

  /**
   * Validate a QRR reference
   */
  validateQRR(reference: string): boolean {
    const cleaned = reference.replace(/\s/g, '');
    
    if (!/^\d{27}$/.test(cleaned)) {
      return false;
    }
    
    const base = cleaned.slice(0, 26);
    const checkDigit = cleaned.slice(26);
    
    return this.calculateMod10Recursive(base) === checkDigit;
  }

  /**
   * Format QRR reference with spaces for display
   * Format: XX XXXXX XXXXX XXXXX XXXXX XXXXX XX
   */
  formatQRRForDisplay(reference: string): string {
    const cleaned = reference.replace(/\s/g, '');
    return cleaned.replace(/(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})/, '$1 $2 $3 $4 $5 $6');
  }

  /**
   * Generate SCOR reference (ISO 11649 Structured Creditor Reference)
   * Format: RF + 2 check digits + reference (max 21 alphanumeric chars)
   */
  generateSCOR(baseReference: string): string {
    // Clean and validate base reference
    const cleaned = baseReference.replace(/\s/g, '').toUpperCase();
    
    if (cleaned.length > 21) {
      throw new BadRequestException('SCOR base reference cannot exceed 21 characters');
    }
    
    if (!/^[A-Z0-9]+$/.test(cleaned)) {
      throw new BadRequestException('SCOR reference can only contain alphanumeric characters');
    }
    
    // Calculate ISO 7064 Mod-97 check digits
    // 1. Append "RF00" to reference
    // 2. Convert letters to numbers (A=10, B=11, ..., Z=35)
    // 3. Calculate: 98 - (number mod 97)
    
    const withRF = cleaned + 'RF00';
    const numericString = this.convertToNumeric(withRF);
    const checkDigits = (98n - (BigInt(numericString) % 97n)).toString().padStart(2, '0');
    
    return 'RF' + checkDigits + cleaned;
  }

  /**
   * Validate SCOR reference
   */
  validateSCOR(reference: string): boolean {
    const cleaned = reference.replace(/\s/g, '').toUpperCase();
    
    if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(cleaned)) {
      return false;
    }
    
    // Move RF + check digits to end and validate mod 97 = 1
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numericString = this.convertToNumeric(rearranged);
    
    return BigInt(numericString) % 97n === 1n;
  }

  /**
   * Convert alphanumeric string to numeric (for ISO 7064)
   */
  private convertToNumeric(str: string): string {
    return str.split('').map(char => {
      if (/\d/.test(char)) return char;
      return (char.charCodeAt(0) - 55).toString(); // A=10, B=11, etc.
    }).join('');
  }
}
```

### 6.3 IBAN Validator

```typescript
// api/src/invoicing/qr-bill/iban.validator.ts
import { Injectable, BadRequestException } from '@nestjs/common';

export interface IbanValidationResult {
  isValid: boolean;
  isSwiss: boolean;
  isQrIban: boolean;
  formattedIban: string;
  bankCode?: string;
  accountNumber?: string;
  error?: string;
}

@Injectable()
export class IbanValidator {
  
  // Swiss QR-IID range (30000-31999)
  private readonly QR_IID_MIN = 30000;
  private readonly QR_IID_MAX = 31999;

  /**
   * Validate and analyze a Swiss IBAN
   */
  validateSwissIban(iban: string): IbanValidationResult {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic format check - use explicit A-Z0-9 (not \w which includes underscores)
    // Swiss/LI IBAN: 2-letter country + 2 check digits + 5-digit bank code + 12 alphanumeric
    const swissPattern = /^CH\d{2}\d{5}[A-Z0-9]{12}$/;
    const liechtensteinPattern = /^LI\d{2}\d{5}[A-Z0-9]{12}$/;
    
    if (!swissPattern.test(cleaned) && !liechtensteinPattern.test(cleaned)) {
      return {
        isValid: false,
        isSwiss: false,
        isQrIban: false,
        formattedIban: cleaned,
        error: 'Invalid Swiss/Liechtenstein IBAN format. Must be 21 characters (CH/LI + 2 check + 5 bank + 12 account).',
      };
    }
    
    // Mod-97 validation (ISO 7064)
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numericString = this.convertToNumeric(rearranged);
    
    if (BigInt(numericString) % 97n !== 1n) {
      return {
        isValid: false,
        isSwiss: true,
        isQrIban: false,
        formattedIban: this.formatIban(cleaned),
        error: 'IBAN checksum validation failed.',
      };
    }
    
    // Extract bank clearing number (IID) - positions 5-9 (0-indexed: 4-8)
    const iid = parseInt(cleaned.substring(4, 9), 10);
    const isQrIban = iid >= this.QR_IID_MIN && iid <= this.QR_IID_MAX;
    
    return {
      isValid: true,
      isSwiss: true,
      isQrIban,
      formattedIban: this.formatIban(cleaned),
      bankCode: cleaned.substring(4, 9),
      accountNumber: cleaned.substring(9),
    };
  }

  /**
   * Validate that IBAN matches required reference type
   * - QR-IBAN (IID 30000-31999) must use QRR reference
   * - Regular IBAN can use SCOR or NON reference
   */
  validateIbanReferenceCompatibility(
    iban: string,
    referenceType: 'QRR' | 'SCOR' | 'NON',
  ): { valid: boolean; error?: string } {
    const result = this.validateSwissIban(iban);
    
    if (!result.isValid) {
      return { valid: false, error: result.error };
    }
    
    if (result.isQrIban && referenceType !== 'QRR') {
      return {
        valid: false,
        error: 'QR-IBAN accounts (IID 30000-31999) must use QRR reference type.',
      };
    }
    
    if (!result.isQrIban && referenceType === 'QRR') {
      return {
        valid: false,
        error: 'QRR reference type requires a QR-IBAN account (IID 30000-31999). Use SCOR or NON for regular IBAN.',
      };
    }
    
    return { valid: true };
  }

  /**
   * Format IBAN with spaces for display
   */
  formatIban(iban: string): string {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  }

  /**
   * Convert alphanumeric to numeric for Mod-97 calculation
   */
  private convertToNumeric(str: string): string {
    return str.split('').map(char => {
      if (/\d/.test(char)) return char;
      return (char.charCodeAt(0) - 55).toString();
    }).join('');
  }

  /**
   * Get bank name from Swiss clearing number (basic lookup)
   */
  getBankName(iid: string): string | undefined {
    const bankLookup: Record<string, string> = {
      '00230': 'UBS Switzerland AG',
      '00240': 'UBS Switzerland AG',
      '00251': 'UBS Switzerland AG',
      '00778': 'Credit Suisse (Schweiz) AG',
      '00780': 'Credit Suisse (Schweiz) AG',
      '00110': 'Zürcher Kantonalbank',
      '00768': 'PostFinance AG',
      '00769': 'PostFinance AG',
      '00770': 'PostFinance AG',
      '09000': 'PostFinance AG',
      // QR-IIDs (virtual banks for QR payments)
      '30000': 'QR-IID (PostFinance)',
      '30808': 'QR-IID (Raiffeisen)',
      '31000': 'QR-IID (UBS)',
    };
    
    return bankLookup[iid];
  }
}
```

---

## 7. IBAN Validation & Account Setup

### 7.1 Bank Account Service

```typescript
// api/src/invoicing/bank-account/bank-account.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IbanValidator } from '../qr-bill/iban.validator';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dto/bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ibanValidator: IbanValidator,
  ) {}

  /**
   * Create a new bank account for an organization
   */
  async createBankAccount(
    organizationId: string,
    dto: CreateBankAccountDto,
    userId: string,
  ) {
    // Validate IBAN
    const ibanResult = this.ibanValidator.validateSwissIban(dto.iban);
    if (!ibanResult.isValid) {
      throw new BadRequestException(ibanResult.error);
    }

    // Validate IBAN and reference type compatibility
    const compatibility = this.ibanValidator.validateIbanReferenceCompatibility(
      dto.iban,
      dto.defaultReferenceType,
    );
    if (!compatibility.valid) {
      throw new BadRequestException(compatibility.error);
    }

    // Check for duplicate IBAN
    const existing = await this.prisma.organizationBankAccount.findFirst({
      where: {
        organizationId,
        iban: ibanResult.formattedIban.replace(/\s/g, ''),
      },
    });

    if (existing) {
      throw new BadRequestException('This IBAN is already registered for this organization');
    }

    // If this is the first account or marked as default, ensure only one default
    if (dto.isDefault) {
      await this.prisma.organizationBankAccount.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.organizationBankAccount.create({
      data: {
        organizationId,
        accountName: dto.accountName,
        iban: ibanResult.formattedIban.replace(/\s/g, ''),
        isQrIban: ibanResult.isQrIban,
        bic: dto.bic,
        bankName: dto.bankName || this.ibanValidator.getBankName(ibanResult.bankCode!),
        bankAddress: dto.bankAddress,
        creditorName: dto.creditorName,
        creditorAddressType: dto.creditorAddressType || 'STRUCTURED',
        creditorStreet: dto.creditorStreet,
        creditorBuildingNumber: dto.creditorBuildingNumber,
        creditorPostalCode: dto.creditorPostalCode,
        creditorCity: dto.creditorCity,
        creditorCountry: dto.creditorCountry || 'CH',
        defaultReferenceType: dto.defaultReferenceType,
        qrrCustomerNumber: dto.qrrCustomerNumber,
        isDefault: dto.isDefault ?? false,
        isActive: true,
      },
    });
  }

  /**
   * Get all bank accounts for an organization
   */
  async getBankAccounts(organizationId: string) {
    return this.prisma.organizationBankAccount.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get default bank account for an organization
   */
  async getDefaultBankAccount(organizationId: string) {
    const account = await this.prisma.organizationBankAccount.findFirst({
      where: { organizationId, isDefault: true, isActive: true },
    });

    if (!account) {
      // Fall back to first active account
      return this.prisma.organizationBankAccount.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return account;
  }

  /**
   * Verify a bank account (admin action)
   */
  async verifyBankAccount(accountId: string, verifiedById: string) {
    return this.prisma.organizationBankAccount.update({
      where: { id: accountId },
      data: {
        verifiedAt: new Date(),
        verifiedBy: verifiedById,
      },
    });
  }

  /**
   * Set account as default
   */
  async setAsDefault(organizationId: string, accountId: string) {
    // Remove default from all accounts
    await this.prisma.organizationBankAccount.updateMany({
      where: { organizationId },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.organizationBankAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    });
  }
}
```

---

## 8. PDF Generation Pipeline

### 8.1 PDF Service

```typescript
// api/src/invoicing/pdf/pdf.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { Invoice, InvoiceLine, Organization, OrganizationBankAccount } from '@prisma/client';
import { QrBillService } from '../qr-bill/qr-bill.service';
import { UploadService } from '../../upload/upload.service';

interface InvoiceWithRelations extends Invoice {
  lineItems: InvoiceLine[];
  issuerOrg: Organization & { bankAccounts: OrganizationBankAccount[] };
  recipientOrg: Organization;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly qrBillService: QrBillService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Generate complete invoice PDF with QR-bill payment slip
   * Returns the S3/R2 asset URL
   */
  async generateInvoicePdf(invoice: InvoiceWithRelations): Promise<{
    pdfBuffer: Buffer;
    assetUrl: string;
    qrPayload: string;
    qrPayloadHash: string;
  }> {
    const bankAccount = invoice.issuerOrg.bankAccounts.find(a => a.isDefault) 
      || invoice.issuerOrg.bankAccounts[0];

    if (!bankAccount) {
      throw new Error('No bank account configured for issuing organization');
    }

    // Generate QR-bill payload
    const qrBillData = this.buildQrBillData(invoice, bankAccount);
    const qrPayload = this.qrBillService.generateQrPayload(qrBillData);

    // Generate QR code as data URL
    const qrCodeDataUrl = await this.generateSwissQrCode(qrPayload.payload);

    // Render PDF using Puppeteer/Playwright or pdf-lib
    const pdfBuffer = await this.renderPdfWithQrBill(invoice, qrCodeDataUrl, bankAccount);

    // Upload to S3/R2
    const fileName = `invoices/${invoice.issuerOrgId}/${invoice.invoiceNumber}.pdf`;
    const { assetId, publicUrl } = await this.uploadService.uploadBuffer(
      pdfBuffer,
      fileName,
      'application/pdf',
    );

    // IMPORTANT: Persist QR payload and hash to invoice for future validation
    // This ensures we can verify the PDF matches what was sent
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        qrPayloadRaw: qrPayload.payload,
        qrPayloadHash: qrPayload.hash,
        pdfAssetId: assetId,
      },
    });

    // Create immutable snapshot for compliance
    await this.prisma.invoiceSnapshot.create({
      data: {
        invoiceId: invoice.id,
        reason: 'pdf_generated',
        snapshot: JSON.parse(JSON.stringify(invoice)), // Deep clone
        snapshotHash: createHash('sha256')
          .update(JSON.stringify(invoice))
          .digest('hex'),
      },
    });

    return {
      pdfBuffer,
      assetUrl: publicUrl,
      qrPayload: qrPayload.payload,
      qrPayloadHash: qrPayload.hash,
    };
  }

  /**
   * Build QR-bill data from invoice
   */
  private buildQrBillData(
    invoice: InvoiceWithRelations,
    bankAccount: OrganizationBankAccount,
  ) {
    return {
      creditor: {
        iban: bankAccount.iban,
        addressType: bankAccount.creditorAddressType as 'S' | 'K',
        name: bankAccount.creditorName,
        street: bankAccount.creditorStreet || '',
        buildingNumber: bankAccount.creditorBuildingNumber || '',
        postalCode: bankAccount.creditorPostalCode,
        city: bankAccount.creditorCity,
        country: bankAccount.creditorCountry,
      },
      debtor: {
        addressType: 'S' as const,
        name: invoice.recipientOrg.name,
        street: invoice.recipientOrg.billingAddressLine1 || invoice.recipientOrg.address || '',
        buildingNumber: '',
        postalCode: invoice.recipientOrg.billingPostalCode || '',
        city: invoice.recipientOrg.billingCity || '',
        country: invoice.recipientOrg.billingCountry || 'CH',
      },
      amount: invoice.totalAmount,
      currency: invoice.currency as 'CHF' | 'EUR',
      referenceType: invoice.referenceType as 'QRR' | 'SCOR' | 'NON',
      reference: invoice.referenceNumber,
      unstructuredMessage: invoice.messageToRecipient || `Invoice ${invoice.invoiceNumber}`,
    };
  }

  /**
   * Generate Swiss QR code with Swiss cross overlay
   * QR code must be 46x46mm at 300 DPI = 543x543 pixels
   */
  private async generateSwissQrCode(payload: string): Promise<string> {
    const qrCodeBuffer = await QRCode.toBuffer(payload, {
      type: 'png',
      width: 543,
      margin: 0,
      errorCorrectionLevel: 'M', // Swiss spec requires M level
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Add Swiss cross overlay (7x7mm centered, white background with black cross)
    // This would use sharp or canvas to overlay the Swiss cross
    const withCross = await this.addSwissCross(qrCodeBuffer);

    return `data:image/png;base64,${withCross.toString('base64')}`;
  }

  /**
   * Add Swiss cross to center of QR code
   * Swiss spec: 7x7mm cross centered on 46x46mm QR code
   * At 300 DPI: QR = 543px, Cross = ~83px
   */
  private async addSwissCross(qrBuffer: Buffer): Promise<Buffer> {
    const sharp = (await import('sharp')).default;
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const SIZE_QR_PX = 543;   // 46mm @ 300 DPI
    const CROSS_MM = 7;
    const CROSS_PX = Math.round(SIZE_QR_PX * (CROSS_MM / 46)); // ~83px

    // Load Swiss cross SVG (should include white background square)
    const overlaySvgPath = path.resolve(__dirname, 'assets', 'swiss-cross.svg');
    const overlaySvg = await fs.readFile(overlaySvgPath);
    
    // Convert SVG to PNG at correct size
    const overlayPng = await sharp(overlaySvg)
      .resize(CROSS_PX, CROSS_PX)
      .png()
      .toBuffer();

    // Get QR code dimensions
    const meta = await sharp(qrBuffer).metadata();
    const qrWidth = meta.width ?? SIZE_QR_PX;
    const qrHeight = meta.height ?? SIZE_QR_PX;

    // Calculate center position
    const left = Math.round((qrWidth - CROSS_PX) / 2);
    const top = Math.round((qrHeight - CROSS_PX) / 2);

    // Composite Swiss cross onto QR code
    return sharp(qrBuffer)
      .composite([{ input: overlayPng, left, top }])
      .png()
      .toBuffer();
  }
}
```

### Swiss Cross SVG Asset

The Swiss cross SVG must include an opaque white background to mask the QR code finder modules beneath:

```xml
<!-- api/src/invoicing/pdf/assets/swiss-cross.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- White background square (required to mask QR modules) -->
  <rect x="0" y="0" width="100" height="100" fill="white"/>
  
  <!-- Swiss cross (official proportions: cross is 1/6 width of total) -->
  <!-- Red background -->
  <rect x="10" y="10" width="80" height="80" fill="#FF0000"/>
  
  <!-- White cross -->
  <rect x="39" y="22" width="22" height="56" fill="white"/>
  <rect x="22" y="39" width="56" height="22" fill="white"/>
</svg>
```

**Important:** The outer white rect is essential - without it, the QR finder pattern modules would show through the cross, potentially causing scanning issues.

```typescript
  /**
   * Render complete PDF with A4 invoice and A6 payment slip
   * 
   * Page layout (A4 210x297mm):
   * - Top section: Invoice header, line items, totals
   * - Bottom 105mm: QR-bill payment slip (perforated)
   * 
   * The payment slip follows Swiss specifications:
   * - Receipt section (62x105mm) on left
   * - Payment section (148x105mm) on right
   */
  private async renderPdfWithQrBill(
    invoice: InvoiceWithRelations,
    qrCodeDataUrl: string,
    bankAccount: OrganizationBankAccount,
  ): Promise<Buffer> {
    // Use pdf-lib or Puppeteer to generate PDF
    // For production, recommend Puppeteer for complex layouts
    
    // This is a simplified implementation outline
    // Full implementation would use HTML template + Puppeteer
    
    const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Draw invoice content (simplified)
    const { height } = page.getSize();
    
    // Invoice header
    page.drawText(invoice.issuerOrg.name, {
      x: 50,
      y: height - 50,
      size: 16,
      font: helveticaBold,
    });
    
    page.drawText(`Invoice: ${invoice.invoiceNumber}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font: helvetica,
    });
    
    page.drawText(`Date: ${invoice.issueDate.toLocaleDateString('de-CH')}`, {
      x: 50,
      y: height - 100,
      size: 10,
      font: helvetica,
    });
    
    // ... additional invoice content rendering ...
    
    // Draw QR-bill section (bottom 105mm = ~298 points)
    const qrBillTop = 298; // 105mm from bottom
    
    // Draw horizontal separation line (perforation indicator)
    // Swiss QR-bill spec: dashed line with scissors symbol
    page.drawLine({
      start: { x: 0, y: qrBillTop },
      end: { x: 595.28, y: qrBillTop },
      thickness: 0.5,
      dashArray: [3, 3],
      color: rgb(0, 0, 0),
      opacity: 0.5, // Semi-transparent for proper "fold here" appearance
    });
    
    // Add scissors symbol (✂) at perforation line start
    page.drawText('✂', {
      x: 8,
      y: qrBillTop - 4,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
      opacity: 0.5,
    });
    
    // Draw vertical separation line between receipt and payment parts
    // Receipt: 62mm from left, Payment: remaining 148mm
    const receiptWidth = 62 * 2.835; // Convert mm to points
    page.drawLine({
      start: { x: receiptWidth, y: 0 },
      end: { x: receiptWidth, y: qrBillTop },
      thickness: 0.5,
      dashArray: [3, 3],
      color: rgb(0, 0, 0),
      opacity: 0.5,
    });
    
    // Add scissors symbol at vertical perforation
    page.drawText('✂', {
      x: receiptWidth - 4,
      y: 8,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
      opacity: 0.5,
      rotate: degrees(90), // Rotate for vertical line
    });
    
    // Embed QR code
    const qrImageBytes = Buffer.from(
      qrCodeDataUrl.replace('data:image/png;base64,', ''),
      'base64'
    );
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    
    // QR code position: 67mm from left, 17mm from bottom of payment part
    // Size: 46x46mm
    page.drawImage(qrImage, {
      x: 67 * 2.835, // Convert mm to points
      y: 17 * 2.835,
      width: 46 * 2.835,
      height: 46 * 2.835,
    });
    
    // ... additional QR-bill text rendering ...
    
    return Buffer.from(await pdfDoc.save());
  }
}
```

### 8.2 NPM Dependencies to Add

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "pdf-lib": "^1.17.1",
    "sharp": "^0.33.4",
    "puppeteer": "^22.0.0",
    "luxon": "^3.4.4",
    "exceljs": "^4.4.0",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/luxon": "^3.4.2",
    "@types/bcrypt": "^5.0.2"
  }
}
```

**Package purposes:**
- `qrcode` - Swiss QR code generation
- `pdf-lib` - Low-level PDF manipulation
- `sharp` - Image processing for Swiss cross overlay
- `puppeteer` - HTML to PDF conversion
- `luxon` - Timezone-aware date handling (Swiss time)
- `exceljs` - Excel workbook generation for accountant exports
- `bcrypt` - Password hashing for export share links

---

## 9. Payment Management

### 9.1 Payment Recording Features

The invoicing system provides comprehensive payment management similar to Wave Apps and Invoice Ninja:

#### Payment Types Supported

| Payment Type | Description | Auto-recorded |
|-------------|-------------|---------------|
| **Bank Transfer** | Swiss QR-bill bank payment | Manual (or bank feed integration) |
| **Stripe** | Online card payment | Automatic via webhook |
| **Cash** | Cash payment | Manual |
| **Check** | Check payment | Manual |
| **PayPal** | PayPal payment | Automatic via webhook |
| **Other** | Custom payment method | Manual |

### 9.2 Partial Payments & Deposits

```typescript
// api/src/invoicing/payment/payment.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a payment against an invoice
   * Supports partial payments, deposits, and overpayments
   */
  async recordPayment(
    invoiceId: string,
    dto: RecordPaymentDto,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (['CANCELLED', 'REFUNDED', 'WRITTEN_OFF'].includes(invoice.status)) {
      throw new BadRequestException(`Cannot record payment for ${invoice.status} invoice`);
    }

    // Validate payment amount
    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    
    if (dto.amount > remainingBalance && !dto.allowOverpayment) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance})`
      );
    }

    // Create payment record
    const payment = await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        currency: dto.currency || invoice.currency,
        paymentDate: dto.paymentDate || new Date(),
        paymentMethod: dto.paymentMethod,
        transactionRef: dto.transactionRef,
        isDeposit: dto.isDeposit || false,
        bankReference: dto.bankReference,
        notes: dto.notes,
        recordedById: userId,
        receiptNumber: await this.generateReceiptNumber(invoice.issuerOrgId),
      },
    });

    // Update invoice paid amount and status
    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newBalanceDue = invoice.totalAmount - newPaidAmount;
    
    let newStatus = invoice.status;
    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0 && invoice.status !== 'PARTIALLY_PAID') {
      newStatus = 'PARTIALLY_PAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
        lastPaymentDate: dto.paymentDate || new Date(),
        ...(newStatus === 'PAID' && { paidDate: new Date() }),
      },
    });

    // Log audit
    await this.logPaymentAudit(invoiceId, payment, userId);

    // Generate receipt if requested
    if (dto.generateReceipt) {
      await this.generatePaymentReceipt(invoice, payment);
    }

    return payment;
  }

  /**
   * Process refund
   */
  async processRefund(
    invoiceId: string,
    dto: ProcessRefundDto,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (dto.amount > invoice.paidAmount) {
      throw new BadRequestException('Refund amount cannot exceed paid amount');
    }

    // Create refund record (negative payment)
    const refund = await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount: -dto.amount, // Negative for refund
        currency: invoice.currency,
        paymentDate: new Date(),
        paymentMethod: dto.refundMethod || 'bank_transfer',
        isRefund: true,
        stripeRefundId: dto.stripeRefundId,
        notes: dto.reason,
        recordedById: userId,
      },
    });

    // Update invoice
    const newPaidAmount = invoice.paidAmount - dto.amount;
    let newStatus = invoice.status;
    
    if (newPaidAmount <= 0) {
      newStatus = 'REFUNDED';
    } else {
      newStatus = 'PARTIALLY_PAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: invoice.totalAmount - newPaidAmount,
        status: newStatus,
      },
    });

    return refund;
  }
}
```

### 9.3 Late Fees Calculation

```typescript
/**
 * Apply late fees to overdue invoices
 * Runs daily to check for overdue invoices
 */
@Cron(CronExpression.EVERY_DAY_AT_6AM)
async applyLateFees() {
  const today = new Date();
  
  const overdueInvoices = await this.prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      dueDate: { lt: today },
      lateFeeEnabled: true,
      lateFeeApplied: false,
    },
  });

  for (const invoice of overdueInvoices) {
    // Check grace period
    const daysPastDue = Math.floor(
      (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysPastDue <= (invoice.lateFeeGraceDays || 0)) {
      continue; // Still in grace period
    }

    // Calculate late fee
    let lateFeeAmount: number;
    if (invoice.lateFeeType === 'PERCENTAGE') {
      lateFeeAmount = Math.round(invoice.balanceDue * (Number(invoice.lateFeeValue) / 100));
    } else {
      lateFeeAmount = Number(invoice.lateFeeValue) * 100; // Convert to centimes
    }

    // Apply late fee
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        lateFeeAmount,
        lateFeeApplied: true,
        totalAmount: invoice.totalAmount + lateFeeAmount,
        balanceDue: invoice.balanceDue + lateFeeAmount,
        status: 'OVERDUE',
      },
    });

    // Add late fee as line item for transparency
    await this.prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        position: 999, // At the end
        description: 'Late payment fee',
        quantity: new Decimal(1),
        unitPrice: lateFeeAmount,
        subtotalPrice: lateFeeAmount,
        netPrice: lateFeeAmount,
        totalPrice: lateFeeAmount,
        taxExempt: true,
      },
    });

    // Log audit
    await this.logAudit(invoice.id, 'late_fee_applied', {
      amount: lateFeeAmount,
      daysPastDue,
    });
  }
}
```

### 9.4 Payment Matching (Bank Reconciliation)

```typescript
/**
 * Match incoming bank payments to invoices using reference number
 */
async matchPaymentToInvoice(
  bankTransaction: BankTransaction,
): Promise<Invoice | null> {
  // Try to find invoice by QRR/SCOR reference
  if (bankTransaction.referenceNumber) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        referenceNumber: bankTransaction.referenceNumber.replace(/\s/g, ''),
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
    });

    if (invoice) {
      // Auto-record payment
      await this.recordPayment(invoice.id, {
        amount: bankTransaction.amount,
        paymentDate: bankTransaction.date,
        paymentMethod: 'bank_transfer',
        transactionRef: bankTransaction.transactionId,
        bankReference: bankTransaction.referenceNumber,
      }, 'SYSTEM');

      return invoice;
    }
  }

  // Try fuzzy matching by amount + recipient
  // (Implementation for cases where reference is missing)
  
  return null;
}
```

---

## 10. Client Portal

### 10.1 Client Portal Features

The client portal allows customers to view and pay invoices online:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT PORTAL FEATURES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📄 VIEW DOCUMENTS                                               │
│     ├── View invoice PDF                                         │
│     ├── View quote/estimate                                      │
│     ├── Download attachments                                     │
│     └── View payment history                                     │
│                                                                  │
│  💳 ONLINE PAYMENT                                               │
│     ├── Pay full balance                                         │
│     ├── Pay partial amount                                       │
│     ├── Pay deposit                                              │
│     └── Set up recurring payment                                 │
│                                                                  │
│  ✅ QUOTE ACTIONS                                                │
│     ├── Accept quote                                             │
│     ├── Decline quote                                            │
│     └── Request changes                                          │
│                                                                  │
│  📨 COMMUNICATION                                                │
│     ├── Add comments                                             │
│     ├── Request support                                          │
│     └── View message history                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Secure Token-Based Access

```typescript
// api/src/invoicing/client-portal/client-portal.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a secure access token for client portal
   * Token expires after configured period (default 90 days)
   */
  async generatePortalToken(invoiceId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clientPortalToken: hashedToken,
        clientPortalExpiry: expiry,
      },
    });

    return token;
  }

  /**
   * Validate portal token and return invoice
   */
  async validatePortalAccess(token: string): Promise<Invoice> {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        clientPortalToken: hashedToken,
        clientPortalExpiry: { gt: new Date() },
      },
      include: {
        lineItems: true,
        payments: true,
        issuerOrg: {
          include: { bankAccounts: { where: { isDefault: true } } },
        },
        recipientOrg: true,
      },
    });

    if (!invoice) {
      throw new UnauthorizedException('Invalid or expired access link');
    }

    // Track view
    if (!invoice.viewedDate) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          viewedDate: new Date(),
          status: invoice.status === 'SENT' ? 'VIEWED' : invoice.status,
        },
      });
    }

    return invoice;
  }

  /**
   * Process online payment from client portal
   */
  async processOnlinePayment(
    token: string,
    dto: OnlinePaymentDto,
  ): Promise<PaymentResult> {
    const invoice = await this.validatePortalAccess(token);

    if (!invoice.allowOnlinePayment) {
      throw new BadRequestException('Online payment not enabled for this invoice');
    }

    // Validate amount
    if (dto.amount > invoice.balanceDue) {
      throw new BadRequestException('Payment amount exceeds balance due');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: dto.amount,
      currency: invoice.currency.toLowerCase(),
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Accept quote from client portal
   */
  async acceptQuote(token: string): Promise<Quote> {
    const quote = await this.prisma.quote.findFirst({
      where: {
        clientPortalToken: createHash('sha256').update(token).digest('hex'),
        status: { in: ['SENT', 'VIEWED'] },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found or already actioned');
    }

    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new BadRequestException('Quote has expired');
    }

    return this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: 'ACCEPTED',
        acceptedDate: new Date(),
      },
    });
  }
}
```

### 10.3 Client Portal API Endpoints

```
# Public endpoints (token-based auth)
GET    /api/portal/invoice/:token           # View invoice
GET    /api/portal/invoice/:token/pdf       # Download PDF
POST   /api/portal/invoice/:token/pay       # Initiate payment
POST   /api/portal/invoice/:token/comment   # Add comment

GET    /api/portal/quote/:token             # View quote
POST   /api/portal/quote/:token/accept      # Accept quote
POST   /api/portal/quote/:token/decline     # Decline quote
```

### 10.4 Client Portal UI

The client portal provides a clean, branded experience:

```tsx
// frontend/src/pages/ClientPortal/InvoiceView.tsx
interface ClientPortalInvoiceProps {
  invoice: PortalInvoice;
  onPayNow: () => void;
}

const ClientPortalInvoice: React.FC<ClientPortalInvoiceProps> = ({
  invoice,
  onPayNow,
}) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Branding header */}
      <header className="flex justify-between items-center mb-8">
        <img src={invoice.issuerLogo} alt={invoice.issuerName} className="h-12" />
        <div className="text-right">
          <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-gray-600">Due: {formatDate(invoice.dueDate)}</p>
        </div>
      </header>

      {/* Status banner */}
      <StatusBanner status={invoice.status} balanceDue={invoice.balanceDue} />

      {/* Invoice details */}
      <InvoiceDetails invoice={invoice} />

      {/* Line items */}
      <LineItemsTable items={invoice.lineItems} />

      {/* Totals */}
      <TotalsSummary invoice={invoice} />

      {/* Payment section */}
      {invoice.balanceDue > 0 && (
        <PaymentSection
          balanceDue={invoice.balanceDue}
          currency={invoice.currency}
          onPayNow={onPayNow}
        />
      )}

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <PaymentHistory payments={invoice.payments} />
      )}

      {/* QR-bill preview (for print) */}
      <QrBillSection invoice={invoice} />

      {/* Download buttons */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => downloadPdf(invoice.id)}>
          Download PDF
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
};
```

---

## 10.5 Security Considerations

### Rate Limiting

PDF generation and QR code generation are resource-intensive operations that require rate limiting:

**Module Configuration:**

```typescript
// api/src/app.module.ts - Configure named throttlers
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'pdf', ttl: 60000, limit: 10 },   // 10 PDF requests per minute
      { name: 'qr', ttl: 60000, limit: 30 },    // 30 QR preview requests per minute
      { name: 'default', ttl: 60000, limit: 100 }, // Default rate limit
    ]),
    // ... other imports
  ],
})
export class AppModule {}
```

**Controller Usage:**

```typescript
// api/src/invoicing/invoice/invoice.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle, Throttle } from '@nestjs/throttler';
import { InvoiceAccessGuard } from '../guards/invoice-access.guard';

@Controller('invoices')
@UseGuards(InvoiceAccessGuard)
export class InvoiceController {
  
  /**
   * PDF generation is resource-intensive - use 'pdf' throttler (10/min)
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ pdf: { limit: 10, ttl: 60000 } })
  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string) {
    return this.invoiceService.generatePdf(id);
  }

  /**
   * QR preview generation - use 'qr' throttler (30/min)
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ qr: { limit: 30, ttl: 60000 } })
  @Post('preview-qr')
  async previewQr(@Body() dto: QrPreviewDto) {
    return this.qrBillService.generatePreview(dto);
  }

  /**
   * Regular endpoints use default throttle from module config
   */
  @UseGuards(ThrottlerGuard)
  @Get(':id')
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoice(id);
  }
}
```

### Invoice Access Guard

Comprehensive role-based access control for invoice operations:

```typescript
// api/src/invoicing/guards/invoice-access.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const invoiceId = request.params.id;

    if (!invoiceId) return true; // No invoice ID in route

    // Platform admins have full access
    if (user.role === 'PLATFORM_ADMIN') return true;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { issuerOrgId: true, recipientOrgId: true },
    });

    if (!invoice) return true; // Let controller handle 404

    // User must belong to issuer OR recipient organization
    const userOrgIds = user.organizations?.map(o => o.id) || [];
    
    const hasAccess = 
      userOrgIds.includes(invoice.issuerOrgId) ||
      userOrgIds.includes(invoice.recipientOrgId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    // Check operation-specific permissions
    const method = request.method;
    
    // Only issuer org can modify invoices
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      if (!userOrgIds.includes(invoice.issuerOrgId)) {
        throw new ForbiddenException('Only the issuing organization can modify this invoice');
      }
    }

    return true;
  }
}
```

### Enhanced Client Portal Token Security

Portal tokens include additional security measures:

```typescript
// api/src/invoicing/client-portal/client-portal.service.ts
import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientPortalService {
  private readonly portalSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.portalSecret = this.configService.getOrThrow('PORTAL_TOKEN_SECRET');
  }

  /**
   * Generate a secure portal access token
   * Includes HMAC for additional security
   */
  async generatePortalToken(invoiceId: string): Promise<string> {
    const randomPart = randomBytes(32).toString('hex');
    const timestamp = Date.now().toString(36);
    
    // Create HMAC signature including invoice ID
    const dataToSign = `${randomPart}:${invoiceId}:${timestamp}`;
    const signature = createHmac('sha256', this.portalSecret)
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16); // First 16 chars of HMAC
    
    // Full token: random + timestamp + signature
    const token = `${randomPart}${timestamp}${signature}`;
    
    // Store hashed version in database
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clientPortalToken: hashedToken,
        clientPortalExpiry: expiry,
      },
    });

    return token;
  }

  /**
   * Validate portal token with additional checks
   */
  async validatePortalAccess(
    token: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<Invoice> {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        clientPortalToken: hashedToken,
        clientPortalExpiry: { gt: new Date() },
      },
      include: { /* relations */ },
    });

    if (!invoice) {
      // Log failed access attempt
      await this.logAccessAttempt(token, clientIp, userAgent, false);
      throw new UnauthorizedException('Invalid or expired access link');
    }

    // Log successful access
    await this.logAccessAttempt(token, clientIp, userAgent, true, invoice.id);

    // Track first view
    if (!invoice.viewedDate) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          viewedDate: new Date(),
          status: invoice.status === 'SENT' ? 'VIEWED' : invoice.status,
        },
      });
    }

    return invoice;
  }

  /**
   * Log portal access attempts for security monitoring
   */
  private async logAccessAttempt(
    tokenHash: string,
    clientIp?: string,
    userAgent?: string,
    success?: boolean,
    invoiceId?: string,
  ) {
    await this.prisma.portalAccessLog.create({
      data: {
        tokenHash: tokenHash.substring(0, 16), // Partial hash for privacy
        clientIp,
        userAgent,
        success,
        invoiceId,
        timestamp: new Date(),
      },
    });
  }
}
```

### Additional Security Measures

```prisma
// Add to schema for security logging
model PortalAccessLog {
  id          String    @id @default(uuid())
  tokenHash   String    // Partial hash of token attempted
  clientIp    String?
  userAgent   String?
  success     Boolean
  invoiceId   String?
  timestamp   DateTime  @default(now())
  
  @@index([timestamp])
  @@index([clientIp])
  @@map("portal_access_logs")
}
```

---

## 11. Admin Dashboard Integration

### 11.1 Page Structure (Full-Featured)

```
admin/src/pages/
├── invoicing/
│   ├── Invoices.tsx                    # Invoice list with filters
│   ├── InvoiceDetail.tsx               # Single invoice view
│   ├── CreateInvoice.tsx               # Invoice creation wizard
│   ├── EditInvoice.tsx                 # Edit draft invoice
│   │
│   ├── quotes/
│   │   ├── Quotes.tsx                  # Quote list
│   │   ├── QuoteDetail.tsx             # Quote view
│   │   └── CreateQuote.tsx             # Create quote
│   │
│   ├── recurring/
│   │   ├── RecurringInvoices.tsx       # Recurring template list
│   │   ├── RecurringDetail.tsx         # Template detail + generated list
│   │   └── CreateRecurring.tsx         # Create recurring template
│   │
│   ├── credit-notes/
│   │   ├── CreditNotes.tsx             # Credit note list
│   │   └── CreateCreditNote.tsx        # Create from invoice
│   │
│   ├── payments/
│   │   └── Payments.tsx                # All payments view
│   │
│   ├── reports/
│   │   ├── InvoiceReports.tsx          # Reports dashboard
│   │   ├── AgingReport.tsx             # A/R aging
│   │   └── RevenueReport.tsx           # Revenue analytics
│   │
│   └── settings/
│       ├── InvoiceSettings.tsx         # General settings
│       ├── BankAccounts.tsx            # Bank account management
│       ├── TaxRates.tsx                # Tax rate configuration
│       ├── InvoiceTemplates.tsx        # Template management
│       └── ReminderSettings.tsx        # Reminder configuration
│
└── components/
    └── invoicing/
        ├── InvoiceTable.tsx            # Sortable, filterable table
        ├── InvoiceStatusBadge.tsx      # Status indicator
        ├── InvoiceStatusTimeline.tsx   # Visual status history
        ├── InvoicePreview.tsx          # Embedded PDF preview
        ├── QrBillPreview.tsx           # Live QR-bill preview
        ├── LineItemEditor.tsx          # Add/edit line items
        ├── LineItemTable.tsx           # Display line items
        ├── TotalsDisplay.tsx           # Subtotal/discount/tax/total
        ├── PaymentRecordModal.tsx      # Record payment dialog
        ├── SendInvoiceModal.tsx        # Email send dialog
        ├── BankAccountForm.tsx         # Bank account CRUD
        ├── RecipientSelect.tsx         # Customer selector
        ├── DateRangePicker.tsx         # Date range filter
        └── CurrencyInput.tsx           # Formatted currency input
```

### 11.2 Invoice List Page

```tsx
// admin/src/pages/invoicing/Invoices.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '@/services/invoice.service';

const Invoices: React.FC = () => {
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: [],
    dateRange: { start: null, end: null },
    search: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.getInvoices(filters),
  });

  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/invoicing/quotes')}>
            Quotes
          </Button>
          <Button variant="outline" onClick={() => navigate('/invoicing/recurring')}>
            Recurring
          </Button>
          <Button onClick={() => navigate('/invoicing/create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Outstanding"
          value={formatCurrency(data?.summary.outstanding)}
          icon={<DollarSign />}
        />
        <SummaryCard
          title="Overdue"
          value={formatCurrency(data?.summary.overdue)}
          icon={<AlertTriangle />}
          variant="danger"
        />
        <SummaryCard
          title="Paid This Month"
          value={formatCurrency(data?.summary.paidThisMonth)}
          icon={<CheckCircle />}
          variant="success"
        />
        <SummaryCard
          title="Draft"
          value={data?.summary.draftCount}
          icon={<FileEdit />}
        />
      </div>

      {/* Filters */}
      <InvoiceFilters filters={filters} onChange={setFilters} />

      {/* Invoice table */}
      <InvoiceTable
        invoices={data?.invoices || []}
        loading={isLoading}
        onRowClick={(invoice) => navigate(`/invoicing/${invoice.id}`)}
      />
    </div>
  );
};
```

### 11.3 Invoice Creation Wizard

The invoice creation follows a step-by-step wizard pattern:

```tsx
// admin/src/pages/invoicing/CreateInvoice.tsx
const CreateInvoice: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CreateInvoiceData>({
    recipientOrgId: '',
    category: 'CUSTOM',
    lineItems: [],
    paymentTerms: 'NET_30',
    currency: 'CHF',
  });

  const steps = [
    { id: 1, title: 'Customer', description: 'Select recipient' },
    { id: 2, title: 'Items', description: 'Add line items' },
    { id: 3, title: 'Details', description: 'Dates & terms' },
    { id: 4, title: 'Review', description: 'Preview & confirm' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step indicator */}
      <StepIndicator steps={steps} currentStep={step} />

      {/* Step content */}
      <div className="mt-8">
        {step === 1 && (
          <CustomerStep
            value={formData.recipientOrgId}
            onChange={(orgId) => setFormData({ ...formData, recipientOrgId: orgId })}
          />
        )}

        {step === 2 && (
          <LineItemsStep
            items={formData.lineItems}
            currency={formData.currency}
            onChange={(items) => setFormData({ ...formData, lineItems: items })}
          />
        )}

        {step === 3 && (
          <DetailsStep
            formData={formData}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        )}

        {step === 4 && (
          <ReviewStep
            formData={formData}
            onEdit={(stepId) => setStep(stepId)}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Previous
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAsDraft}>
              Save as Draft
            </Button>
            <Button onClick={handleCreateAndSend}>
              Create & Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 11.4 Line Item Editor

```tsx
// admin/src/components/invoicing/LineItemEditor.tsx
interface LineItemEditorProps {
  items: InvoiceLineItem[];
  currency: string;
  taxRates: TaxRate[];
  onChange: (items: InvoiceLineItem[]) => void;
}

const LineItemEditor: React.FC<LineItemEditorProps> = ({
  items,
  currency,
  taxRates,
  onChange,
}) => {
  const addItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        position: items.length + 1,
        description: '',
        quantity: 1,
        unit: '',
        unitPrice: 0,
        taxPercent: taxRates.find(t => t.isDefault)?.rate || 0,
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const totals = calculateTotals(items);

  return (
    <div className="space-y-4">
      {/* Line items */}
      <div className="border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right w-24">Qty</th>
              <th className="px-4 py-2 text-left w-20">Unit</th>
              <th className="px-4 py-2 text-right w-32">Price</th>
              <th className="px-4 py-2 text-right w-24">Tax</th>
              <th className="px-4 py-2 text-right w-32">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                currency={currency}
                taxRates={taxRates}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add item button */}
      <Button variant="outline" onClick={addItem}>
        <Plus className="w-4 h-4 mr-2" />
        Add Line Item
      </Button>

      {/* Totals */}
      <TotalsDisplay totals={totals} currency={currency} />
    </div>
  );
};
```

### 11.5 QR-Bill Preview Component

```tsx
// admin/src/components/invoicing/QrBillPreview.tsx
interface QrBillPreviewProps {
  creditor: CreditorInfo;
  debtor?: DebtorInfo;
  amount: number;
  currency: 'CHF' | 'EUR';
  reference: string;
  referenceType: 'QRR' | 'SCOR' | 'NON';
  message?: string;
}

const QrBillPreview: React.FC<QrBillPreviewProps> = ({
  creditor,
  debtor,
  amount,
  currency,
  reference,
  referenceType,
  message,
}) => {
  const { data: qrCode, error } = useQuery({
    queryKey: ['qr-preview', creditor, debtor, amount, reference],
    queryFn: () => invoiceService.generateQrPreview({
      creditor,
      debtor,
      amount,
      currency,
      reference,
      referenceType,
      message,
    }),
    enabled: !!creditor.iban && amount > 0,
  });

  return (
    <div className="border rounded-lg p-4 bg-white" style={{ width: '210mm' }}>
      {/* QR-bill payment slip preview (105mm height) */}
      <div className="border-t-2 border-dashed pt-4" style={{ height: '105mm' }}>
        <div className="flex">
          {/* Receipt section (62mm) */}
          <div className="border-r border-dashed pr-4" style={{ width: '62mm' }}>
            <h3 className="font-bold text-xs">Receipt</h3>
            <div className="mt-2 text-xs">
              <p className="font-semibold">Account / Payable to</p>
              <p>{creditor.iban}</p>
              <p>{creditor.name}</p>
              <p>{creditor.street} {creditor.buildingNumber}</p>
              <p>{creditor.postalCode} {creditor.city}</p>
            </div>
            {reference && (
              <div className="mt-2 text-xs">
                <p className="font-semibold">Reference</p>
                <p>{formatReference(reference, referenceType)}</p>
              </div>
            )}
            {debtor && (
              <div className="mt-2 text-xs">
                <p className="font-semibold">Payable by</p>
                <p>{debtor.name}</p>
                <p>{debtor.postalCode} {debtor.city}</p>
              </div>
            )}
            <div className="mt-4 text-xs">
              <p className="font-semibold">Currency</p>
              <p>{currency}</p>
              <p className="font-semibold mt-1">Amount</p>
              <p>{formatCurrency(amount, currency)}</p>
            </div>
          </div>

          {/* Payment section (148mm) */}
          <div className="pl-4 flex-1">
            <h3 className="font-bold text-xs">Payment part</h3>
            <div className="flex mt-2">
              {/* QR code */}
              <div className="w-32 h-32 border flex items-center justify-center">
                {qrCode ? (
                  <img src={qrCode} alt="Swiss QR Code" className="w-full h-full" />
                ) : error ? (
                  <span className="text-red-500 text-xs text-center">
                    Validation error
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Loading...</span>
                )}
              </div>

              {/* Payment details */}
              <div className="ml-4 text-xs flex-1">
                <p className="font-semibold">Account / Payable to</p>
                <p>{creditor.iban}</p>
                <p>{creditor.name}</p>
                <p>{creditor.postalCode} {creditor.city}</p>

                {reference && (
                  <div className="mt-2">
                    <p className="font-semibold">Reference</p>
                    <p className="font-mono">{formatReference(reference, referenceType)}</p>
                  </div>
                )}

                {message && (
                  <div className="mt-2">
                    <p className="font-semibold">Additional information</p>
                    <p>{message}</p>
                  </div>
                )}

                {debtor && (
                  <div className="mt-2">
                    <p className="font-semibold">Payable by</p>
                    <p>{debtor.name}</p>
                    <p>{debtor.postalCode} {debtor.city}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Amount box */}
            <div className="mt-4 flex gap-8">
              <div>
                <p className="font-semibold text-xs">Currency</p>
                <p className="text-lg">{currency}</p>
              </div>
              <div>
                <p className="font-semibold text-xs">Amount</p>
                <p className="text-lg">{formatCurrency(amount, currency)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 11.6 Accountant Export System

A comprehensive export system designed for easy sharing with external accountants and integration with Swiss accounting software.

### Export Formats Supported

| Format | Use Case | Description |
|--------|----------|-------------|
| **CSV** | Universal | Simple tabular data, works with any spreadsheet |
| **Excel (XLSX)** | Accountants | Formatted workbook with multiple sheets |
| **PDF Report** | Presentation | Professional formatted reports |
| **DATEV** | German/Swiss | Standard format for DATEV accounting software |
| **Abacus XML** | Swiss | Native format for Abacus ERP (popular in Switzerland) |
| **JSON** | API Integration | Machine-readable for custom integrations |

### Export Data Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     ACCOUNTANT EXPORT OPTIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 INVOICE REGISTER                                             │
│     Complete list of all invoices with key fields                │
│     - Invoice #, Date, Customer, Amount, Tax, Status             │
│                                                                  │
│  📋 DETAILED TRANSACTIONS                                        │
│     Line-item level detail for each invoice                      │
│     - Description, Quantity, Unit Price, Tax Rate                │
│                                                                  │
│  💳 PAYMENT JOURNAL                                              │
│     All payments received with reconciliation data               │
│     - Date, Amount, Method, Reference, Invoice #                 │
│                                                                  │
│  📈 VAT REPORT (Swiss MWST)                                      │
│     Tax breakdown by rate (8.1%, 2.6%, 3.8%)                     │
│     - Taxable Amount, Tax Amount per rate                        │
│                                                                  │
│  ⏰ ACCOUNTS RECEIVABLE AGING                                    │
│     Outstanding balances by age bucket                           │
│     - Current, 1-30, 31-60, 61-90, 90+ days                      │
│                                                                  │
│  📁 MONTHLY/QUARTERLY PACKAGE                                    │
│     Complete bundle for period-end reporting                     │
│     - All above reports + summary                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema for Exports

```prisma
// Export job tracking and secure sharing
model AccountantExport {
  id              String    @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  // Export configuration
  exportType      ExportType
  format          ExportFormat
  
  // Date range
  periodStart     DateTime
  periodEnd       DateTime
  
  // Filters applied
  filters         Json?     // { status: [], customers: [], etc. }
  
  // Generated file
  fileAssetId     String?
  fileAsset       Asset?    @relation(fields: [fileAssetId], references: [id])
  fileName        String?
  fileSize        Int?
  
  // Secure sharing
  shareToken      String?   @unique
  shareExpiry     DateTime?
  sharePassword   String?   // Hashed password for download
  downloadCount   Int       @default(0)
  maxDownloads    Int?      // Optional limit
  
  // Tracking
  status          ExportStatus @default(PENDING)
  errorMessage    String?
  
  createdById     String
  createdBy       User      @relation(fields: [createdById], references: [id])
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  
  // Notification
  notifyEmail     String?   // Email to notify when ready
  emailSent       Boolean   @default(false)
  
  @@index([organizationId])
  @@index([shareToken])
  @@index([createdAt])
  @@map("accountant_exports")
}

enum ExportType {
  INVOICE_REGISTER
  DETAILED_TRANSACTIONS
  PAYMENT_JOURNAL
  VAT_REPORT
  AGING_REPORT
  MONTHLY_PACKAGE
  QUARTERLY_PACKAGE
  ANNUAL_PACKAGE
  CUSTOM
}

enum ExportFormat {
  CSV
  XLSX
  PDF
  DATEV
  ABACUS_XML
  JSON
}

enum ExportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  EXPIRED
}

// Scheduled exports for accountants
model ScheduledExport {
  id              String    @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  name            String    // "Monthly VAT Report for Accountant"
  
  // Schedule
  frequency       ExportFrequency
  dayOfMonth      Int?      // 1-28 for monthly
  enabled         Boolean   @default(true)
  
  // Export configuration
  exportType      ExportType
  format          ExportFormat
  
  // Auto-share settings
  recipientEmail  String    // Accountant's email
  includePassword Boolean   @default(true)
  
  // Tracking
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([organizationId])
  @@index([nextRunAt])
  @@map("scheduled_exports")
}

enum ExportFrequency {
  WEEKLY
  MONTHLY
  QUARTERLY
  ANNUALLY
}
```

### Export Service

```typescript
// api/src/invoicing/export/export.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailNotificationService } from '../../email-notification/email-notification.service';
import { UploadService } from '../../upload/upload.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailNotificationService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Generate invoice register export
   */
  async generateInvoiceRegister(
    organizationId: string,
    options: ExportOptions,
  ): Promise<Buffer> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuerOrgId: organizationId,
        issueDate: {
          gte: options.periodStart,
          lte: options.periodEnd,
        },
        ...(options.status && { status: { in: options.status } }),
      },
      include: {
        recipientOrg: true,
        lineItems: true,
        payments: true,
      },
      orderBy: { issueDate: 'asc' },
    });

    switch (options.format) {
      case 'XLSX':
        return this.generateExcelInvoiceRegister(invoices, options);
      case 'CSV':
        return this.generateCsvInvoiceRegister(invoices);
      case 'PDF':
        return this.generatePdfInvoiceRegister(invoices, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Generate Excel workbook with multiple sheets
   */
  private async generateExcelInvoiceRegister(
    invoices: InvoiceWithRelations[],
    options: ExportOptions,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ProCrèche Invoicing';
    workbook.created = new Date();

    // Sheet 1: Invoice Summary
    const summarySheet = workbook.addWorksheet('Invoice Register', {
      headerFooter: {
        firstHeader: `Invoice Register - ${options.periodStart.toLocaleDateString('de-CH')} to ${options.periodEnd.toLocaleDateString('de-CH')}`,
      },
    });

    summarySheet.columns = [
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
      { header: 'Date', key: 'issueDate', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Customer', key: 'customer', width: 30 },
      { header: 'Reference', key: 'reference', width: 30 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'VAT', key: 'taxAmount', width: 12 },
      { header: 'Total', key: 'totalAmount', width: 15 },
      { header: 'Paid', key: 'paidAmount', width: 15 },
      { header: 'Balance', key: 'balanceDue', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Currency', key: 'currency', width: 8 },
    ];

    // Style header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const invoice of invoices) {
      summarySheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        customer: invoice.recipientOrg.name,
        reference: invoice.referenceNumber,
        netAmount: invoice.netAmount / 100,
        taxAmount: invoice.taxAmount / 100,
        totalAmount: invoice.totalAmount / 100,
        paidAmount: invoice.paidAmount / 100,
        balanceDue: invoice.balanceDue / 100,
        status: invoice.status,
        currency: invoice.currency,
      });
    }

    // Format currency columns
    ['F', 'G', 'H', 'I', 'J'].forEach(col => {
      summarySheet.getColumn(col).numFmt = '#,##0.00';
    });

    // Add totals row
    const lastRow = summarySheet.rowCount + 1;
    summarySheet.addRow({
      invoiceNumber: 'TOTALS',
      netAmount: { formula: `SUM(F2:F${lastRow - 1})` },
      taxAmount: { formula: `SUM(G2:G${lastRow - 1})` },
      totalAmount: { formula: `SUM(H2:H${lastRow - 1})` },
      paidAmount: { formula: `SUM(I2:I${lastRow - 1})` },
      balanceDue: { formula: `SUM(J2:J${lastRow - 1})` },
    });
    summarySheet.getRow(lastRow).font = { bold: true };

    // Sheet 2: VAT Breakdown
    const vatSheet = workbook.addWorksheet('VAT Summary');
    await this.addVatSummarySheet(vatSheet, invoices);

    // Sheet 3: Payment Details
    const paymentSheet = workbook.addWorksheet('Payments');
    await this.addPaymentSheet(paymentSheet, invoices);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Generate Swiss VAT report
   */
  async generateVatReport(
    organizationId: string,
    options: ExportOptions,
  ): Promise<Buffer> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuerOrgId: organizationId,
        issueDate: { gte: options.periodStart, lte: options.periodEnd },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      include: {
        lineItems: { include: { taxRate: true } },
        taxBreakdown: true,
      },
    });

    // Swiss VAT rates
    const vatRates = {
      'STANDARD': { rate: 8.1, taxable: 0, tax: 0 },
      'REDUCED': { rate: 2.6, taxable: 0, tax: 0 },
      'ACCOMMODATION': { rate: 3.8, taxable: 0, tax: 0 },
      'EXEMPT': { rate: 0, taxable: 0, tax: 0 },
    };

    // Aggregate by tax rate
    for (const invoice of invoices) {
      for (const line of invoice.lineItems) {
        const rate = Number(line.taxPercent || 0);
        let category: string;
        
        if (rate >= 8) category = 'STANDARD';
        else if (rate >= 3.5) category = 'ACCOMMODATION';
        else if (rate > 0) category = 'REDUCED';
        else category = 'EXEMPT';

        vatRates[category].taxable += line.netPrice;
        vatRates[category].tax += line.taxAmount;
      }
    }

    // Generate report
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('MWST Abrechnung');

    sheet.addRow(['MWST-Abrechnung / Décompte TVA']);
    sheet.addRow([`Periode: ${options.periodStart.toLocaleDateString('de-CH')} - ${options.periodEnd.toLocaleDateString('de-CH')}`]);
    sheet.addRow([]);
    sheet.addRow(['Steuersatz', 'Umsatz (CHF)', 'MWST (CHF)']);
    
    sheet.addRow(['Normalsatz (8.1%)', vatRates.STANDARD.taxable / 100, vatRates.STANDARD.tax / 100]);
    sheet.addRow(['Reduzierter Satz (2.6%)', vatRates.REDUCED.taxable / 100, vatRates.REDUCED.tax / 100]);
    sheet.addRow(['Beherbergung (3.8%)', vatRates.ACCOMMODATION.taxable / 100, vatRates.ACCOMMODATION.tax / 100]);
    sheet.addRow(['Steuerbefreit (0%)', vatRates.EXEMPT.taxable / 100, 0]);
    sheet.addRow([]);
    
    const totalTaxable = Object.values(vatRates).reduce((sum, v) => sum + v.taxable, 0);
    const totalTax = Object.values(vatRates).reduce((sum, v) => sum + v.tax, 0);
    
    sheet.addRow(['TOTAL', totalTaxable / 100, totalTax / 100]);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Generate accounts receivable aging report
   */
  async generateAgingReport(
    organizationId: string,
    asOfDate: Date = new Date(),
  ): Promise<Buffer> {
    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        issuerOrgId: organizationId,
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        balanceDue: { gt: 0 },
      },
      include: { recipientOrg: true },
    });

    // Calculate age buckets
    const buckets = {
      current: { invoices: [], total: 0 },
      '1-30': { invoices: [], total: 0 },
      '31-60': { invoices: [], total: 0 },
      '61-90': { invoices: [], total: 0 },
      '90+': { invoices: [], total: 0 },
    };

    for (const invoice of openInvoices) {
      const daysPastDue = Math.floor(
        (asOfDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let bucket: string;
      if (daysPastDue <= 0) bucket = 'current';
      else if (daysPastDue <= 30) bucket = '1-30';
      else if (daysPastDue <= 60) bucket = '31-60';
      else if (daysPastDue <= 90) bucket = '61-90';
      else bucket = '90+';

      buckets[bucket].invoices.push(invoice);
      buckets[bucket].total += invoice.balanceDue;
    }

    // Generate Excel report
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Aging Report');

    // Summary section
    sheet.addRow(['Accounts Receivable Aging Report']);
    sheet.addRow([`As of: ${asOfDate.toLocaleDateString('de-CH')}`]);
    sheet.addRow([]);
    sheet.addRow(['Age Bucket', 'Amount (CHF)', '% of Total']);
    
    const grandTotal = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);
    
    for (const [bucket, data] of Object.entries(buckets)) {
      const pct = grandTotal > 0 ? (data.total / grandTotal * 100).toFixed(1) : '0.0';
      sheet.addRow([bucket, data.total / 100, `${pct}%`]);
    }
    
    sheet.addRow([]);
    sheet.addRow(['TOTAL', grandTotal / 100, '100%']);

    // Detail section
    sheet.addRow([]);
    sheet.addRow(['DETAIL BY INVOICE']);
    sheet.addRow(['Invoice #', 'Customer', 'Invoice Date', 'Due Date', 'Days Overdue', 'Balance']);

    for (const invoice of openInvoices) {
      const daysOverdue = Math.max(0, Math.floor(
        (asOfDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
      
      sheet.addRow([
        invoice.invoiceNumber,
        invoice.recipientOrg.name,
        invoice.issueDate,
        invoice.dueDate,
        daysOverdue,
        invoice.balanceDue / 100,
      ]);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Create secure shareable link for export
   */
  async createShareableLink(
    exportId: string,
    options: ShareOptions,
  ): Promise<{ url: string; password?: string }> {
    const token = randomBytes(32).toString('hex');
    const password = options.requirePassword 
      ? this.generateReadablePassword() 
      : null;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (options.expiryDays || 7));

    await this.prisma.accountantExport.update({
      where: { id: exportId },
      data: {
        shareToken: token,
        shareExpiry: expiry,
        sharePassword: password ? await bcrypt.hash(password, 10) : null,
        maxDownloads: options.maxDownloads,
      },
    });

    const url = `${process.env.APP_URL}/exports/download/${token}`;

    return { url, password };
  }

  /**
   * Generate human-readable password for exports
   */
  private generateReadablePassword(): string {
    const adjectives = ['Swift', 'Bright', 'Clear', 'Fresh', 'Smart'];
    const nouns = ['Alpine', 'Summit', 'River', 'Forest', 'Valley'];
    const numbers = Math.floor(Math.random() * 900) + 100;
    
    return `${adjectives[Math.floor(Math.random() * 5)]}${nouns[Math.floor(Math.random() * 5)]}${numbers}`;
  }

  /**
   * Process scheduled exports (runs daily at 6 AM)
   */
  @Cron('0 6 * * *', { timeZone: 'Europe/Zurich' })
  async processScheduledExports() {
    const today = new Date();
    
    const dueExports = await this.prisma.scheduledExport.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: today },
      },
      include: { organization: true },
    });

    for (const scheduled of dueExports) {
      try {
        // Calculate period based on frequency
        const period = this.calculateExportPeriod(scheduled.frequency);
        
        // Generate export
        const exportJob = await this.createExport({
          organizationId: scheduled.organizationId,
          exportType: scheduled.exportType,
          format: scheduled.format,
          periodStart: period.start,
          periodEnd: period.end,
        });

        // Create shareable link
        const { url, password } = await this.createShareableLink(exportJob.id, {
          requirePassword: scheduled.includePassword,
          expiryDays: 30,
        });

        // Email to accountant
        await this.emailService.sendEmail({
          to: scheduled.recipientEmail,
          template: 'scheduled_export_ready',
          data: {
            organizationName: scheduled.organization.name,
            exportName: scheduled.name,
            periodStart: period.start.toLocaleDateString('de-CH'),
            periodEnd: period.end.toLocaleDateString('de-CH'),
            downloadUrl: url,
            password: password,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-CH'),
          },
        });

        // Update next run
        await this.prisma.scheduledExport.update({
          where: { id: scheduled.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: this.calculateNextRunDate(scheduled.frequency, scheduled.dayOfMonth),
          },
        });
      } catch (error) {
        this.logger.error(`Failed scheduled export ${scheduled.id}:`, error);
      }
    }
  }
}
```

### Admin UI for Exports

```tsx
// admin/src/pages/invoicing/ExportCenter.tsx
const ExportCenter: React.FC = () => {
  const [exportType, setExportType] = useState<ExportType>('INVOICE_REGISTER');
  const [format, setFormat] = useState<ExportFormat>('XLSX');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const generateExport = async () => {
    const result = await exportService.createExport({
      exportType,
      format,
      periodStart: dateRange.start,
      periodEnd: dateRange.end,
    });
    
    // Show share dialog
    setExportResult(result);
    setShowShareDialog(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Export Center</h1>
      
      {/* Quick export buttons */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <QuickExportCard
          title="Monthly Package"
          description="Complete invoice, payment & VAT reports"
          icon={<Package />}
          onClick={() => generateQuickExport('MONTHLY_PACKAGE')}
        />
        <QuickExportCard
          title="VAT Report"
          description="Swiss MWST breakdown by rate"
          icon={<Receipt />}
          onClick={() => generateQuickExport('VAT_REPORT')}
        />
        <QuickExportCard
          title="Aging Report"
          description="Outstanding receivables by age"
          icon={<Clock />}
          onClick={() => generateQuickExport('AGING_REPORT')}
        />
      </div>

      {/* Custom export builder */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectItem value="INVOICE_REGISTER">Invoice Register</SelectItem>
                <SelectItem value="DETAILED_TRANSACTIONS">Line Item Details</SelectItem>
                <SelectItem value="PAYMENT_JOURNAL">Payment Journal</SelectItem>
                <SelectItem value="VAT_REPORT">VAT Report</SelectItem>
                <SelectItem value="AGING_REPORT">Aging Report</SelectItem>
              </Select>
            </div>
            
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectItem value="XLSX">Excel (.xlsx)</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="PDF">PDF Report</SelectItem>
                <SelectItem value="DATEV">DATEV Format</SelectItem>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label>Period</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>
          
          <Button className="mt-4" onClick={generateExport}>
            <Download className="w-4 h-4 mr-2" />
            Generate Export
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled exports */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scheduled Exports for Accountant</CardTitle>
          <CardDescription>
            Automatically generate and email reports to your accountant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduledExportsList />
          <Button variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Scheduled Export
          </Button>
        </CardContent>
      </Card>

      {/* Share dialog */}
      <ShareExportDialog
        open={showShareDialog}
        export={exportResult}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
};

// Share dialog component
const ShareExportDialog: React.FC<ShareExportDialogProps> = ({
  open,
  export: exportData,
  onClose,
}) => {
  const [shareUrl, setShareUrl] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const createLink = async (withPassword: boolean) => {
    const result = await exportService.createShareableLink(exportData.id, {
      requirePassword: withPassword,
      expiryDays: 7,
    });
    setShareUrl(result.url);
    setPassword(result.password || '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Export with Accountant</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Direct download */}
          <Button className="w-full" onClick={() => downloadExport(exportData.id)}>
            <Download className="w-4 h-4 mr-2" />
            Download Now
          </Button>

          <Separator />

          {/* Create shareable link */}
          <div>
            <Label>Create Shareable Link</Label>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => createLink(false)}>
                Without Password
              </Button>
              <Button variant="outline" onClick={() => createLink(true)}>
                With Password
              </Button>
            </div>
          </div>

          {shareUrl && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label>Share Link (expires in 7 days)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={shareUrl} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <Label>Password</Label>
                  <div className="font-mono bg-white p-2 rounded border">
                    {password}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Share this password separately with your accountant
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Email directly */}
          <div>
            <Label>Email to Accountant</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                placeholder="accountant@example.com"
                value={accountantEmail}
                onChange={(e) => setAccountantEmail(e.target.value)}
              />
              <Button onClick={sendToAccountant}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Export API Endpoints

```
# Export Generation
POST   /api/exports                           # Create new export
GET    /api/exports                           # List exports for organization
GET    /api/exports/:id                       # Get export status/details
GET    /api/exports/:id/download              # Download export file
DELETE /api/exports/:id                       # Delete export

# Sharing
POST   /api/exports/:id/share                 # Create shareable link
DELETE /api/exports/:id/share                 # Revoke share link
POST   /api/exports/:id/email                 # Email export to recipient

# Public download (token-based)
GET    /api/exports/download/:token           # Download via share token
POST   /api/exports/download/:token/verify    # Verify password

# Scheduled Exports
POST   /api/scheduled-exports                 # Create scheduled export
GET    /api/scheduled-exports                 # List scheduled exports
PATCH  /api/scheduled-exports/:id             # Update schedule
DELETE /api/scheduled-exports/:id             # Delete schedule
POST   /api/scheduled-exports/:id/run         # Force run now
```

---

## 12. API Endpoints

### 12.1 Invoice Endpoints (Full CRUD)

```
# Core Invoice Operations
POST   /api/invoices                        # Create draft invoice
GET    /api/invoices                        # List invoices (with filters, pagination)
GET    /api/invoices/:id                    # Get invoice details
PATCH  /api/invoices/:id                    # Update draft invoice
DELETE /api/invoices/:id                    # Delete draft invoice (soft delete)

# Status Transitions
POST   /api/invoices/:id/finalize           # Finalize draft → pending/approved
POST   /api/invoices/:id/approve            # Approve (for approval workflow)
POST   /api/invoices/:id/send               # Send invoice via email
POST   /api/invoices/:id/mark-sent          # Mark as sent (manual)
POST   /api/invoices/:id/cancel             # Cancel/void invoice
POST   /api/invoices/:id/write-off          # Write off as bad debt

# Payments
POST   /api/invoices/:id/payments           # Record payment
GET    /api/invoices/:id/payments           # List payments for invoice
DELETE /api/invoices/:id/payments/:paymentId # Delete/void payment
POST   /api/invoices/:id/refund             # Process refund

# Documents
GET    /api/invoices/:id/pdf                # Download/generate PDF
GET    /api/invoices/:id/qr-payload         # Get raw QR payload
POST   /api/invoices/:id/regenerate-pdf     # Regenerate PDF

# Actions
POST   /api/invoices/:id/duplicate          # Clone as new draft
POST   /api/invoices/:id/credit-note        # Create credit note
POST   /api/invoices/:id/receipt            # Generate payment receipt
POST   /api/invoices/:id/reminders          # Create/schedule reminder
GET    /api/invoices/:id/activity           # Get audit log/activity
```

### 12.2 Quote/Estimate Endpoints

```
# Core Operations
POST   /api/quotes                          # Create quote
GET    /api/quotes                          # List quotes
GET    /api/quotes/:id                      # Get quote details
PATCH  /api/quotes/:id                      # Update quote
DELETE /api/quotes/:id                      # Delete quote

# Status & Actions
POST   /api/quotes/:id/send                 # Send quote to client
POST   /api/quotes/:id/convert              # Convert to invoice
POST   /api/quotes/:id/duplicate            # Clone quote

# Documents
GET    /api/quotes/:id/pdf                  # Download PDF
```

### 12.3 Recurring Invoice Endpoints

```
# Core Operations
POST   /api/recurring-invoices              # Create recurring template
GET    /api/recurring-invoices              # List recurring invoices
GET    /api/recurring-invoices/:id          # Get recurring invoice details
PATCH  /api/recurring-invoices/:id          # Update template
DELETE /api/recurring-invoices/:id          # Delete template

# Status & Actions
POST   /api/recurring-invoices/:id/pause    # Pause recurring
POST   /api/recurring-invoices/:id/resume   # Resume recurring
POST   /api/recurring-invoices/:id/cancel   # Cancel recurring
POST   /api/recurring-invoices/:id/generate # Force generate next invoice

# History
GET    /api/recurring-invoices/:id/invoices # List generated invoices
```

### 12.4 Bank Account Endpoints

```
POST   /api/organizations/:orgId/bank-accounts           # Create bank account
GET    /api/organizations/:orgId/bank-accounts           # List bank accounts
GET    /api/organizations/:orgId/bank-accounts/:id       # Get bank account
PATCH  /api/organizations/:orgId/bank-accounts/:id       # Update bank account
DELETE /api/organizations/:orgId/bank-accounts/:id       # Deactivate bank account
POST   /api/organizations/:orgId/bank-accounts/:id/verify # Verify bank account (admin)
POST   /api/organizations/:orgId/bank-accounts/:id/default # Set as default
```

### 12.5 Invoice Templates Endpoints

```
POST   /api/invoice-templates               # Create template
GET    /api/invoice-templates               # List templates
GET    /api/invoice-templates/:id           # Get template
PATCH  /api/invoice-templates/:id           # Update template
DELETE /api/invoice-templates/:id           # Delete template
POST   /api/invoice-templates/:id/default   # Set as default
GET    /api/invoice-templates/:id/preview   # Preview template
```

### 12.6 Tax Rate Endpoints

```
GET    /api/tax-rates                       # List tax rates
POST   /api/tax-rates                       # Create custom tax rate
PATCH  /api/tax-rates/:id                   # Update tax rate
DELETE /api/tax-rates/:id                   # Delete tax rate
```

### 12.7 Validation Endpoints

```
POST   /api/invoicing/validate-iban         # Validate Swiss IBAN
POST   /api/invoicing/validate-reference    # Validate QRR/SCOR reference
POST   /api/invoicing/generate-reference    # Generate reference number
POST   /api/invoicing/preview-qr            # Generate QR preview (no save)
POST   /api/invoicing/calculate-totals      # Calculate invoice totals
```

### 12.8 Reports & Analytics Endpoints

```
GET    /api/invoicing/reports/summary       # Invoice summary (counts, totals)
GET    /api/invoicing/reports/aging         # Accounts receivable aging
GET    /api/invoicing/reports/revenue       # Revenue by period
GET    /api/invoicing/reports/outstanding   # Outstanding invoices
GET    /api/invoicing/reports/payments      # Payment report
GET    /api/invoicing/export                # Export invoices (CSV/Excel)
```

---

## 13. Email & Notifications

### 13.1 Email Templates

The system includes multilingual email templates for all invoice-related communications:

| Template | Trigger | Languages |
|----------|---------|-----------|
| `invoice_created` | Invoice sent to client | DE, FR, IT, EN |
| `invoice_reminder_before_due` | X days before due date | DE, FR, IT, EN |
| `invoice_reminder_due` | On due date | DE, FR, IT, EN |
| `invoice_overdue` | X days after due date | DE, FR, IT, EN |
| `invoice_final_notice` | Final notice before collection | DE, FR, IT, EN |
| `payment_received` | Payment recorded | DE, FR, IT, EN |
| `payment_receipt` | Receipt attached | DE, FR, IT, EN |
| `quote_sent` | Quote sent to client | DE, FR, IT, EN |
| `quote_accepted` | Client accepted quote | DE, FR, IT, EN |
| `quote_expiring` | Quote expiring soon | DE, FR, IT, EN |
| `recurring_generated` | Recurring invoice created | DE, FR, IT, EN |

### 13.2 Reminder Scheduling

```typescript
// api/src/invoicing/reminder/reminder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailNotificationService } from '../../email-notification/email-notification.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailNotificationService,
  ) {}

  /**
   * Default reminder schedule:
   * - 7 days before due: Friendly reminder
   * - On due date: Due today reminder
   * - 7 days overdue: First overdue notice
   * - 14 days overdue: Second overdue notice
   * - 30 days overdue: Final notice
   */
  async createDefaultReminders(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const reminders = [
      { type: 'BEFORE_DUE', days: -7 },  // 7 days before
      { type: 'ON_DUE', days: 0 },        // On due date
      { type: 'AFTER_DUE', days: 7 },     // 7 days after
      { type: 'AFTER_DUE', days: 14 },    // 14 days after
      { type: 'FINAL_NOTICE', days: 30 }, // 30 days after
    ];

    for (const reminder of reminders) {
      const scheduledDate = new Date(invoice.dueDate);
      scheduledDate.setDate(scheduledDate.getDate() + reminder.days);

      // Only create if in the future
      if (scheduledDate > new Date()) {
        await this.prisma.invoiceReminder.create({
          data: {
            invoiceId,
            reminderType: reminder.type as ReminderType,
            scheduledDate,
          },
        });
      }
    }
  }

  /**
   * Process scheduled reminders
   * Runs every hour to send due reminders
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processReminders() {
    const now = new Date();
    
    const dueReminders = await this.prisma.invoiceReminder.findMany({
      where: {
        emailSent: false,
        scheduledDate: { lte: now },
        invoice: {
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
      },
      include: {
        invoice: {
          include: {
            recipientOrg: true,
            issuerOrg: true,
          },
        },
      },
    });

    this.logger.log(`Processing ${dueReminders.length} reminders`);

    for (const reminder of dueReminders) {
      try {
        // Send reminder email
        await this.sendReminderEmail(reminder);

        // Mark as sent
        await this.prisma.invoiceReminder.update({
          where: { id: reminder.id },
          data: {
            emailSent: true,
            sentDate: new Date(),
          },
        });

        this.logger.log(`Sent reminder for invoice ${reminder.invoice.invoiceNumber}`);
      } catch (error) {
        this.logger.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }
  }

  private async sendReminderEmail(reminder: InvoiceReminderWithRelations) {
    const { invoice } = reminder;
    const template = this.getTemplateForReminderType(reminder.reminderType);
    
    // Get primary contact email
    const recipientEmail = invoice.recipientOrg.email;
    
    await this.emailService.sendEmail({
      to: recipientEmail,
      template,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: this.formatCurrency(invoice.balanceDue, invoice.currency),
        dueDate: this.formatDate(invoice.dueDate),
        clientName: invoice.recipientOrg.name,
        issuerName: invoice.issuerOrg.name,
        portalLink: this.generatePortalLink(invoice.clientPortalToken),
      },
      attachments: reminder.reminderType === 'FINAL_NOTICE' 
        ? [{ filename: `${invoice.invoiceNumber}.pdf`, path: invoice.pdfAsset?.publicUrl }]
        : [],
    });
  }

  private getTemplateForReminderType(type: ReminderType): string {
    const templates = {
      BEFORE_DUE: 'invoice_reminder_before_due',
      ON_DUE: 'invoice_reminder_due',
      AFTER_DUE: 'invoice_overdue',
      FINAL_NOTICE: 'invoice_final_notice',
    };
    return templates[type];
  }
}
```

### 13.3 Notification Events

The invoicing module emits events for integration with the notification system:

```typescript
// Events emitted by invoicing module
const INVOICE_EVENTS = {
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_VIEWED: 'invoice.viewed',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PARTIALLY_PAID: 'invoice.partially_paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_CANCELLED: 'invoice.cancelled',
  
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_PROCESSED: 'refund.processed',
  
  QUOTE_SENT: 'quote.sent',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_DECLINED: 'quote.declined',
  QUOTE_EXPIRED: 'quote.expired',
  
  RECURRING_GENERATED: 'recurring.invoice_generated',
  RECURRING_FAILED: 'recurring.generation_failed',
  RECURRING_COMPLETED: 'recurring.completed',
};
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

```
api/src/invoicing/__tests__/
├── qr-reference.generator.spec.ts    # QRR/SCOR generation
├── iban.validator.spec.ts            # IBAN validation
├── qr-bill.validator.spec.ts         # Full QR-bill validation
└── qr-bill.service.spec.ts           # Payload generation
```

#### Test Cases for QRR Reference

```typescript
describe('QrReferenceGenerator', () => {
  describe('generateQRR', () => {
    it('should generate valid 27-digit QRR', () => {
      const ref = generator.generateQRR('12345', '000001');
      expect(ref).toHaveLength(27);
      expect(ref).toMatch(/^\d{27}$/);
    });

    it('should calculate correct Mod-10 check digit', () => {
      // Known test vectors from SIX documentation
      expect(generator.validateQRR('210000000003139471430009017')).toBe(true);
      expect(generator.validateQRR('210000000003139471430009018')).toBe(false);
    });

    it('should pad short invoice numbers', () => {
      const ref = generator.generateQRR('1');
      expect(ref.substring(0, 26)).toBe('00000000000000000000000001');
    });
  });

  describe('generateSCOR', () => {
    it('should generate valid ISO 11649 reference', () => {
      const ref = generator.generateSCOR('539007547034');
      expect(ref).toMatch(/^RF\d{2}/);
      expect(generator.validateSCOR(ref)).toBe(true);
    });

    it('should reject base reference over 21 chars', () => {
      expect(() => generator.generateSCOR('A'.repeat(22))).toThrow();
    });
  });
});
```

#### Test Cases for IBAN Validation

```typescript
describe('IbanValidator', () => {
  describe('validateSwissIban', () => {
    it('should validate correct Swiss IBAN', () => {
      const result = validator.validateSwissIban('CH93 0076 2011 6238 5295 7');
      expect(result.isValid).toBe(true);
      expect(result.isSwiss).toBe(true);
    });

    it('should identify QR-IBAN', () => {
      const result = validator.validateSwissIban('CH44 3199 9123 0008 8901 2');
      expect(result.isQrIban).toBe(true);
    });

    it('should identify non-QR-IBAN', () => {
      const result = validator.validateSwissIban('CH93 0076 2011 6238 5295 7');
      expect(result.isQrIban).toBe(false);
    });

    it('should reject invalid checksum', () => {
      const result = validator.validateSwissIban('CH93 0076 2011 6238 5295 0');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateIbanReferenceCompatibility', () => {
    it('should require QRR for QR-IBAN', () => {
      const result = validator.validateIbanReferenceCompatibility(
        'CH44 3199 9123 0008 8901 2',
        'SCOR'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject QRR for non-QR-IBAN', () => {
      const result = validator.validateIbanReferenceCompatibility(
        'CH93 0076 2011 6238 5295 7',
        'QRR'
      );
      expect(result.valid).toBe(false);
    });
  });
});
```

### 14.2 Integration Tests

```typescript
describe('InvoicingService (Integration)', () => {
  it('should create invoice with valid QR-bill', async () => {
    const invoice = await invoicingService.createInvoice({
      recipientOrgId: testOrg.id,
      type: 'SUBSCRIPTION',
      lineItems: [{ description: 'Monthly subscription', quantity: 1, unitPrice: 15000 }],
    });

    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(invoice.referenceNumber).toHaveLength(27);
    expect(invoice.status).toBe('DRAFT');
  });

  it('should generate valid PDF with QR code', async () => {
    const invoice = await invoicingService.issueInvoice(draftInvoice.id);
    
    expect(invoice.pdfAssetId).toBeDefined();
    expect(invoice.qrPayloadHash).toHaveLength(64);
    
    // Verify PDF exists in storage
    const pdfUrl = await uploadService.getSignedUrl(invoice.pdfAssetId);
    expect(pdfUrl).toContain('invoices/');
  });

  it('should record payment and update status', async () => {
    await invoicingService.recordPayment(invoice.id, {
      amount: invoice.totalAmount,
      paymentDate: new Date(),
      paymentMethod: 'bank_transfer',
      transactionRef: 'REF123',
    });

    const updated = await invoicingService.getInvoice(invoice.id);
    expect(updated.status).toBe('PAID');
    expect(updated.paidAmount).toBe(invoice.totalAmount);
  });
});
```

### 14.3 QR-Bill Validation Tests

```typescript
describe('QR-Bill Compliance', () => {
  it('should generate SIX-compliant QR payload', () => {
    const payload = qrBillService.generateQrPayload(testData);
    const lines = payload.payload.split('\n');

    // Header validation
    expect(lines[0]).toBe('SPC');
    expect(lines[1]).toBe('0200');
    expect(lines[2]).toBe('1');

    // Creditor IBAN
    expect(lines[3]).toMatch(/^CH\d{2}\d{17}$/);

    // Amount format
    expect(lines[18]).toMatch(/^\d+\.\d{2}$/);

    // Currency
    expect(['CHF', 'EUR']).toContain(lines[19]);

    // Trailer
    expect(lines[30]).toBe('EPD');
  });

  it('should produce scannable QR code', async () => {
    const pdf = await pdfService.generateInvoicePdf(testInvoice);
    
    // Extract QR code from PDF and decode
    // (Would use a QR decoder library in real tests)
    const decodedPayload = await extractAndDecodeQrFromPdf(pdf.pdfBuffer);
    
    expect(decodedPayload).toBe(pdf.qrPayload);
  });
});
```

---

## 15. Implementation Phases

### Overview

The implementation is divided into 10 phases over approximately 12-14 weeks:

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 1-2    │ Phase 1: Database & Core Models                  │
│  Week 2-3    │ Phase 2: Swiss QR-Bill Compliance                │
│  Week 3-4    │ Phase 3: PDF Generation Pipeline                 │
│  Week 4-5    │ Phase 4: Core Invoice Service                    │
│  Week 5-6    │ Phase 5: Quotes & Credit Notes                   │
│  Week 6-7    │ Phase 6: Recurring Invoices                      │
│  Week 7-8    │ Phase 7: Payment Management                      │
│  Week 8-9    │ Phase 8: Client Portal                           │
│  Week 9-11   │ Phase 9: Admin Dashboard                         │
│  Week 11-12  │ Phase 10: Email & Notifications                  │
│  Week 12-14  │ Phase 11: Testing, Polish & Launch               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Database & Core Models (Week 1-2)

**Database Schema**

- [ ] Create Prisma migration for all new enums
  - [ ] `DocumentType`, `InvoiceStatus`, `QuoteStatus`
  - [ ] `InvoiceCategory`, `RecurringFrequency`, `RecurringStatus`
  - [ ] `DiscountType`, `PaymentTerms`, `ReminderType`
  - [ ] `ReferenceType`, `AddressType`
- [ ] Create core invoice models
  - [ ] `Invoice` (full-featured with all fields)
  - [ ] `InvoiceLine` (with discount & tax support)
  - [ ] `InvoiceTax` (multi-tax rate breakdown)
  - [ ] `InvoicePayment` (deposits, refunds)
  - [ ] `InvoiceReminder`
  - [ ] `InvoiceAttachment`
  - [ ] `InvoiceAuditLog`
- [ ] Create supporting models
  - [ ] `TaxRate` (configurable tax rates)
  - [ ] `OrganizationBankAccount`
  - [ ] `InvoiceNumberSequence`
  - [ ] `InvoiceTemplate`
- [ ] Extend `Organization` model
  - [ ] Add billing address fields
  - [ ] Add VAT number
  - [ ] Add relations to new models
- [ ] Add `INVOICE_PDF`, `QUOTE_PDF`, `RECEIPT_PDF` to `AssetKind`
- [ ] Run and verify migration

**Validation Services**

- [ ] Implement `IbanValidator`
  - [ ] Swiss/LI IBAN format validation
  - [ ] Mod-97 checksum validation
  - [ ] QR-IBAN detection (IID 30000-31999)
  - [ ] IBAN-Reference compatibility check
- [ ] Implement `QrReferenceGenerator`
  - [ ] QRR generation (27 digits, Mod-10)
  - [ ] SCOR generation (ISO 11649)
  - [ ] Reference validation
  - [ ] Display formatting
- [ ] Write unit tests for validators (100% coverage)

---

### Phase 2: Swiss QR-Bill Compliance (Week 2-3)

**QR-Bill Service**

- [ ] Implement `QrBillService`
  - [ ] `generateQrPayload()` - SIX SPS 2022 compliant
  - [ ] `parseQrPayload()` - for verification
  - [ ] `validateQrBillData()` - full validation
  - [ ] Payload hash generation (SHA-256)
- [ ] Implement `QrBillValidator`
  - [ ] Header validation (SPC/0200/1)
  - [ ] Creditor validation
  - [ ] Amount/currency validation
  - [ ] Reference type/value matching
- [ ] Test with official SIX test vectors
- [ ] Generate Swiss QR code with cross overlay

**Bank Account Management**

- [ ] Implement `BankAccountService`
  - [ ] CRUD operations
  - [ ] IBAN validation on create/update
  - [ ] Default account management
  - [ ] Verification workflow
- [ ] Implement `BankAccountController`
  - [ ] REST endpoints
  - [ ] Role-based access control
- [ ] Write integration tests

---

### Phase 3: PDF Generation Pipeline (Week 3-4)

**Dependencies**

- [ ] Install required packages
  - [ ] `pdf-lib` for PDF manipulation
  - [ ] `puppeteer` for HTML→PDF conversion
  - [ ] `qrcode` for QR generation
  - [ ] `sharp` for image processing

**PDF Templates**

- [ ] Create A4 invoice template (HTML/CSS)
  - [ ] Header section (logo, company info)
  - [ ] Recipient section
  - [ ] Invoice details (number, dates)
  - [ ] Line items table
  - [ ] Totals section
  - [ ] Footer with terms
- [ ] Create QR-bill payment slip section
  - [ ] Receipt section (62x105mm)
  - [ ] Payment section (148x105mm)
  - [ ] Correct Swiss cross overlay (7x7mm)
  - [ ] Perforation line

**PDF Service**

- [ ] Implement `PdfService`
  - [ ] `generateInvoicePdf()` - full invoice + QR-bill
  - [ ] `generateQuotePdf()` - quote format
  - [ ] `generateReceiptPdf()` - payment receipt
  - [ ] `generateCreditNotePdf()` - credit note
- [ ] Implement Swiss cross overlay using `sharp`
- [ ] Validate PDF dimensions and compliance
- [ ] Integrate with `UploadService` for S3/R2 storage
- [ ] Implement signed URL generation

---

### Phase 4: Core Invoice Service (Week 4-5)

**InvoicingService**

- [ ] Invoice number sequence generation
  - [ ] Per-organization sequences
  - [ ] Configurable format
  - [ ] Year reset option
- [ ] Full CRUD operations
  - [ ] Create draft invoice
  - [ ] Update draft (editable fields)
  - [ ] Soft delete
  - [ ] Duplicate/clone
- [ ] Line item management
  - [ ] Add/update/remove lines
  - [ ] Position reordering
  - [ ] Discount calculation (line & invoice level)
  - [ ] Tax calculation (single & multi-rate)
  - [ ] Totals recalculation
- [ ] Status transitions
  - [ ] DRAFT → PENDING → APPROVED → SENT
  - [ ] Validation at each transition
  - [ ] PDF generation on finalize
- [ ] Audit logging
  - [ ] Track all changes
  - [ ] Store before/after snapshots
  - [ ] Record user, IP, timestamp

**InvoicingController**

- [ ] Implement all REST endpoints
- [ ] Request validation (DTOs)
- [ ] Role-based access control
- [ ] Swagger documentation
- [ ] Rate limiting for PDF generation

---

### Phase 5: Quotes & Credit Notes (Week 5-6)

**QuoteService**

- [ ] Quote CRUD operations
- [ ] Quote numbering (separate sequence)
- [ ] Status management
  - [ ] DRAFT → SENT → ACCEPTED/DECLINED/EXPIRED
- [ ] Quote → Invoice conversion
  - [ ] Copy line items
  - [ ] Link documents
  - [ ] Update quote status
- [ ] Quote PDF generation
- [ ] Validity/expiry tracking

**CreditNoteService**

- [ ] Create credit note from invoice
  - [ ] Full or partial credit
  - [ ] Negative amounts
  - [ ] Link to original invoice
- [ ] Credit note numbering
- [ ] Apply credit to invoice balance
- [ ] Credit note PDF generation

**Receipt Generation**

- [ ] Payment receipt generation
- [ ] Receipt PDF template
- [ ] Auto-generate on payment (optional)

---

### Phase 6: Recurring Invoices (Week 6-7)

**RecurringInvoiceService**

- [ ] Create recurring template
  - [ ] Frequency options (daily→annually + custom)
  - [ ] Day of month/week settings
  - [ ] Start/end date
  - [ ] Max occurrences
- [ ] Scheduling system
  - [ ] Calculate next generation date
  - [ ] Cron job for daily processing
  - [ ] Service period calculation
- [ ] Invoice generation from template
  - [ ] Copy line items
  - [ ] Calculate amounts
  - [ ] Link to template
- [ ] Auto-actions
  - [ ] Auto-finalize
  - [ ] Auto-send
  - [ ] Auto-create reminders
- [ ] Status management
  - [ ] Pause/resume
  - [ ] Cancel
  - [ ] Mark completed

**Admin UI for Recurring**

- [ ] Recurring invoice list
- [ ] Create/edit recurring template
- [ ] View generated invoices
- [ ] Pause/resume controls

---

### Phase 7: Payment Management (Week 7-8)

**PaymentService**

- [ ] Record payments
  - [ ] Full and partial payments
  - [ ] Multiple payment methods
  - [ ] Deposit/advance payments
  - [ ] Auto-update invoice status
- [ ] Process refunds
  - [ ] Full and partial refunds
  - [ ] Stripe refund integration
  - [ ] Update balances
- [ ] Late fee calculation
  - [ ] Grace period support
  - [ ] Percentage or fixed amount
  - [ ] Auto-apply via cron

**Stripe Integration**

- [ ] Payment intent creation
- [ ] Webhook handlers
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.failed`
  - [ ] `charge.refunded`
- [ ] Auto-reconciliation

**Bank Reconciliation (Optional)**

- [ ] Match payments by reference
- [ ] Fuzzy matching fallback
- [ ] Manual matching UI

---

### Phase 8: Client Portal (Week 8-9)

**ClientPortalService**

- [ ] Secure token generation
- [ ] Token validation & expiry
- [ ] Invoice viewing
- [ ] Quote viewing & actions
  - [ ] Accept quote
  - [ ] Decline quote
- [ ] View tracking (first view)

**Online Payment**

- [ ] Stripe Elements integration
- [ ] Payment form component
- [ ] Full/partial payment options
- [ ] Deposit payment

**Portal Frontend**

- [ ] Invoice view page
- [ ] Quote view page
- [ ] Payment form
- [ ] Payment history
- [ ] Mobile-responsive design
- [ ] Branded with issuer logo/colors

---

### Phase 9: Admin Dashboard (Week 9-11)

**Invoice Management Pages**

- [ ] Invoice list with filters
  - [ ] Status, date range, customer
  - [ ] Search by number/reference
  - [ ] Pagination & sorting
- [ ] Invoice detail view
  - [ ] PDF preview (embedded)
  - [ ] Status timeline
  - [ ] Activity log
  - [ ] Payment history
- [ ] Invoice creation wizard
  - [ ] Customer selection
  - [ ] Line item entry
  - [ ] Discount & tax settings
  - [ ] Payment terms
  - [ ] Preview & confirm
- [ ] Quick actions
  - [ ] Send invoice
  - [ ] Record payment
  - [ ] Create credit note
  - [ ] Duplicate

**Quote Management**

- [ ] Quote list
- [ ] Quote creation
- [ ] Quote → Invoice conversion

**Recurring Management**

- [ ] Recurring template list
- [ ] Template creation/editing
- [ ] Schedule visualization

**Reports & Analytics**

- [ ] Dashboard widgets
  - [ ] Outstanding invoices
  - [ ] Revenue this month
  - [ ] Overdue count
- [ ] Aging report
- [ ] Revenue report

**Accountant Export System**

- [ ] Export Center page
  - [ ] Quick export buttons (Monthly, VAT, Aging)
  - [ ] Custom export builder
  - [ ] Date range selection
  - [ ] Format selection (XLSX, CSV, PDF, DATEV)
- [ ] Export generation
  - [ ] Invoice register export
  - [ ] Detailed transactions export
  - [ ] Payment journal export
  - [ ] Swiss VAT (MWST) report
  - [ ] Accounts receivable aging
  - [ ] Monthly/quarterly package bundles
- [ ] Secure sharing
  - [ ] Password-protected download links
  - [ ] Expiring share URLs
  - [ ] Download count tracking
  - [ ] Email directly to accountant
- [ ] Scheduled exports
  - [ ] Weekly/monthly/quarterly schedules
  - [ ] Auto-email to accountant
  - [ ] Next run date tracking

**Settings**

- [ ] Invoice templates
- [ ] Tax rates
- [ ] Payment terms defaults
- [ ] Reminder settings
- [ ] Bank accounts

---

### Phase 10: Email & Notifications (Week 11-12)

**Email Templates**

- [ ] Create templates (DE, FR, IT, EN)
  - [ ] Invoice sent
  - [ ] Payment reminder (before due)
  - [ ] Payment due today
  - [ ] Overdue notice
  - [ ] Final notice
  - [ ] Payment received
  - [ ] Quote sent
  - [ ] Quote expiring
- [ ] Template variables system
- [ ] PDF attachment support

**ReminderService**

- [ ] Default reminder schedule creation
- [ ] Custom reminder creation
- [ ] Reminder processing cron
- [ ] Email sending with tracking
- [ ] Open/click tracking

**Event System**

- [ ] Emit events for all invoice actions
- [ ] Event listeners for notifications
- [ ] Integration with notification center

---

### Phase 11: Testing, Polish & Launch (Week 12-14)

**Testing**

- [ ] Unit tests
  - [ ] All validators (100% coverage)
  - [ ] Reference generators
  - [ ] Amount calculations
- [ ] Integration tests
  - [ ] Full invoice lifecycle
  - [ ] Payment recording
  - [ ] Recurring generation
  - [ ] Quote conversion
- [ ] E2E tests
  - [ ] Admin UI workflows
  - [ ] Client portal
- [ ] QR code scanning tests
  - [ ] Test with real Swiss banking apps
  - [ ] Verify payment execution
- [ ] PDF compliance testing
  - [ ] Dimensions verification
  - [ ] Print tests

**Performance**

- [ ] PDF caching
- [ ] Query optimization
- [ ] Index verification
- [ ] Load testing

**Documentation**

- [ ] API documentation (Swagger)
- [ ] User guide (admin)
- [ ] Developer guide
- [ ] Troubleshooting guide

**Production Readiness**

- [ ] Error handling review
- [ ] Monitoring & alerting
- [ ] Logging review
- [ ] Security audit
- [ ] GDPR compliance check
- [ ] Backup verification

---

## Appendix A: Official Resources

- **SIX Swiss Payment Standards**: https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-en.pdf
- **QR-Bill Validators**: https://www.swiss-qr-invoice.org/validator/
- **ISO 11649 SCOR**: https://www.iso.org/standard/50649.html
- **Swiss IBAN Format**: https://www.six-group.com/dam/download/banking-services/standardization/iban/sic-iban-en.pdf

---

## Appendix B: Test IBAN Examples

| Type | IBAN | Bank | Use Case |
|------|------|------|----------|
| QR-IBAN | CH44 3199 9123 0008 8901 2 | QR-IID (PostFinance) | QRR references |
| Regular | CH93 0076 2011 6238 5295 7 | PostFinance | SCOR/NON references |
| Regular | CH56 0483 5012 3456 7800 9 | Credit Suisse | SCOR/NON references |

**Note**: For production, use real verified bank accounts from your organization.

---

*Document Version: 1.0*
*Last Updated: 2025-01-XX*
*Author: ProCrèche Development Team*
