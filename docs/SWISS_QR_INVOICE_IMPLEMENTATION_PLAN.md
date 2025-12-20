# Swiss QR-Bill Invoice Module - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to build a fully functional Swiss QR-bill payment invoice system integrated with ProCrèche's existing NestJS/Prisma architecture. The system will generate legally compliant Swiss QR-bills with validated IBAN accounts, proper reference numbers, and professional PDF output.

---

## Table of Contents

1. [Swiss QR-Bill Compliance Requirements](#1-swiss-qr-bill-compliance-requirements)
2. [Database Schema Design](#2-database-schema-design)
3. [Backend Module Architecture](#3-backend-module-architecture)
4. [Swiss QR-Bill Generation Logic](#4-swiss-qr-bill-generation-logic)
5. [IBAN Validation & Account Setup](#5-iban-validation--account-setup)
6. [PDF Generation Pipeline](#6-pdf-generation-pipeline)
7. [Admin Dashboard Integration](#7-admin-dashboard-integration)
8. [API Endpoints](#8-api-endpoints)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Phases](#10-implementation-phases)

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
// ENUMS
// ============================================

enum InvoiceStatus {
  DRAFT           // Created but not issued
  ISSUED          // Finalized, ready for payment
  SENT            // Sent to customer
  PAID            // Fully paid
  PARTIALLY_PAID  // Partial payment received
  OVERDUE         // Past due date
  CANCELLED       // Voided
  REFUNDED        // Payment returned
}

enum InvoiceType {
  SUBSCRIPTION      // Recurring subscription invoice
  PRODUCT_ORDER     // Marketplace product purchase
  SERVICE_REQUEST   // Service booking
  ONBOARDING_FEE    // Initial setup fee
  PLATFORM_FEE      // Platform usage fee
  CUSTOM            // Manual/custom invoice
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

// ============================================
// CORE INVOICE MODELS
// ============================================

model Invoice {
  id                String          @id @default(uuid())
  
  // Invoice Identification
  invoiceNumber     String          @unique
  referenceNumber   String          // QRR or SCOR reference
  referenceType     ReferenceType   @default(QRR)
  
  // Type & Status
  type              InvoiceType
  status            InvoiceStatus   @default(DRAFT)
  
  // Parties (Creditor = Issuer, Debtor = Recipient)
  issuerOrgId       String
  issuerOrg         Organization    @relation("IssuedInvoices", fields: [issuerOrgId], references: [id])
  recipientOrgId    String
  recipientOrg      Organization    @relation("ReceivedInvoices", fields: [recipientOrgId], references: [id])
  createdById       String
  createdBy         User            @relation("CreatedInvoices", fields: [createdById], references: [id])
  
  // Amounts (all in minor units - centimes)
  subtotalAmount    Int             // Before tax
  taxAmount         Int             // VAT/tax
  totalAmount       Int             // Final amount
  paidAmount        Int             @default(0)
  currency          String          @default("CHF") // CHF or EUR only
  
  // Tax Information
  taxRate           Decimal?        @db.Decimal(5, 2) // e.g., 8.10 for 8.1%
  taxNumber         String?         // VAT registration number
  
  // Dates
  issueDate         DateTime
  dueDate           DateTime
  paidDate          DateTime?
  
  // Payment Information
  paymentTermsDays  Int             @default(30)
  
  // QR-Bill Specific
  qrPayloadRaw      String?         // Full QR code payload for verification
  qrPayloadHash     String?         // SHA-256 hash for integrity
  
  // Additional Information
  messageToRecipient String?        // Unstructured message (max 140 chars)
  internalNotes     String?         // Internal-only notes
  
  // Linked Documents
  pdfAssetId        String?         @unique
  pdfAsset          Asset?          @relation("InvoicePDF", fields: [pdfAssetId], references: [id])
  
  // Related Entities (optional links)
  subscriptionId    String?
  subscription      Subscription?   @relation(fields: [subscriptionId], references: [id])
  orderId           String?
  order             Order?          @relation(fields: [orderId], references: [id])
  
  // Timestamps
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relations
  lineItems         InvoiceLine[]
  payments          InvoicePayment[]
  auditLogs         InvoiceAuditLog[]
  
  @@index([invoiceNumber])
  @@index([issuerOrgId])
  @@index([recipientOrgId])
  @@index([status])
  @@index([issueDate])
  @@index([dueDate])
  @@index([referenceNumber])
  
  @@map("invoices")
}

model InvoiceLine {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Line Item Details
  position        Int       // Display order (1, 2, 3...)
  description     String
  descriptionDe   String?   // German translation
  descriptionFr   String?   // French translation
  descriptionIt   String?   // Italian translation
  
  quantity        Decimal   @db.Decimal(10, 3) // e.g., 1.000, 2.500
  unitPrice       Int       // In minor units (centimes)
  totalPrice      Int       // quantity * unitPrice
  
  // Optional Tax per Line
  taxRate         Decimal?  @db.Decimal(5, 2)
  taxAmount       Int       @default(0)
  
  // Reference to source entity
  productId       String?
  serviceId       String?
  subscriptionPlanId String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([invoiceId])
  @@map("invoice_lines")
}

model InvoicePayment {
  id              String    @id @default(uuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Payment Details
  amount          Int       // Amount paid in minor units
  currency        String    @default("CHF")
  paymentDate     DateTime
  paymentMethod   String    // bank_transfer, stripe, manual, etc.
  transactionRef  String?   // Bank reference or Stripe payment ID
  
  // Stripe Integration
  stripePaymentId String?
  
  // Metadata
  notes           String?
  recordedById    String?
  recordedBy      User?     @relation(fields: [recordedById], references: [id])
  
  createdAt       DateTime  @default(now())
  
  @@index([invoiceId])
  @@index([paymentDate])
  @@map("invoice_payments")
}

model InvoiceAuditLog {
  id          String    @id @default(uuid())
  invoiceId   String
  invoice     Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  action      String    // created, issued, sent, paid, cancelled, etc.
  changes     Json?     // Before/after snapshot
  performedBy String
  performedAt DateTime  @default(now())
  ipAddress   String?
  userAgent   String?
  
  @@index([invoiceId])
  @@index([performedAt])
  @@map("invoice_audit_logs")
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

## 3. Backend Module Architecture

### 3.1 Module Structure

```
api/src/invoicing/
├── invoicing.module.ts              # Main module definition
├── invoicing.controller.ts          # REST API endpoints
├── invoicing.service.ts             # Core invoice business logic
│
├── dto/
│   ├── create-invoice.dto.ts
│   ├── update-invoice.dto.ts
│   ├── invoice-line.dto.ts
│   ├── invoice-filter.dto.ts
│   ├── record-payment.dto.ts
│   └── bank-account.dto.ts
│
├── qr-bill/
│   ├── qr-bill.service.ts           # QR payload generation
│   ├── qr-bill.validator.ts         # Validation logic
│   ├── qr-reference.generator.ts    # QRR/SCOR reference generation
│   ├── iban.validator.ts            # Swiss IBAN validation
│   └── interfaces/
│       └── qr-bill.interfaces.ts
│
├── pdf/
│   ├── pdf.service.ts               # PDF generation orchestration
│   ├── pdf-template.renderer.ts     # HTML template rendering
│   ├── templates/
│   │   ├── invoice-a4.hbs           # A4 invoice template
│   │   └── qr-slip.hbs              # QR payment slip (A6 format)
│   └── assets/
│       ├── swiss-cross.svg          # Swiss cross for QR code
│       └── fonts/                   # Liberation Sans (required font)
│
├── bank-account/
│   ├── bank-account.controller.ts
│   └── bank-account.service.ts
│
├── guards/
│   └── invoice-access.guard.ts      # Role-based access control
│
└── events/
    ├── invoice-created.event.ts
    ├── invoice-paid.event.ts
    └── invoice.listener.ts          # Event handlers
```

### 3.2 Main Module Definition

```typescript
// api/src/invoicing/invoicing.module.ts
import { Module } from '@nestjs/common';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { QrBillService } from './qr-bill/qr-bill.service';
import { QrBillValidator } from './qr-bill/qr-bill.validator';
import { QrReferenceGenerator } from './qr-bill/qr-reference.generator';
import { IbanValidator } from './qr-bill/iban.validator';
import { PdfService } from './pdf/pdf.service';
import { BankAccountController } from './bank-account/bank-account.controller';
import { BankAccountService } from './bank-account/bank-account.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    EmailNotificationModule,
  ],
  controllers: [
    InvoicingController,
    BankAccountController,
  ],
  providers: [
    InvoicingService,
    QrBillService,
    QrBillValidator,
    QrReferenceGenerator,
    IbanValidator,
    PdfService,
    BankAccountService,
  ],
  exports: [
    InvoicingService,
    QrBillService,
  ],
})
export class InvoicingModule {}
```

---

## 4. Swiss QR-Bill Generation Logic

### 4.1 QR-Bill Service

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

### 4.2 Reference Number Generator

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

### 4.3 IBAN Validator

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
    
    // Basic format check
    if (!/^CH\d{2}\d{5}\w{12}$/.test(cleaned) && !/^LI\d{2}\d{5}\w{12}$/.test(cleaned)) {
      return {
        isValid: false,
        isSwiss: false,
        isQrIban: false,
        formattedIban: cleaned,
        error: 'Invalid Swiss/Liechtenstein IBAN format. Must be 21 characters starting with CH or LI.',
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

## 5. IBAN Validation & Account Setup

### 5.1 Bank Account Service

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

## 6. PDF Generation Pipeline

### 6.1 PDF Service

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
    const assetUrl = await this.uploadService.uploadBuffer(
      pdfBuffer,
      fileName,
      'application/pdf',
    );

    return {
      pdfBuffer,
      assetUrl,
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
   */
  private async addSwissCross(qrBuffer: Buffer): Promise<Buffer> {
    // Implementation would use 'sharp' library
    // For now, return as-is (Swiss cross overlay would be added here)
    // The Swiss cross is 7x7mm with a white background and black cross
    return qrBuffer;
  }

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
    
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    
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
    
    // Draw separation line (perforation indicator)
    page.drawLine({
      start: { x: 0, y: qrBillTop },
      end: { x: 595.28, y: qrBillTop },
      thickness: 0.5,
      dashArray: [3, 3],
      color: rgb(0, 0, 0),
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

### 6.2 NPM Dependencies to Add

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "pdf-lib": "^1.17.1",
    "sharp": "^0.33.4",
    "puppeteer": "^22.0.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

---

## 7. Admin Dashboard Integration

### 7.1 Invoice Management Pages

```
admin/src/pages/
├── Invoices.tsx              # Invoice list with filters
├── InvoiceDetail.tsx         # Single invoice view with PDF preview
├── CreateInvoice.tsx         # Invoice creation form
└── components/
    ├── InvoiceTable.tsx
    ├── InvoiceStatusBadge.tsx
    ├── QrBillPreview.tsx     # Live QR-bill preview component
    ├── BankAccountForm.tsx
    └── PaymentRecordModal.tsx
```

### 7.2 Key UI Components

#### Invoice Creation Flow

```typescript
// Simplified component structure
interface CreateInvoiceFormData {
  recipientOrgId: string;
  type: InvoiceType;
  lineItems: InvoiceLineItem[];
  dueDate: Date;
  messageToRecipient?: string;
  // Optional links
  subscriptionId?: string;
  orderId?: string;
}

// Steps:
// 1. Select recipient organization
// 2. Choose invoice type
// 3. Add line items (with live total calculation)
// 4. Set due date and payment terms
// 5. Preview QR-bill (live rendering)
// 6. Confirm and generate
```

#### QR-Bill Preview Component

```tsx
// admin/src/components/QrBillPreview.tsx
interface QrBillPreviewProps {
  creditorIban: string;
  creditorName: string;
  creditorAddress: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  reference: string;
  referenceType: 'QRR' | 'SCOR' | 'NON';
  debtorName?: string;
  debtorAddress?: string;
  message?: string;
}

// Renders a live preview of the QR-bill payment slip
// Updates in real-time as form fields change
// Shows validation errors inline
```

---

## 8. API Endpoints

### 8.1 Invoice Endpoints

```
POST   /api/invoices                    # Create draft invoice
GET    /api/invoices                    # List invoices (with filters)
GET    /api/invoices/:id                # Get invoice details
PATCH  /api/invoices/:id                # Update draft invoice
POST   /api/invoices/:id/issue          # Finalize and issue invoice
POST   /api/invoices/:id/send           # Send invoice via email
POST   /api/invoices/:id/cancel         # Cancel invoice
POST   /api/invoices/:id/record-payment # Record manual payment
GET    /api/invoices/:id/pdf            # Download PDF
GET    /api/invoices/:id/qr-payload     # Get raw QR payload (for verification)
POST   /api/invoices/:id/duplicate      # Create copy as new draft
```

### 8.2 Bank Account Endpoints

```
POST   /api/organizations/:orgId/bank-accounts           # Create bank account
GET    /api/organizations/:orgId/bank-accounts           # List bank accounts
GET    /api/organizations/:orgId/bank-accounts/:id       # Get bank account
PATCH  /api/organizations/:orgId/bank-accounts/:id       # Update bank account
DELETE /api/organizations/:orgId/bank-accounts/:id       # Deactivate bank account
POST   /api/organizations/:orgId/bank-accounts/:id/verify # Verify bank account (admin)
POST   /api/organizations/:orgId/bank-accounts/:id/default # Set as default
```

### 8.3 Validation Endpoints

```
POST   /api/invoicing/validate-iban                      # Validate Swiss IBAN
POST   /api/invoicing/validate-reference                 # Validate QRR/SCOR reference
POST   /api/invoicing/generate-reference                 # Generate reference number
POST   /api/invoicing/preview-qr                         # Generate QR preview (no save)
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

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

### 9.2 Integration Tests

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

### 9.3 QR-Bill Validation Tests

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

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Database & Core Models**

- [ ] Create Prisma migration for new models
- [ ] Implement `Invoice`, `InvoiceLine`, `InvoicePayment`, `InvoiceAuditLog` models
- [ ] Implement `OrganizationBankAccount` model
- [ ] Implement `InvoiceNumberSequence` model
- [ ] Add new relations to `Organization` model
- [ ] Add `INVOICE_PDF` to `AssetKind` enum

**Validation Services**

- [ ] Implement `IbanValidator` with Mod-97 and QR-IBAN detection
- [ ] Implement `QrReferenceGenerator` for QRR and SCOR
- [ ] Implement `QrBillValidator` for full payload validation
- [ ] Write comprehensive unit tests for all validators

### Phase 2: QR-Bill Generation (Week 2-3)
**Core QR-Bill Service**

- [ ] Implement `QrBillService.generateQrPayload()`
- [ ] Implement `QrBillService.parseQrPayload()` for verification
- [ ] Implement Swiss cross overlay for QR codes
- [ ] Test with official SIX test vectors

**Bank Account Management**

- [ ] Implement `BankAccountService` CRUD operations
- [ ] Implement `BankAccountController` with validation
- [ ] Add bank account setup to organization onboarding

### Phase 3: PDF Generation (Week 3-4)
**PDF Pipeline**

- [ ] Install and configure Puppeteer/pdf-lib
- [ ] Create HTML templates for invoice (A4 with QR-bill)
- [ ] Implement `PdfService.generateInvoicePdf()`
- [ ] Implement Swiss cross overlay using sharp
- [ ] Test PDF output dimensions and compliance

**Storage Integration**

- [ ] Integrate with existing `UploadService` for S3/R2 storage
- [ ] Implement PDF URL signing for secure downloads
- [ ] Add cleanup for orphaned PDFs

### Phase 4: Invoice Service (Week 4-5)
**Core Invoice Operations**

- [ ] Implement `InvoicingService` with full CRUD
- [ ] Implement invoice number sequence generation
- [ ] Implement status transitions with validation
- [ ] Implement line item calculations (subtotal, tax, total)
- [ ] Implement audit logging

**Payment Recording**

- [ ] Implement manual payment recording
- [ ] Implement partial payment handling
- [ ] Implement automatic status updates (PAID, PARTIALLY_PAID)
- [ ] Integrate with Stripe webhooks for automated reconciliation

### Phase 5: API & Admin UI (Week 5-6)
**REST API**

- [ ] Implement `InvoicingController` with all endpoints
- [ ] Add role-based access control (guard)
- [ ] Add Swagger documentation
- [ ] Implement rate limiting for PDF generation

**Admin Dashboard**

- [ ] Create invoice list page with filters
- [ ] Create invoice detail/view page with PDF preview
- [ ] Create invoice creation wizard
- [ ] Create QR-bill live preview component
- [ ] Create bank account management UI
- [ ] Create payment recording modal

### Phase 6: Integration & Automation (Week 6-7)
**Event-Driven Invoice Creation**

- [ ] Auto-generate invoice on subscription renewal
- [ ] Auto-generate invoice on order completion
- [ ] Auto-generate invoice on service request completion
- [ ] Implement scheduled invoice generation (recurring)

**Email Integration**

- [ ] Implement invoice email sending
- [ ] Create invoice email templates (multilingual)
- [ ] Add PDF attachment to emails
- [ ] Track email delivery status

### Phase 7: Testing & Polish (Week 7-8)
**Comprehensive Testing**

- [ ] Integration tests for full invoice lifecycle
- [ ] E2E tests for admin UI
- [ ] QR code scanning tests with real devices
- [ ] PDF compliance testing (SIX specifications)

**Production Readiness**

- [ ] Performance optimization (PDF caching)
- [ ] Error handling and recovery
- [ ] Monitoring and alerting
- [ ] Documentation (API, user guides)

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
