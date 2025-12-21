/**
 * Money Engine Unit Tests
 *
 * Comprehensive tests for the money/VAT calculation engine
 * covering all edge cases and Swiss QR invoice requirements.
 */

import {
  parseDecimalToBigInt,
  roundHalfUp,
  calculateLineItem,
  calculateInvoiceTotalsWithBreakdown,
  formatMinorToDecimal,
  formatCurrency,
  formatVatRate,
  parseDecimalToMinor,
  isFinanciallyLocked,
  isValidQrBillAmount,
  calculateBalance,
  determinePaymentStatus,
  calculateDueDate,
  SWISS_VAT_RATES,
  LineItemInput,
} from '../utils/money-engine';

describe('Money Engine', () => {
  describe('parseDecimalToBigInt', () => {
    it('should parse integer values', () => {
      expect(parseDecimalToBigInt('100', 4)).toBe(1000000n);
      expect(parseDecimalToBigInt('0', 4)).toBe(0n);
      expect(parseDecimalToBigInt('1', 4)).toBe(10000n);
    });

    it('should parse decimal values', () => {
      expect(parseDecimalToBigInt('1.5', 4)).toBe(15000n);
      expect(parseDecimalToBigInt('10.25', 4)).toBe(102500n);
      expect(parseDecimalToBigInt('0.01', 4)).toBe(100n);
      expect(parseDecimalToBigInt('0.0001', 4)).toBe(1n);
    });

    it('should handle number input', () => {
      expect(parseDecimalToBigInt(1.5, 4)).toBe(15000n);
      expect(parseDecimalToBigInt(100, 4)).toBe(1000000n);
    });

    it('should truncate extra decimal places', () => {
      expect(parseDecimalToBigInt('1.12345', 4)).toBe(11234n);
    });

    it('should pad missing decimal places', () => {
      expect(parseDecimalToBigInt('1.1', 4)).toBe(11000n);
    });
  });

  describe('roundHalfUp', () => {
    it('should round down when remainder is less than half', () => {
      expect(roundHalfUp(1049n, 100n)).toBe(10n);
      expect(roundHalfUp(499n, 1000n)).toBe(0n);
    });

    it('should round up when remainder is half or more', () => {
      expect(roundHalfUp(1050n, 100n)).toBe(11n);
      expect(roundHalfUp(1051n, 100n)).toBe(11n);
      expect(roundHalfUp(500n, 1000n)).toBe(1n);
    });

    it('should handle exact division', () => {
      expect(roundHalfUp(1000n, 100n)).toBe(10n);
      expect(roundHalfUp(0n, 100n)).toBe(0n);
    });
  });

  describe('calculateLineItem', () => {
    describe('VAT Excluded Mode (default)', () => {
      it('should calculate simple line item without discount', () => {
        const input: LineItemInput = {
          quantity: '1',
          unitPriceMinor: 10000n, // 100.00 CHF
          vatRateBps: SWISS_VAT_RATES.STANDARD, // 8.1%
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.lineSubtotalMinor).toBe(10000n); // 100.00
        expect(result.discountMinor).toBe(0n);
        expect(result.lineNetMinor).toBe(10000n);
        expect(result.vatMinor).toBe(810n); // 100.00 * 8.1% = 8.10
        expect(result.lineTotalMinor).toBe(10810n); // 108.10
      });

      it('should calculate line item with quantity', () => {
        const input: LineItemInput = {
          quantity: '5',
          unitPriceMinor: 2500n, // 25.00 CHF
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.lineSubtotalMinor).toBe(12500n); // 5 * 25.00 = 125.00
        expect(result.lineNetMinor).toBe(12500n);
        expect(result.vatMinor).toBe(1013n); // 125.00 * 8.1% = 10.125 → 10.13 (rounded)
        expect(result.lineTotalMinor).toBe(13513n); // 135.13
      });

      it('should calculate line item with decimal quantity', () => {
        const input: LineItemInput = {
          quantity: '1.5',
          unitPriceMinor: 10000n, // 100.00 CHF
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.lineSubtotalMinor).toBe(15000n); // 1.5 * 100.00 = 150.00
        expect(result.lineNetMinor).toBe(15000n);
        expect(result.vatMinor).toBe(1215n); // 150.00 * 8.1% = 12.15
        expect(result.lineTotalMinor).toBe(16215n); // 162.15
      });

      it('should calculate line item with discount', () => {
        const input: LineItemInput = {
          quantity: '1',
          unitPriceMinor: 10000n, // 100.00 CHF
          discountPercent: '10',
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.lineSubtotalMinor).toBe(10000n);
        expect(result.discountMinor).toBe(1000n); // 10%
        expect(result.lineNetMinor).toBe(9000n); // 90.00
        expect(result.vatMinor).toBe(729n); // 90.00 * 8.1% = 7.29
        expect(result.lineTotalMinor).toBe(9729n); // 97.29
      });

      it('should handle zero VAT rate (exempt)', () => {
        const input: LineItemInput = {
          quantity: '2',
          unitPriceMinor: 5000n,
          vatRateBps: SWISS_VAT_RATES.EXEMPT,
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.lineSubtotalMinor).toBe(10000n);
        expect(result.vatMinor).toBe(0n);
        expect(result.lineTotalMinor).toBe(10000n);
      });

      it('should handle reduced VAT rate', () => {
        const input: LineItemInput = {
          quantity: '1',
          unitPriceMinor: 10000n,
          vatRateBps: SWISS_VAT_RATES.REDUCED, // 2.6%
        };

        const result = calculateLineItem(input, 'EXCLUDED');

        expect(result.vatMinor).toBe(260n); // 100.00 * 2.6% = 2.60
        expect(result.lineTotalMinor).toBe(10260n); // 102.60
      });
    });

    describe('VAT Included Mode', () => {
      it('should extract VAT from price-inclusive amount', () => {
        const input: LineItemInput = {
          quantity: '1',
          unitPriceMinor: 10810n, // 108.10 CHF (includes 8.1% VAT)
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        };

        const result = calculateLineItem(input, 'INCLUDED');

        expect(result.lineSubtotalMinor).toBe(10810n);
        expect(result.lineNetMinor).toBe(10810n);
        // VAT = 108.10 * 810 / (10000 + 810) = 108.10 * 810 / 10810 = 8.10
        expect(result.vatMinor).toBe(810n);
        expect(result.lineTotalMinor).toBe(10810n); // Same as net (VAT included)
      });

      it('should handle discount with VAT included', () => {
        const input: LineItemInput = {
          quantity: '1',
          unitPriceMinor: 10810n, // 108.10 CHF (includes 8.1% VAT)
          discountPercent: '10',
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        };

        const result = calculateLineItem(input, 'INCLUDED');

        expect(result.lineSubtotalMinor).toBe(10810n);
        expect(result.discountMinor).toBe(1081n); // 10% of 108.10
        expect(result.lineNetMinor).toBe(9729n); // 97.29 (includes VAT)
        // VAT = 97.29 * 810 / 10810 = 7.29
        expect(result.vatMinor).toBe(729n);
      });
    });
  });

  describe('calculateInvoiceTotalsWithBreakdown', () => {
    it('should aggregate multiple line items', () => {
      const lineItems = [
        {
          lineSubtotalMinor: 10000n,
          discountMinor: 0n,
          lineNetMinor: 10000n,
          vatMinor: 810n,
          lineTotalMinor: 10810n,
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        },
        {
          lineSubtotalMinor: 5000n,
          discountMinor: 0n,
          lineNetMinor: 5000n,
          vatMinor: 405n,
          lineTotalMinor: 5405n,
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        },
      ];

      const result = calculateInvoiceTotalsWithBreakdown(lineItems);

      expect(result.subtotalMinor).toBe(15000n); // 150.00
      expect(result.netMinor).toBe(15000n);
      expect(result.vatMinor).toBe(1215n); // 12.15
      expect(result.totalMinor).toBe(16215n); // 162.15
    });

    it('should handle mixed VAT rates', () => {
      const lineItems = [
        {
          lineSubtotalMinor: 10000n,
          discountMinor: 0n,
          lineNetMinor: 10000n,
          vatMinor: 810n, // 8.1%
          lineTotalMinor: 10810n,
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        },
        {
          lineSubtotalMinor: 10000n,
          discountMinor: 0n,
          lineNetMinor: 10000n,
          vatMinor: 260n, // 2.6%
          lineTotalMinor: 10260n,
          vatRateBps: SWISS_VAT_RATES.REDUCED,
        },
      ];

      const result = calculateInvoiceTotalsWithBreakdown(lineItems);

      expect(result.subtotalMinor).toBe(20000n);
      expect(result.vatMinor).toBe(1070n); // 810 + 260
      expect(result.totalMinor).toBe(21070n);
      expect(result.vatBreakdown).toHaveLength(2);
      expect(result.vatBreakdown[0].vatRateBps).toBe(SWISS_VAT_RATES.STANDARD);
      expect(result.vatBreakdown[1].vatRateBps).toBe(SWISS_VAT_RATES.REDUCED);
    });

    it('should apply invoice-level discount', () => {
      const lineItems = [
        {
          lineSubtotalMinor: 10000n,
          discountMinor: 0n,
          lineNetMinor: 10000n,
          vatMinor: 810n,
          lineTotalMinor: 10810n,
          vatRateBps: SWISS_VAT_RATES.STANDARD,
        },
      ];

      const result = calculateInvoiceTotalsWithBreakdown(lineItems, 1000n); // 10.00 CHF discount

      expect(result.subtotalMinor).toBe(10000n);
      expect(result.totalDiscountMinor).toBe(1000n);
      expect(result.netMinor).toBe(9000n);
      // VAT is proportionally reduced
      expect(result.totalMinor).toBeLessThan(10810n);
    });

    it('should handle empty line items', () => {
      const result = calculateInvoiceTotalsWithBreakdown([]);

      expect(result.subtotalMinor).toBe(0n);
      expect(result.netMinor).toBe(0n);
      expect(result.vatMinor).toBe(0n);
      expect(result.totalMinor).toBe(0n);
      expect(result.vatBreakdown).toHaveLength(0);
    });
  });

  describe('formatMinorToDecimal', () => {
    it('should format positive amounts', () => {
      expect(formatMinorToDecimal(12345n)).toBe('123.45');
      expect(formatMinorToDecimal(100n)).toBe('1.00');
      expect(formatMinorToDecimal(1n)).toBe('0.01');
      expect(formatMinorToDecimal(0n)).toBe('0.00');
    });

    it('should format negative amounts', () => {
      expect(formatMinorToDecimal(-12345n)).toBe('-123.45');
      expect(formatMinorToDecimal(-100n)).toBe('-1.00');
    });

    it('should handle custom decimal places', () => {
      expect(formatMinorToDecimal(12345n, 3)).toBe('12.345');
      expect(formatMinorToDecimal(12345n, 4)).toBe('1.2345');
    });
  });

  describe('formatCurrency', () => {
    it('should format CHF amounts', () => {
      const result = formatCurrency(123456n, 'CHF', 'de-CH');
      expect(result).toMatch(/CHF/);
      expect(result).toMatch(/1.?234/); // Different locales use different separators
    });

    it('should handle zero amounts', () => {
      const result = formatCurrency(0n, 'CHF', 'de-CH');
      expect(result).toMatch(/CHF/);
      expect(result).toMatch(/0/);
    });
  });

  describe('formatVatRate', () => {
    it('should format VAT rates correctly', () => {
      expect(formatVatRate(810)).toBe('8.1%');
      expect(formatVatRate(260)).toBe('2.6%');
      expect(formatVatRate(380)).toBe('3.8%');
      expect(formatVatRate(0)).toBe('0%');
    });
  });

  describe('parseDecimalToMinor', () => {
    it('should parse decimal strings', () => {
      expect(parseDecimalToMinor('123.45')).toBe(12345n);
      expect(parseDecimalToMinor('1.00')).toBe(100n);
      expect(parseDecimalToMinor('0.01')).toBe(1n);
    });

    it('should parse numbers', () => {
      expect(parseDecimalToMinor(123.45)).toBe(12345n);
      expect(parseDecimalToMinor(100)).toBe(10000n);
    });

    it('should handle missing decimal places', () => {
      expect(parseDecimalToMinor('100')).toBe(10000n);
      expect(parseDecimalToMinor('1.5')).toBe(150n);
    });

    it('should strip non-numeric characters', () => {
      expect(parseDecimalToMinor("1'234.56")).toBe(123456n);
      expect(parseDecimalToMinor('CHF 100.00')).toBe(10000n);
    });
  });

  describe('isFinanciallyLocked', () => {
    it('should return true for locked statuses', () => {
      expect(isFinanciallyLocked('PAID')).toBe(true);
      expect(isFinanciallyLocked('CANCELLED')).toBe(true);
      expect(isFinanciallyLocked('VOID')).toBe(true);
    });

    it('should return false for editable statuses', () => {
      expect(isFinanciallyLocked('DRAFT')).toBe(false);
      expect(isFinanciallyLocked('ISSUED')).toBe(false);
      expect(isFinanciallyLocked('SENT')).toBe(false);
      expect(isFinanciallyLocked('PARTIALLY_PAID')).toBe(false);
      expect(isFinanciallyLocked('OVERDUE')).toBe(false);
    });
  });

  describe('isValidQrBillAmount', () => {
    it('should validate valid amounts', () => {
      expect(isValidQrBillAmount(1n)).toBe(true); // 0.01 CHF
      expect(isValidQrBillAmount(100n)).toBe(true); // 1.00 CHF
      expect(isValidQrBillAmount(99999999999n)).toBe(true); // Max
    });

    it('should reject invalid amounts', () => {
      expect(isValidQrBillAmount(0n)).toBe(false); // Below min
      expect(isValidQrBillAmount(-100n)).toBe(false); // Negative
      expect(isValidQrBillAmount(100000000000n)).toBe(false); // Above max
    });
  });

  describe('calculateBalance', () => {
    it('should calculate correct balance', () => {
      expect(calculateBalance(10000n, 0n)).toBe(10000n);
      expect(calculateBalance(10000n, 5000n)).toBe(5000n);
      expect(calculateBalance(10000n, 10000n)).toBe(0n);
      expect(calculateBalance(10000n, 12000n)).toBe(-2000n); // Overpaid
    });
  });

  describe('determinePaymentStatus', () => {
    it('should determine correct status', () => {
      expect(determinePaymentStatus(10000n, 0n)).toBe('UNPAID');
      expect(determinePaymentStatus(10000n, 5000n)).toBe('PARTIALLY_PAID');
      expect(determinePaymentStatus(10000n, 10000n)).toBe('PAID');
      expect(determinePaymentStatus(10000n, 12000n)).toBe('OVERPAID');
    });

    it('should handle zero total', () => {
      expect(determinePaymentStatus(0n, 0n)).toBe('PAID');
    });
  });

  describe('calculateDueDate', () => {
    const baseDate = new Date('2025-01-01');

    it('should calculate due dates for standard terms', () => {
      expect(calculateDueDate(baseDate, 'DUE_ON_RECEIPT').toISOString()).toBe(
        new Date('2025-01-01').toISOString(),
      );
      expect(calculateDueDate(baseDate, 'NET_7').toISOString()).toBe(
        new Date('2025-01-08').toISOString(),
      );
      expect(calculateDueDate(baseDate, 'NET_30').toISOString()).toBe(
        new Date('2025-01-31').toISOString(),
      );
      expect(calculateDueDate(baseDate, 'NET_90').toISOString()).toBe(
        new Date('2025-04-01').toISOString(),
      );
    });

    it('should handle custom terms', () => {
      expect(calculateDueDate(baseDate, 'CUSTOM', 14).toISOString()).toBe(
        new Date('2025-01-15').toISOString(),
      );
    });

    it('should default to 30 days for unknown terms', () => {
      expect(calculateDueDate(baseDate, 'UNKNOWN').toISOString()).toBe(
        new Date('2025-01-31').toISOString(),
      );
    });
  });

  describe('Swiss VAT Rates', () => {
    it('should have correct current rates (2024+)', () => {
      expect(SWISS_VAT_RATES.STANDARD).toBe(810); // 8.1%
      expect(SWISS_VAT_RATES.REDUCED).toBe(260); // 2.6%
      expect(SWISS_VAT_RATES.SPECIAL).toBe(380); // 3.8%
      expect(SWISS_VAT_RATES.EXEMPT).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small quantities', () => {
      const input: LineItemInput = {
        quantity: '0.0001',
        unitPriceMinor: 1000000n, // 10,000.00 CHF
        vatRateBps: SWISS_VAT_RATES.STANDARD,
      };

      const result = calculateLineItem(input, 'EXCLUDED');
      expect(result.lineSubtotalMinor).toBe(100n); // 1.00 CHF
    });

    it('should handle very large amounts', () => {
      const input: LineItemInput = {
        quantity: '1000',
        unitPriceMinor: 10000000n, // 100,000.00 CHF
        vatRateBps: SWISS_VAT_RATES.STANDARD,
      };

      const result = calculateLineItem(input, 'EXCLUDED');
      expect(result.lineSubtotalMinor).toBe(10000000000n); // 100,000,000.00 CHF
    });

    it('should handle 100% discount', () => {
      const input: LineItemInput = {
        quantity: '1',
        unitPriceMinor: 10000n,
        discountPercent: '100',
        vatRateBps: SWISS_VAT_RATES.STANDARD,
      };

      const result = calculateLineItem(input, 'EXCLUDED');
      expect(result.discountMinor).toBe(10000n);
      expect(result.lineNetMinor).toBe(0n);
      expect(result.vatMinor).toBe(0n);
      expect(result.lineTotalMinor).toBe(0n);
    });

    it('should handle fractional percentages', () => {
      const input: LineItemInput = {
        quantity: '1',
        unitPriceMinor: 10000n,
        discountPercent: '5.5',
        vatRateBps: SWISS_VAT_RATES.STANDARD,
      };

      const result = calculateLineItem(input, 'EXCLUDED');
      expect(result.discountMinor).toBe(550n); // 5.50 CHF
    });
  });
});
