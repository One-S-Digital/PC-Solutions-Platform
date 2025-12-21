/**
 * Swiss QR Compliance Unit Tests
 *
 * Tests for IBAN validation, QR reference generation, and QR-bill payload.
 */

import {
  validateIban,
  normalizeIban,
  isQrIban,
  formatIbanForDisplay,
  validateMod97,
  validateIbanReferenceCompatibility,
} from '../utils/iban-validator';

import {
  generateQrrReference,
  validateQrrReference,
  calculateMod10Recursive,
  formatQrrForDisplay,
  generateScorReference,
  validateScorReference,
  formatScorForDisplay,
  detectReferenceType,
  validateReference,
  generateReference,
} from '../utils/qr-reference';

import {
  generateQrPayload,
  validateQrBillData,
  parseQrPayload,
  hashPayload,
  buildQrBillDataFromInvoice,
  QrBillData,
} from '../utils/qr-bill.service';

// ============================================
// IBAN Validator Tests
// ============================================

describe('IBAN Validator', () => {
  describe('normalizeIban', () => {
    it('should remove spaces and uppercase', () => {
      expect(normalizeIban('ch93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957');
      expect(normalizeIban('CH93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957');
    });
  });

  describe('validateIban', () => {
    it('should validate correct Swiss IBAN', () => {
      const result = validateIban('CH9300762011623852957');
      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('CH');
      expect(result.isQrIban).toBe(false);
    });

    it('should validate correct Liechtenstein IBAN', () => {
      const result = validateIban('LI21088100002324013AA');
      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('LI');
    });

    it('should detect QR-IBAN', () => {
      // QR-IBAN has IID 30000-31999
      const result = validateIban('CH4431999123000889012');
      expect(result.valid).toBe(true);
      expect(result.isQrIban).toBe(true);
    });

    it('should reject invalid length', () => {
      const result = validateIban('CH930076201162385295');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('21 characters');
    });

    it('should reject non-Swiss IBAN', () => {
      // Use a 21-char string that starts with non-CH/LI country code
      const result = validateIban('DE8937040044053201301');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CH or LI');
    });

    it('should reject invalid checksum', () => {
      const result = validateIban('CH0000762011623852957'); // Invalid check digits
      expect(result.valid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should handle formatted input', () => {
      const result = validateIban('CH93 0076 2011 6238 5295 7');
      expect(result.valid).toBe(true);
    });
  });

  describe('isQrIban', () => {
    it('should return true for QR-IBAN', () => {
      expect(isQrIban('CH4431999123000889012')).toBe(true);
      expect(isQrIban('CH4430000123000889012')).toBe(true);
    });

    it('should return false for standard IBAN', () => {
      expect(isQrIban('CH9300762011623852957')).toBe(false);
    });
  });

  describe('formatIbanForDisplay', () => {
    it('should format IBAN with spaces', () => {
      expect(formatIbanForDisplay('CH9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
    });
  });

  describe('validateMod97', () => {
    it('should validate correct checksum', () => {
      expect(validateMod97('CH9300762011623852957')).toBe(true);
    });

    it('should reject incorrect checksum', () => {
      expect(validateMod97('CH0000762011623852957')).toBe(false);
    });
  });

  describe('validateIbanReferenceCompatibility', () => {
    it('should accept QRR with QR-IBAN', () => {
      const result = validateIbanReferenceCompatibility('CH4431999123000889012', 'QRR');
      expect(result.compatible).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject QRR with standard IBAN', () => {
      const result = validateIbanReferenceCompatibility('CH9300762011623852957', 'QRR');
      expect(result.compatible).toBe(false);
      expect(result.error).toContain('QR-IBAN');
    });

    it('should accept SCOR with standard IBAN', () => {
      const result = validateIbanReferenceCompatibility('CH9300762011623852957', 'SCOR');
      expect(result.compatible).toBe(true);
    });

    it('should recommend QRR when using QR-IBAN with SCOR', () => {
      const result = validateIbanReferenceCompatibility('CH4431999123000889012', 'SCOR');
      expect(result.compatible).toBe(true);
      expect(result.recommendation).toContain('QRR');
    });
  });
});

// ============================================
// QR Reference Tests
// ============================================

describe('QR Reference Generator', () => {
  describe('QRR (QR-Reference)', () => {
    describe('calculateMod10Recursive', () => {
      it('should calculate correct check digit', () => {
        // Known test vector
        expect(calculateMod10Recursive('21000000000313947143000901')).toBe('7');
      });
    });

    describe('generateQrrReference', () => {
      it('should generate 27-digit reference', () => {
        const result = generateQrrReference('123456', '789');
        expect(result.reference).toHaveLength(27);
        expect(result.type).toBe('QRR');
      });

      it('should generate valid reference', () => {
        const result = generateQrrReference(null, '12345');
        const validation = validateQrrReference(result.reference);
        expect(validation.valid).toBe(true);
      });

      it('should include customer ID in reference', () => {
        const result = generateQrrReference('42', '12345');
        // Customer ID is padded and included in the reference
        expect(result.reference).toContain('000042');
        expect(result.reference).toHaveLength(27);
      });
    });

    describe('validateQrrReference', () => {
      it('should validate correct reference', () => {
        const result = validateQrrReference('210000000003139471430009017');
        expect(result.valid).toBe(true);
      });

      it('should reject incorrect length', () => {
        const result = validateQrrReference('123456');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('27 digits');
      });

      it('should reject invalid check digit', () => {
        const result = validateQrrReference('210000000003139471430009010');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('check digit');
      });

      it('should reject non-numeric characters', () => {
        const result = validateQrrReference('21000000000313947143000901A');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('only digits');
      });
    });

    describe('formatQrrForDisplay', () => {
      it('should format with spaces', () => {
        expect(formatQrrForDisplay('210000000003139471430009017'))
          .toBe('21 00000 00003 13947 14300 09017');
      });
    });
  });

  describe('SCOR (Structured Creditor Reference)', () => {
    describe('generateScorReference', () => {
      it('should generate valid SCOR reference', () => {
        const result = generateScorReference('INV2025001');
        expect(result.reference).toMatch(/^RF\d{2}[A-Z0-9]+$/);
        expect(result.type).toBe('SCOR');
      });

      it('should generate verifiable reference', () => {
        const result = generateScorReference('INV2025001');
        const validation = validateScorReference(result.reference);
        expect(validation.valid).toBe(true);
      });

      it('should truncate long references', () => {
        const longRef = 'A'.repeat(30);
        const result = generateScorReference(longRef);
        expect(result.reference.length).toBeLessThanOrEqual(25);
      });
    });

    describe('validateScorReference', () => {
      it('should validate correct reference', () => {
        // Generate a known valid SCOR
        const generated = generateScorReference('TEST123');
        const result = validateScorReference(generated.reference);
        expect(result.valid).toBe(true);
      });

      it('should reject missing RF prefix', () => {
        const result = validateScorReference('XX12TEST123');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('RF');
      });

      it('should reject invalid check digits', () => {
        const result = validateScorReference('RF00TEST123');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('check digits');
      });

      it('should reject too long reference', () => {
        const result = validateScorReference('RF12' + 'A'.repeat(25));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('25');
      });
    });

    describe('formatScorForDisplay', () => {
      it('should format with spaces in groups of 4', () => {
        expect(formatScorForDisplay('RF18539007547034')).toBe('RF18 5390 0754 7034');
      });
    });
  });

  describe('Universal Functions', () => {
    describe('detectReferenceType', () => {
      it('should detect QRR', () => {
        expect(detectReferenceType('210000000003139471430009017')).toBe('QRR');
      });

      it('should detect SCOR', () => {
        expect(detectReferenceType('RF18539007547034')).toBe('SCOR');
      });

      it('should default to NON', () => {
        expect(detectReferenceType('INVOICE-2025-001')).toBe('NON');
      });
    });

    describe('validateReference', () => {
      it('should validate QRR automatically', () => {
        const result = validateReference('210000000003139471430009017');
        expect(result.type).toBe('QRR');
        expect(result.valid).toBe(true);
      });

      it('should validate with explicit type', () => {
        const scor = generateScorReference('TEST');
        const result = validateReference(scor.reference, 'SCOR');
        expect(result.valid).toBe(true);
      });

      it('should always accept NON type', () => {
        const result = validateReference('any text', 'NON');
        expect(result.valid).toBe(true);
      });
    });

    describe('generateReference', () => {
      it('should generate QRR', () => {
        const result = generateReference('QRR', 'INV001', '123456');
        expect(result).not.toBeNull();
        expect(result!.type).toBe('QRR');
      });

      it('should generate SCOR', () => {
        const result = generateReference('SCOR', 'INV001');
        expect(result).not.toBeNull();
        expect(result!.type).toBe('SCOR');
      });

      it('should return null for NON', () => {
        const result = generateReference('NON', 'INV001');
        expect(result).toBeNull();
      });
    });
  });
});

// ============================================
// QR-Bill Payload Tests
// ============================================

describe('QR-Bill Service', () => {
  const validCreditor = {
    name: 'ProCrèche GmbH',
    addressLine1: 'Musterstrasse 1',
    postalCode: '8000',
    city: 'Zürich',
    country: 'CH',
  };

  const validData: QrBillData = {
    iban: 'CH9300762011623852957',
    creditor: validCreditor,
    amountMinor: 150000n, // 1500.00 CHF
    currency: 'CHF',
    referenceType: 'SCOR',
    reference: generateScorReference('INV2025001').reference,
  };

  describe('validateQrBillData', () => {
    it('should validate complete valid data', () => {
      const result = validateQrBillData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid IBAN', () => {
      const data = { ...validData, iban: 'INVALID' };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('IBAN'))).toBe(true);
    });

    it('should reject QRR with non-QR-IBAN', () => {
      const qrrRef = generateQrrReference(null, 'INV001').reference;
      const data = { ...validData, referenceType: 'QRR' as const, reference: qrrRef };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('QR-IBAN'))).toBe(true);
    });

    it('should reject missing creditor fields', () => {
      const data = {
        ...validData,
        creditor: { ...validCreditor, name: '' },
      };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject negative amount', () => {
      const data = { ...validData, amountMinor: -100n };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('negative'))).toBe(true);
    });

    it('should reject amount over maximum', () => {
      const data = { ...validData, amountMinor: 100000000000n };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('maximum'))).toBe(true);
    });

    it('should reject invalid currency', () => {
      const data = { ...validData, currency: 'USD' as any };
      const result = validateQrBillData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('CHF or EUR'))).toBe(true);
    });
  });

  describe('generateQrPayload', () => {
    it('should generate valid payload', () => {
      const result = generateQrPayload(validData);
      expect(result.success).toBe(true);
      expect(result.payload).toBeTruthy();
      expect(result.payloadHash).toHaveLength(64); // SHA-256 hex
    });

    it('should generate correct header', () => {
      const result = generateQrPayload(validData);
      const lines = result.payload.split('\n');
      expect(lines[0]).toBe('SPC');
      expect(lines[1]).toBe('0200');
      expect(lines[2]).toBe('1');
    });

    it('should include IBAN', () => {
      const result = generateQrPayload(validData);
      const lines = result.payload.split('\n');
      expect(lines[3]).toBe('CH9300762011623852957');
    });

    it('should include creditor', () => {
      const result = generateQrPayload(validData);
      const lines = result.payload.split('\n');
      expect(lines[4]).toBe('S'); // Address type
      expect(lines[5]).toBe('ProCrèche GmbH');
      expect(lines[6]).toBe('Musterstrasse 1');
    });

    it('should include amount and currency', () => {
      const result = generateQrPayload(validData);
      const lines = result.payload.split('\n');
      expect(lines[18]).toBe('1500.00');
      expect(lines[19]).toBe('CHF');
    });

    it('should include trailer', () => {
      const result = generateQrPayload(validData);
      const lines = result.payload.split('\n');
      expect(lines[30]).toBe('EPD');
    });

    it('should handle open amount', () => {
      const data = { ...validData, amountMinor: undefined };
      const result = generateQrPayload(data);
      const lines = result.payload.split('\n');
      expect(lines[18]).toBe(''); // Empty amount
    });

    it('should include debtor when provided', () => {
      const data: QrBillData = {
        ...validData,
        debtor: {
          name: 'Kinderkrippe Sonnenschein',
          addressLine1: 'Beispielweg 42',
          postalCode: '3000',
          city: 'Bern',
          country: 'CH',
        },
      };
      const result = generateQrPayload(data);
      const lines = result.payload.split('\n');
      expect(lines[20]).toBe('S');
      expect(lines[21]).toBe('Kinderkrippe Sonnenschein');
    });

    it('should return errors for invalid data', () => {
      const data = { ...validData, iban: 'INVALID' };
      const result = generateQrPayload(data);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseQrPayload', () => {
    it('should parse valid payload', () => {
      const generated = generateQrPayload(validData);
      const parsed = parseQrPayload(generated.payload);
      
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toBeNull();
      expect(parsed.data!.iban).toBe('CH9300762011623852957');
      expect(parsed.data!.currency).toBe('CHF');
    });

    it('should reject invalid payload', () => {
      const result = parseQrPayload('invalid');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject wrong version', () => {
      const payload = 'SPC\n0100\n1\n' + 'x\n'.repeat(30);
      const result = parseQrPayload(payload);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });
  });

  describe('hashPayload', () => {
    it('should generate consistent hash', () => {
      const payload = 'test payload';
      const hash1 = hashPayload(payload);
      const hash2 = hashPayload(payload);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hash for different payloads', () => {
      const hash1 = hashPayload('payload 1');
      const hash2 = hashPayload('payload 2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('buildQrBillDataFromInvoice', () => {
    it('should build complete data object', () => {
      const data = buildQrBillDataFromInvoice({
        iban: 'CH9300762011623852957',
        creditorName: 'Test Company',
        creditorAddress: 'Test Street 1',
        creditorPostalCode: '8000',
        creditorCity: 'Zürich',
        creditorCountry: 'CH',
        amountMinor: 10000n,
        currency: 'CHF',
        referenceType: 'SCOR',
        reference: 'RF12TEST',
      });

      expect(data.iban).toBe('CH9300762011623852957');
      expect(data.creditor.name).toBe('Test Company');
      expect(data.amountMinor).toBe(10000n);
      expect(data.debtor).toBeUndefined();
    });

    it('should include debtor when provided', () => {
      const data = buildQrBillDataFromInvoice({
        iban: 'CH9300762011623852957',
        creditorName: 'Test Company',
        creditorAddress: 'Test Street 1',
        creditorPostalCode: '8000',
        creditorCity: 'Zürich',
        creditorCountry: 'CH',
        debtorName: 'Client Company',
        debtorAddress: 'Client Street 2',
        debtorPostalCode: '3000',
        debtorCity: 'Bern',
        debtorCountry: 'CH',
        amountMinor: 10000n,
        currency: 'CHF',
        referenceType: 'SCOR',
        reference: 'RF12TEST',
      });

      expect(data.debtor).toBeDefined();
      expect(data.debtor!.name).toBe('Client Company');
    });
  });
});
