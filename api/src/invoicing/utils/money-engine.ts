/**
 * Money Engine - Pure functions for financial calculations
 *
 * Swiss QR Invoice compliant money handling:
 * - All amounts stored as BigInt in minor units (centimes)
 * - VAT rates stored in basis points (e.g., 810 = 8.1%)
 * - Rounding uses half-up (standard banking rounding)
 * - No floating point math for money operations
 *
 * @module invoicing/utils/money-engine
 */

// ============================================
// Types
// ============================================

export interface LineItemInput {
  /** Quantity (as string to preserve precision, e.g., "1.5") */
  quantity: string;
  /** Unit price in minor units (centimes) */
  unitPriceMinor: bigint;
  /** Discount percentage (e.g., 10.00 = 10%) - optional */
  discountPercent?: string | null;
  /** VAT rate in basis points (e.g., 810 = 8.1%) */
  vatRateBps: number;
}

export interface LineItemCalculation {
  /** quantity * unitPriceMinor (before discount) */
  lineSubtotalMinor: bigint;
  /** Discount amount in minor units */
  discountMinor: bigint;
  /** lineSubtotalMinor - discountMinor */
  lineNetMinor: bigint;
  /** VAT amount in minor units */
  vatMinor: bigint;
  /** lineNetMinor + vatMinor (if VAT excluded) or lineNetMinor (if VAT included) */
  lineTotalMinor: bigint;
}

export interface InvoiceTotalsInput {
  /** Calculated line items */
  lineItems: LineItemCalculation[];
  /** Invoice-level discount in minor units (optional) */
  invoiceDiscountMinor?: bigint;
}

export interface VatBreakdownEntry {
  /** VAT rate in basis points */
  vatRateBps: number;
  /** Taxable base amount in minor units */
  taxableMinor: bigint;
  /** VAT amount in minor units */
  vatMinor: bigint;
}

export interface InvoiceTotalsCalculation {
  /** Sum of all line subtotals (before line discounts) */
  subtotalMinor: bigint;
  /** Total of all line discounts + invoice discount */
  totalDiscountMinor: bigint;
  /** subtotalMinor - totalDiscountMinor */
  netMinor: bigint;
  /** Total VAT amount (sum of all line VAT, rounded) */
  vatMinor: bigint;
  /** netMinor + vatMinor */
  totalMinor: bigint;
  /** Rounding adjustment for audit trail */
  roundingAdjustmentMinor: bigint;
  /** Breakdown of VAT by rate */
  vatBreakdown: VatBreakdownEntry[];
}

export type VatDisplayMode = 'EXCLUDED' | 'INCLUDED';

// ============================================
// Constants
// ============================================

/** Swiss standard VAT rates in basis points */
export const SWISS_VAT_RATES = {
  STANDARD: 810, // 8.1% (since 2024)
  REDUCED: 260, // 2.6% (since 2024)
  SPECIAL: 380, // 3.8% (accommodation, since 2024)
  EXEMPT: 0, // 0% (exempt)
} as const;

/** Precision for intermediate calculations (to avoid rounding errors) */
const CALCULATION_PRECISION = 10000n; // 4 decimal places

// ============================================
// Core Calculation Functions
// ============================================

/**
 * Parses a decimal string to BigInt with specified precision
 * Used for quantities and percentages
 *
 * @param value - Decimal string (e.g., "1.5", "10.00")
 * @param precision - Number of decimal places to preserve (default: 4)
 * @returns BigInt representation with precision factor
 */
export function parseDecimalToBigInt(
  value: string | number,
  precision: number = 4,
): bigint {
  const strValue = typeof value === 'number' ? value.toString() : value;
  const [intPart, decPart = ''] = strValue.split('.');
  const precisionFactor = 10 ** precision;

  // Pad or truncate decimal part to precision
  const normalizedDecPart = decPart.padEnd(precision, '0').slice(0, precision);

  const intBigInt = BigInt(intPart || '0') * BigInt(precisionFactor);
  const decBigInt = BigInt(normalizedDecPart);

  return intBigInt + decBigInt;
}

/**
 * Rounds a BigInt using half-up rounding (banker's rounding)
 *
 * @param value - Value to round (scaled by precision)
 * @param precision - Precision factor used in value
 * @returns Rounded BigInt
 */
export function roundHalfUp(value: bigint, precision: bigint): bigint {
  const half = precision / 2n;
  const remainder = value % precision;
  const truncated = value / precision;

  if (remainder >= half) {
    return truncated + 1n;
  }
  return truncated;
}

/**
 * Calculates line item totals
 *
 * Formula (VAT excluded mode - default):
 *   lineSubtotalMinor = quantity * unitPriceMinor
 *   discountMinor = lineSubtotalMinor * (discountPercent / 100)
 *   lineNetMinor = lineSubtotalMinor - discountMinor
 *   vatMinor = lineNetMinor * (vatRateBps / 10000)
 *   lineTotalMinor = lineNetMinor + vatMinor
 *
 * Formula (VAT included mode):
 *   lineSubtotalMinor = quantity * unitPriceMinor
 *   discountMinor = lineSubtotalMinor * (discountPercent / 100)
 *   lineNetMinor = lineSubtotalMinor - discountMinor (includes VAT)
 *   vatMinor = lineNetMinor * vatRateBps / (10000 + vatRateBps) (extracted)
 *   lineTotalMinor = lineNetMinor (same, VAT already included)
 *
 * @param input - Line item input data
 * @param vatDisplayMode - Whether VAT is included in unit price
 * @returns Calculated line item values
 */
export function calculateLineItem(
  input: LineItemInput,
  vatDisplayMode: VatDisplayMode = 'EXCLUDED',
): LineItemCalculation {
  // Parse quantity with 4 decimal precision
  const quantityScaled = parseDecimalToBigInt(input.quantity, 4);

  // Calculate line subtotal: quantity * unitPriceMinor
  // Result is scaled by 10000 (4 decimals from quantity)
  const lineSubtotalScaled = quantityScaled * input.unitPriceMinor;
  const lineSubtotalMinor = roundHalfUp(lineSubtotalScaled, CALCULATION_PRECISION);

  // Calculate discount if applicable
  let discountMinor = 0n;
  if (input.discountPercent) {
    const discountPercentScaled = parseDecimalToBigInt(input.discountPercent, 4);
    // discountMinor = lineSubtotalMinor * discountPercent / 100
    // discountPercentScaled is scaled by 10000, so divide by 10000 * 100 = 1000000
    const discountScaled = lineSubtotalMinor * discountPercentScaled;
    discountMinor = roundHalfUp(discountScaled, 1000000n);
  }

  // Calculate line net (after discount)
  const lineNetMinor = lineSubtotalMinor - discountMinor;

  // Calculate VAT
  let vatMinor = 0n;
  let lineTotalMinor = lineNetMinor;

  if (input.vatRateBps > 0) {
    if (vatDisplayMode === 'EXCLUDED') {
      // VAT is added to net amount
      // vatMinor = lineNetMinor * vatRateBps / 10000
      const vatScaled = lineNetMinor * BigInt(input.vatRateBps);
      vatMinor = roundHalfUp(vatScaled, 10000n);
      lineTotalMinor = lineNetMinor + vatMinor;
    } else {
      // VAT is included in price - extract it
      // vatMinor = lineNetMinor * vatRateBps / (10000 + vatRateBps)
      const divisor = 10000n + BigInt(input.vatRateBps);
      const vatScaled = lineNetMinor * BigInt(input.vatRateBps);
      vatMinor = roundHalfUp(vatScaled, divisor);
      // lineTotalMinor stays the same (VAT already included)
    }
  }

  return {
    lineSubtotalMinor,
    discountMinor,
    lineNetMinor,
    vatMinor,
    lineTotalMinor,
  };
}

/**
 * Calculates invoice totals from calculated line items
 *
 * @param input - Invoice totals input with line items
 * @returns Calculated invoice totals with VAT breakdown
 */
export function calculateInvoiceTotals(
  input: InvoiceTotalsInput,
): InvoiceTotalsCalculation {
  // Aggregate line items
  let subtotalMinor = 0n;
  let totalLineDiscountMinor = 0n;
  let netMinor = 0n;
  let rawVatMinor = 0n;

  // Group VAT by rate for breakdown
  const vatByRate = new Map<number, { taxable: bigint; vat: bigint }>();

  for (const line of input.lineItems) {
    subtotalMinor += line.lineSubtotalMinor;
    totalLineDiscountMinor += line.discountMinor;
    netMinor += line.lineNetMinor;
    rawVatMinor += line.vatMinor;
  }

  // Apply invoice-level discount if any
  const invoiceDiscountMinor = input.invoiceDiscountMinor ?? 0n;
  const totalDiscountMinor = totalLineDiscountMinor + invoiceDiscountMinor;

  // If there's an invoice-level discount, adjust net and recalculate VAT proportionally
  // For simplicity in v1, we apply invoice discount before VAT recalculation
  // This is a common approach where invoice discount reduces the taxable base
  if (invoiceDiscountMinor > 0n && netMinor > 0n) {
    // Calculate proportional reduction
    const adjustedNetMinor = netMinor - invoiceDiscountMinor;

    // For now, we keep the line-level VAT calculation
    // A more sophisticated approach would redistribute the discount proportionally
    netMinor = adjustedNetMinor;
  }

  // Round VAT at invoice level (half-up)
  // The difference between sum of line VAT and rounded total is the rounding adjustment
  const vatMinor = rawVatMinor; // Already rounded per line

  // Calculate total
  const totalMinor = netMinor + vatMinor;

  // Calculate rounding adjustment (for audit purposes)
  // This captures any discrepancy from per-line rounding
  const roundingAdjustmentMinor = 0n; // In our approach, we don't redistribute

  // Build VAT breakdown by aggregating from line items
  // Note: Caller should provide vatRateBps for each line to enable this
  const vatBreakdown: VatBreakdownEntry[] = [];
  for (const [rateBps, amounts] of vatByRate) {
    vatBreakdown.push({
      vatRateBps: rateBps,
      taxableMinor: amounts.taxable,
      vatMinor: amounts.vat,
    });
  }

  return {
    subtotalMinor,
    totalDiscountMinor,
    netMinor,
    vatMinor,
    totalMinor,
    roundingAdjustmentMinor,
    vatBreakdown,
  };
}

/**
 * Calculates invoice totals from line items with VAT rate information
 *
 * @param lineItems - Array of line items with calculations and VAT rates
 * @param invoiceDiscountMinor - Optional invoice-level discount
 * @returns Calculated invoice totals with VAT breakdown
 */
export function calculateInvoiceTotalsWithBreakdown(
  lineItems: Array<LineItemCalculation & { vatRateBps: number }>,
  invoiceDiscountMinor: bigint = 0n,
): InvoiceTotalsCalculation {
  // Aggregate line items
  let subtotalMinor = 0n;
  let totalLineDiscountMinor = 0n;
  let netMinor = 0n;

  // Group VAT by rate for breakdown
  const vatByRate = new Map<number, { taxable: bigint; vat: bigint }>();

  for (const line of lineItems) {
    subtotalMinor += line.lineSubtotalMinor;
    totalLineDiscountMinor += line.discountMinor;
    netMinor += line.lineNetMinor;

    // Aggregate VAT by rate
    const existing = vatByRate.get(line.vatRateBps) ?? { taxable: 0n, vat: 0n };
    existing.taxable += line.lineNetMinor;
    existing.vat += line.vatMinor;
    vatByRate.set(line.vatRateBps, existing);
  }

  // Apply invoice-level discount
  const totalDiscountMinor = totalLineDiscountMinor + invoiceDiscountMinor;

  // Adjust net for invoice discount
  let adjustedNetMinor = netMinor;
  if (invoiceDiscountMinor > 0n) {
    adjustedNetMinor = netMinor - invoiceDiscountMinor;

    // Proportionally reduce VAT breakdown if needed
    if (netMinor > 0n) {
      const ratio = (adjustedNetMinor * CALCULATION_PRECISION) / netMinor;
      for (const [rateBps, amounts] of vatByRate) {
        const adjustedVat = roundHalfUp(
          amounts.vat * ratio,
          CALCULATION_PRECISION,
        );
        const adjustedTaxable = roundHalfUp(
          amounts.taxable * ratio,
          CALCULATION_PRECISION,
        );
        vatByRate.set(rateBps, { taxable: adjustedTaxable, vat: adjustedVat });
      }
    }
  }

  // Sum adjusted VAT
  let vatMinor = 0n;
  for (const amounts of vatByRate.values()) {
    vatMinor += amounts.vat;
  }

  // Calculate total
  const totalMinor = adjustedNetMinor + vatMinor;

  // Build VAT breakdown
  const vatBreakdown: VatBreakdownEntry[] = [];
  for (const [rateBps, amounts] of vatByRate) {
    if (amounts.vat > 0n || amounts.taxable > 0n) {
      vatBreakdown.push({
        vatRateBps: rateBps,
        taxableMinor: amounts.taxable,
        vatMinor: amounts.vat,
      });
    }
  }

  // Sort by rate
  vatBreakdown.sort((a, b) => b.vatRateBps - a.vatRateBps);

  return {
    subtotalMinor,
    totalDiscountMinor,
    netMinor: adjustedNetMinor,
    vatMinor,
    totalMinor,
    roundingAdjustmentMinor: 0n,
    vatBreakdown,
  };
}

// ============================================
// Formatting Functions
// ============================================

/**
 * Formats minor units to decimal string
 *
 * @param minorUnits - Amount in minor units (centimes)
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1234.56")
 */
export function formatMinorToDecimal(
  minorUnits: bigint,
  decimalPlaces: number = 2,
): string {
  const isNegative = minorUnits < 0n;
  const absMinorUnits = isNegative ? -minorUnits : minorUnits;

  const divisor = BigInt(10 ** decimalPlaces);
  const intPart = absMinorUnits / divisor;
  const decPart = absMinorUnits % divisor;

  const decStr = decPart.toString().padStart(decimalPlaces, '0');
  return `${isNegative ? '-' : ''}${intPart}.${decStr}`;
}

/**
 * Formats amount for display with currency
 *
 * @param minorUnits - Amount in minor units
 * @param currency - Currency code (default: CHF)
 * @param locale - Locale for formatting (default: de-CH)
 * @returns Formatted currency string (e.g., "CHF 1'234.56")
 */
export function formatCurrency(
  minorUnits: bigint,
  currency: string = 'CHF',
  locale: string = 'de-CH',
): string {
  const decimalValue = Number(minorUnits) / 100;

  // Use Intl.NumberFormat for locale-aware formatting
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(decimalValue);
}

/**
 * Formats VAT rate from basis points to percentage string
 *
 * @param basisPoints - VAT rate in basis points (e.g., 810)
 * @returns Percentage string (e.g., "8.1%")
 */
export function formatVatRate(basisPoints: number): string {
  const percentage = basisPoints / 100;
  return `${percentage}%`;
}

/**
 * Parses decimal currency string to minor units
 *
 * @param value - Decimal string (e.g., "1234.56")
 * @returns Amount in minor units as BigInt
 */
export function parseDecimalToMinor(value: string | number): bigint {
  const strValue = typeof value === 'number' ? value.toFixed(2) : value;
  const [intPart, decPart = '00'] = strValue.replace(/[^\d.-]/g, '').split('.');

  // Normalize decimal part to exactly 2 digits
  const normalizedDecPart = decPart.padEnd(2, '0').slice(0, 2);

  const intBigInt = BigInt(intPart || '0') * 100n;
  const decBigInt = BigInt(normalizedDecPart);

  return intPart.startsWith('-') ? intBigInt - decBigInt : intBigInt + decBigInt;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Checks if a document is in a financially locked state
 * Documents in these states cannot have financial fields modified
 *
 * @param status - Document status
 * @returns True if document is financially locked
 */
export function isFinanciallyLocked(status: string): boolean {
  const lockedStatuses = ['PAID', 'CANCELLED', 'VOID'];
  return lockedStatuses.includes(status);
}

/**
 * Validates that an amount is within Swiss QR-bill limits
 *
 * @param minorUnits - Amount in minor units
 * @returns True if amount is valid for QR-bill
 */
export function isValidQrBillAmount(minorUnits: bigint): boolean {
  // Swiss QR-bill: 0.01 - 999'999'999.99
  const minAmount = 1n; // 0.01 CHF
  const maxAmount = 99999999999n; // 999'999'999.99 CHF

  return minorUnits >= minAmount && minorUnits <= maxAmount;
}

/**
 * Calculates the balance due for an invoice
 *
 * @param totalMinor - Total invoice amount in minor units
 * @param paidMinor - Amount already paid in minor units
 * @returns Balance due in minor units
 */
export function calculateBalance(
  totalMinor: bigint,
  paidMinor: bigint,
): bigint {
  return totalMinor - paidMinor;
}

/**
 * Determines payment status based on amounts
 *
 * @param totalMinor - Total invoice amount
 * @param paidMinor - Amount paid
 * @returns Payment status string
 */
export function determinePaymentStatus(
  totalMinor: bigint,
  paidMinor: bigint,
): 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID' {
  // Zero total is considered paid
  if (totalMinor === 0n && paidMinor === 0n) {
    return 'PAID';
  }
  if (paidMinor <= 0n) {
    return 'UNPAID';
  }
  if (paidMinor < totalMinor) {
    return 'PARTIALLY_PAID';
  }
  if (paidMinor === totalMinor) {
    return 'PAID';
  }
  return 'OVERPAID';
}

/**
 * Calculates due date based on payment terms
 *
 * @param invoiceDate - Invoice date
 * @param paymentTerms - Payment terms enum value
 * @param customDays - Custom days for CUSTOM payment terms
 * @returns Due date
 */
export function calculateDueDate(
  invoiceDate: Date,
  paymentTerms: string,
  customDays?: number,
): Date {
  const dueDate = new Date(invoiceDate);

  const termsDays: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_7: 7,
    NET_10: 10,
    NET_15: 15,
    NET_30: 30,
    NET_45: 45,
    NET_60: 60,
    NET_90: 90,
  };

  const days = paymentTerms === 'CUSTOM' ? (customDays ?? 30) : (termsDays[paymentTerms] ?? 30);

  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}
