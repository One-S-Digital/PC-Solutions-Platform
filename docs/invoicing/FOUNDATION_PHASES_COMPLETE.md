# Swiss QR Invoice Foundation - Phases 1-4 Complete

**Date:** December 21, 2025  
**Status:** ✅ Foundation Complete  
**Author:** Claude (AI Assistant)

---

## Executive Summary

The foundational infrastructure for the Swiss QR-Bill compliant invoicing system has been successfully implemented. This includes the complete database schema, money/VAT calculation engine, invoicing settings API, and Swiss QR compliance layer.

---

## Phase 1: Database Schema & Audit Primitives ✅

### Completed Deliverables

#### New Prisma Enums
- `InvoiceDocumentType` - INVOICE, CREDIT_NOTE, PROFORMA, QUOTE
- `InvoiceDocumentStatus` - DRAFT, ISSUED, SENT, VIEWED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, VOID, ARCHIVED
- `QuoteStatus` - DRAFT, SENT, VIEWED, ACCEPTED, DECLINED, EXPIRED, CONVERTED
- `InvoiceReferenceType` - QRR, SCOR, NON
- `InvoiceAddressType` - STRUCTURED, COMBINED
- `InvoicePaymentTerms` - DUE_ON_RECEIPT, NET_7, NET_10, NET_15, NET_30, NET_45, NET_60, NET_90, CUSTOM
- `VatDisplayMode` - EXCLUDED, INCLUDED

#### New Prisma Models
| Model | Description |
|-------|-------------|
| `InvoicingSettings` | Per-organization invoicing configuration (company details, banking, QR defaults, numbering) |
| `OrganizationBankAccount` | Bank accounts with IBAN validation and QR-IBAN detection |
| `DocumentSequence` | Per-issuer, per-document-type numbering sequences |
| `InvoiceDocument` | Main document model with all financial fields in BigInt minor units |
| `InvoiceLineItem` | Line items with VAT in basis points, quantity, discounts |
| `InvoicePayment` | Payment records with refund tracking |
| `InvoicePdfVersion` | PDF versioning for audit trail |
| `InvoiceAuditLog` | Immutable audit log for document changes |
| `InvoicingSettingsAuditLog` | Audit log for settings changes |

#### Extended AssetKind Enum
Added: `INVOICE_PDF`, `QUOTE_PDF`, `CREDIT_NOTE_PDF`, `PROFORMA_PDF`, `RECEIPT_PDF`

#### Migration File
- **Location:** `api/prisma/migrations/20251221000000_add_invoicing_system/migration.sql`
- All tables, indexes, and foreign key constraints created
- Prisma client regenerated successfully

---

## Phase 2: Money/VAT Calculation Engine ✅

### Completed Deliverables

#### File: `api/src/invoicing/utils/money-engine.ts`

| Function | Description |
|----------|-------------|
| `parseDecimalToBigInt()` | Converts decimal strings to BigInt with precision |
| `roundHalfUp()` | Half-up rounding (banker's rounding) |
| `calculateLineItem()` | Full line item calculation (VAT included/excluded modes) |
| `calculateInvoiceTotalsWithBreakdown()` | Invoice aggregation with VAT breakdown by rate |
| `formatMinorToDecimal()` | Formats centimes to decimal string |
| `formatCurrency()` | Locale-aware currency formatting |
| `formatVatRate()` | Formats basis points to percentage |
| `parseDecimalToMinor()` | Parses currency string to minor units |
| `isFinanciallyLocked()` | Checks if document status prevents edits |
| `isValidQrBillAmount()` | Validates amount within QR-bill limits |
| `calculateBalance()` | Calculates remaining balance |
| `determinePaymentStatus()` | Derives status from amounts |
| `calculateDueDate()` | Calculates due date from payment terms |

#### Swiss VAT Rates (2024+)
- Standard: 8.1% (810 bps)
- Reduced: 2.6% (260 bps)
- Special (accommodation): 3.8% (380 bps)
- Exempt: 0%

#### Test Coverage
- **File:** `api/src/invoicing/__tests__/money-engine.spec.ts`
- **Tests:** 45 passing
- **Coverage:** Line calculations, VAT modes, rounding, edge cases

---

## Phase 3: Invoicing Settings Module ✅

### Completed Deliverables

#### DTOs (`api/src/invoicing/dto/invoicing-settings.dto.ts`)
- `CreateInvoicingSettingsDto` / `UpdateInvoicingSettingsDto`
- `CreateBankAccountDto` / `UpdateBankAccountDto`
- `InvoicingSettingsResponseDto` / `BankAccountResponseDto`
- `NumberingPreviewDto` / `NumberingPreviewResponseDto`
- `QrEligibilityCheckDto`

#### Service (`api/src/invoicing/invoicing-settings.service.ts`)
| Method | Description |
|--------|-------------|
| `getSettings()` | Get org settings with QR eligibility |
| `createSettings()` | Create settings with audit logging |
| `updateSettings()` | Update settings with field-level audit |
| `getBankAccounts()` | List bank accounts |
| `createBankAccount()` | Create with IBAN validation, QR-IBAN detection |
| `updateBankAccount()` | Update with default management |
| `deleteBankAccount()` | Soft delete (deactivate) |
| `getNumberingPreviews()` | Preview next numbers for all doc types |
| `reserveNextNumber()` | Atomic sequence reservation |
| `checkQrEligibility()` | Full QR eligibility validation |

#### Controller (`api/src/invoicing/invoicing-settings.controller.ts`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/invoicing/settings/:orgId` | GET | Get settings |
| `/invoicing/settings` | POST | Create settings |
| `/invoicing/settings/:orgId` | PATCH | Update settings |
| `/invoicing/settings/:orgId/bank-accounts` | GET | List accounts |
| `/invoicing/settings/:orgId/bank-accounts/:id` | GET | Get account |
| `/invoicing/settings/:orgId/bank-accounts` | POST | Create account |
| `/invoicing/settings/:orgId/bank-accounts/:id` | PATCH | Update account |
| `/invoicing/settings/:orgId/bank-accounts/:id` | DELETE | Delete account |
| `/invoicing/settings/:orgId/numbering-preview` | GET | Preview numbering |
| `/invoicing/settings/:orgId/qr-eligibility` | GET | Check QR eligibility |

#### Module (`api/src/invoicing/invoicing.module.ts`)
- Registered in `app.module.ts`
- Exports `InvoicingSettingsService` for use by other modules

---

## Phase 4: QR/IBAN/Reference Compliance Layer ✅

### Completed Deliverables

#### IBAN Validator (`api/src/invoicing/utils/iban-validator.ts`)
| Function | Description |
|----------|-------------|
| `normalizeIban()` | Remove spaces, uppercase |
| `validateIban()` | Full validation (length, country, Mod-97) |
| `validateMod97()` | ISO 7064 checksum validation |
| `isQrIban()` | Detect QR-IBAN (IID 30000-31999) |
| `formatIbanForDisplay()` | Format with spaces |
| `extractBankInfo()` | Get IID and QR-IBAN status |
| `validateIbanReferenceCompatibility()` | Check IBAN/reference type match |

#### QR Reference Generator (`api/src/invoicing/utils/qr-reference.ts`)

**QRR (QR-Reference) - 27 digits:**
| Function | Description |
|----------|-------------|
| `generateQrrReference()` | Generate with customer ID + invoice number |
| `calculateMod10Recursive()` | ESR/ISR check digit algorithm |
| `validateQrrReference()` | Full validation |
| `formatQrrForDisplay()` | Groups of 5 digits |

**SCOR (Structured Creditor Reference) - ISO 11649:**
| Function | Description |
|----------|-------------|
| `generateScorReference()` | Generate from invoice number |
| `calculateScorCheckDigits()` | ISO 7064 Mod-97-10 |
| `validateScorReference()` | Full validation |
| `formatScorForDisplay()` | Groups of 4 chars |

**Universal:**
| Function | Description |
|----------|-------------|
| `detectReferenceType()` | Auto-detect from string |
| `validateReference()` | Validate any type |
| `generateReference()` | Generate by type |

#### QR Bill Service (`api/src/invoicing/utils/qr-bill.service.ts`)
| Function | Description |
|----------|-------------|
| `generateQrPayload()` | SIX SPS 2022 compliant 32-element payload |
| `validateQrBillData()` | Full data validation with IBAN/ref compatibility |
| `parseQrPayload()` | Parse payload back to data |
| `hashPayload()` | SHA-256 hash for integrity |
| `buildQrBillDataFromInvoice()` | Build from invoice entities |

#### Test Coverage
- **File:** `api/src/invoicing/__tests__/qr-compliance.spec.ts`
- **Tests:** 66 passing (111 total with money engine)
- **Coverage:** IBAN validation, QRR/SCOR generation, QR payload generation/parsing

---

## File Structure

```
api/src/invoicing/
├── __tests__/
│   ├── money-engine.spec.ts      # 45 tests
│   └── qr-compliance.spec.ts     # 66 tests
├── dto/
│   └── invoicing-settings.dto.ts # All DTOs with validation
├── utils/
│   ├── index.ts                  # Utils barrel export
│   ├── money-engine.ts           # Financial calculations
│   ├── iban-validator.ts         # Swiss IBAN validation
│   ├── qr-reference.ts           # QRR/SCOR generation
│   └── qr-bill.service.ts        # QR payload generation
├── invoicing-settings.controller.ts
├── invoicing-settings.service.ts
└── invoicing.module.ts
```

---

## Key Decisions Implemented

| Decision | Implementation |
|----------|----------------|
| Currency: CHF only | Enforced in schema, defaults |
| Money: BigInt minor units | All `*Minor` fields use BigInt |
| VAT: Basis points | `vatRateBps` field (810 = 8.1%) |
| VAT: Line-level | Calculated per line, aggregated at invoice |
| Rounding: Half-up | `roundHalfUp()` function |
| Numbering: Per-issuer | `DocumentSequence` per org + type + year |
| Numbering: Immutable | Reserved atomically on issuance |
| Status: Flexible | Not a strict state machine |
| Audit: Complete | Every change logged with actor/timestamp |
| QR-bill: Optional per doc | `qrEnabled` flag on documents |

---

## Next Steps (Phases 5-7)

### Phase 5: Document Services + Numbering
- [ ] Draft CRUD for all document types
- [ ] Issue action (reserve number, finalize)
- [ ] Status transitions with audit
- [ ] Financial field locks on Paid/Cancelled/Void
- [ ] Credit note linking

### Phase 6: PDF Generation + Versioning
- [ ] PDF templates (header, body, totals, VAT breakdown)
- [ ] QR-bill payment slip (62x105mm receipt, 148x105mm payment)
- [ ] Swiss cross overlay (7x7mm)
- [ ] PDF versioning on regeneration
- [ ] Asset storage integration

### Phase 7: Admin UI
- [ ] Invoicing Settings panel
- [ ] Document list with filters
- [ ] Create/edit draft wizard
- [ ] Issue and download PDF
- [ ] Credit note creation from invoice

---

## Testing Summary

```
Test Suites: 2 passed, 2 total
Tests:       111 passed, 111 total
Snapshots:   0 total
Time:        ~7s
```

All foundation tests pass, covering:
- Financial calculations with various VAT scenarios
- Mixed VAT rates on same invoice
- Discount handling (line and invoice level)
- IBAN validation and QR-IBAN detection
- QRR and SCOR reference generation and validation
- QR-bill payload generation and parsing
- Edge cases (zero amounts, max amounts, rounding)

---

## Dependencies

No new npm dependencies were added. The implementation uses:
- `crypto` (Node.js built-in) for SHA-256 hashing
- Prisma client for database operations
- class-validator for DTO validation
- @nestjs/swagger for API documentation

---

*This document serves as the completion record for the Swiss QR Invoice Foundation build (Phases 1-4).*
