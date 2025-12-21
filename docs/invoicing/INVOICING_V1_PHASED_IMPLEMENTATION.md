# Invoicing v1 — Phased Implementation Plan (Base-Up)

This document translates the **locked v1 decisions** into a **buildable, phase-by-phase roadmap**, designed to be implemented incrementally with shippable checkpoints.

Related:
- Swiss QR invoice plan: `docs/invoicing/SWISS_QR_INVOICE_IMPLEMENTATION_PLAN.md`

---

## Phase 0 — Locked Decisions (Input Spec)

### 0.1 Currency & payment presentation
- **Currency**: CHF only.
- **Per-document payment display**:
  - **Swiss QR-bill** (QR code embedded in PDF), or
  - **Manual payment details only**:
    - IBAN
    - Beneficiary name
    - Bank name (optional)
    - Payment reference (free text or structured)
- **Rule**: QR usage is **optional per document** (not global).
- **Rule**: Switching QR on/off **does not affect** numbering or totals.

### 0.2 VAT & tax model
- **Line-level VAT**.
- **Per line item**:
  - VAT rate stored in **basis points** (e.g., 810 = 8.1%).
  - VAT rate can be 0% (exempt), standard, reduced, or custom.
- **Invoice-level behavior**:
  - VAT can be **added to net** (excluded) or **included in unit price**.
  - Mixed VAT rates allowed within the same document.

### 0.3 Document types (v1 scope)
All included in v1:
- Invoice
- Credit note
- Pro-forma invoice
- Quote / estimate

Rules:
- Each doc type has its **own numbering sequence**.
- Each doc type has its **own lifecycle**.
- Credit notes reference an original invoice but do **not** delete or modify it.

### 0.4 Money representation
- All money stored as **minor units (centimes)**.
- Data type: **integer only**; **BigInt preferred**.

### 0.5 Rounding rules
- VAT computed at **line level**, aggregated at **invoice level**.
- Final VAT total rounded **half-up** to minor units at invoice level.
- Rounding differences:
  - Not redistributed across line items.
  - Optionally stored as `roundingAdjustmentMinor` for audit/export.

### 0.6 Time & dates
- Storage: timestamps in **UTC** (ISO 8601).
- Rendering (PDF/UI): invoice date, due date, payment date rendered in **Europe/Zurich** timezone.
- **Rule**: no timezone conversions during calculations.

### 0.7 Numbering rules
- Per issuer (organisation), sequential, non-reusable.
- Immutable once issued; number reserved at issuance.
- Never reused, even if cancelled.
- Format configurable per issuer (e.g., `PC-INV-2025-000123`).

### 0.8 Status model (non-strict)
Allowed statuses:
- Draft
- Issued
- Sent
- Partially paid
- Paid
- Overdue
- Cancelled
- Void
- Archived

Rules:
- Status transitions are flexible (not a hard state machine).
- Manual adjustments allowed for authorized users.
- Every change is logged (immutable audit log).
- Paid/Cancelled/Void documents are **not editable** for financial fields.

### 0.9 QR-bill usage rules
- Optional per document.
- Only available when required creditor fields are present.
- If QR disabled: show manual payment block (IBAN + reference only).
- Store `qrPayloadHash` whenever a QR code is generated.

### 0.10 Invoicing settings section (reusable UI panel)
Must exist and be reusable across documents.
- **Company / issuer details**: legal name, trading name, logo, address, VAT number, registration number (optional)
- **Banking details**: IBAN, bank name (optional), account holder name, default payment reference prefix
- **QR-bill settings**: default QR usage (enabled/disabled), reference type (SCOR/QRR/NONE), creditor address format
- **Document defaults**: default due days, default notes/footer, default language, default VAT display mode
- **Numbering configuration**: prefix per document type, yearly reset, preview next number

### 0.11 Audit & compliance
- Every change to status, totals, payment info, and company settings is logged with timestamp, user, diff.
- PDFs are regenerated only when allowed fields change.
- PDFs are versioned if regenerated after issuance.

---

## Phase 1 — Data model (Prisma) + audit primitives (foundation)

Goal: create the schema needed to support all v1 decisions, with audit-first design.

Deliverables:
- **Prisma models** for:
  - Invoicing settings (issuer/company/banking/defaults/QR defaults/numbering config)
  - Document sequences per **issuer + document type**
  - Documents (invoice/quote/pro-forma/credit note) + line items
  - Payments (CHF only)
  - PDF versions
  - Audit logs (documents + settings)
- **Constraints**:
  - Sequence numbers non-reusable per issuer + type.
  - Audit logs append-only.
- **Money type**: `BigInt` for minor units (plus `roundingAdjustmentMinor`).

Exit criteria:
- Migration applies cleanly.
- Basic create/read flows work in isolation (no business logic yet).

---

## Phase 2 — Money/VAT engine (pure functions; deterministic)

Goal: implement calculation correctness early and reuse everywhere (API, PDF, exports).

Deliverables:
- Deterministic calculation module:
  - Line totals for VAT **included** vs **excluded**
  - Line VAT computed at line-level
  - Invoice aggregation + half-up rounding at invoice level
  - `roundingAdjustmentMinor` computed/stored
  - Mixed VAT rate breakdown
- “Financial edit lock” gate:
  - Paid/Cancelled/Void are not editable for financial fields.

Exit criteria:
- Unit tests cover mixed VAT, included/excluded VAT, and rounding edge cases.

---

## Phase 3 — Invoicing Settings module (API first)

Goal: make issuer configuration real, auditable, and reusable across document types.

Deliverables:
- Settings CRUD endpoints (org-scoped).
- Validation:
  - CHF-only enforcement.
  - Required creditor fields for QR eligibility.
- Numbering preview endpoints:
  - Preview template rendering and next counter per doc type.
- Audit log diffs for every settings change.

Exit criteria:
- Admin can configure issuer + banking + defaults, and see “next number” preview.

---

## Phase 4 — QR/IBAN/reference compliance layer (optional per document)

Goal: implement QR-bill as an optional capability driven by per-document toggle + issuer readiness.

Deliverables:
- IBAN validation (CH/LI, Mod-97).
- Reference generation/validation based on settings:
  - SCOR / QRR / NONE
  - Manual payment reference support (free text)
- QR payload generation + validation.
- Persist `qrPayloadHash` whenever a QR code is generated.

Exit criteria:
- Can generate and validate QR payloads for a document when eligible.
- Can produce manual payment block data when QR disabled.

---

## Phase 5 — Document services + numbering + flexible statuses (no PDF yet)

Goal: implement document CRUD and issuance logic with correct immutability and audit.

Deliverables:
- For each doc type:
  - Draft CRUD + line item editing
  - Issue action:
    - Reserve immutable number (per issuer + doc type)
    - Set status to Issued
  - Flexible status changes (authorized) with audit diffs
  - Enforce “financial field locks” on Paid/Cancelled/Void
- Credit notes:
  - Must reference original invoice
  - Must not mutate original invoice

Exit criteria:
- Admin can create any doc type, issue it (number reserved), and manage status with full audit trail.

---

## Phase 6 — PDF generation + versioning (QR optional, per-document)

Goal: produce compliant, versioned PDFs with either QR slip or manual payment block.

Deliverables:
- PDF templates:
  - Shared header/body/totals/VAT breakdown
  - Payment block:
    - QR enabled + eligible → embed QR slip + store `qrPayloadHash`
    - QR disabled → render manual payment block (IBAN + beneficiary + optional bank + reference)
- PDF versioning:
  - Generate version `v1` on issuance (or on explicit generate step).
  - Regeneration after issuance creates `v2`, `v3`, etc., only when allowed fields change.
- Store PDFs as assets and expose download endpoints (latest + versions).

Exit criteria:
- Issued document produces a downloadable PDF, with/without QR, and versions are retained.

---

## Phase 7 — Admin UI (v1 usable product slice)

Goal: ship a usable workflow for staff: settings → create docs → issue → download.

Deliverables:
- Reusable **Invoicing Settings** panel/modal used across document screens.
- Document management:
  - List + filters + detail view
  - Create/edit drafts, issue, status adjust
  - PDF download (latest + versions)
  - Credit note creation from invoice

Exit criteria:
- End-to-end: configure issuer → create doc → issue → generate/download PDF (QR optional per document).

---

## Phase 8 — Payments (manual-first) + derived overdue

Goal: support real payment tracking in CHF with correct locking and audit.

Deliverables:
- Manual payment recording (BigInt minor units).
- Status updates:
  - Partially paid / Paid (automatic) with ability to override (authorized + audited).
- Overdue:
  - Derived from due date (and optionally a scheduled job to flag/report).

Exit criteria:
- Payment history updates balances and lock rules correctly; audit logs capture all changes.

---

## Phase 9 — Hardening & compliance (exports, tests, operational rules)

Goal: raise confidence for launch and long-term maintenance.

Deliverables:
- Compliance tests (QR payload vectors, QR scannability harness, PDF layout checks).
- Exports:
  - VAT summaries and document register exports suitable for accounting.
- Performance:
  - PDF caching strategy and regeneration rules enforced.
- Docs:
  - Admin usage and developer notes for invariants (money, rounding, immutability).

Exit criteria:
- Automated test coverage for core rules; stable operational behavior; release-ready.

---

## Recommended first shippable milestone
Ship Phases **1–7** first:
**issuer settings → create any doc type → issue (number reserved) → PDF generated + versioned → QR optional per document**.

