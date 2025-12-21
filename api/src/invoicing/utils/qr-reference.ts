/**
 * Swiss QR Reference Generator
 *
 * Generates and validates QRR (QR-Reference) and SCOR (Structured Creditor Reference)
 * payment references according to Swiss Payment Standards.
 *
 * @module invoicing/utils/qr-reference
 */

// ============================================
// Types
// ============================================

export type ReferenceType = 'QRR' | 'SCOR' | 'NON';

export interface ReferenceValidationResult {
  /** Whether the reference is valid */
  valid: boolean;
  /** Normalized reference (formatted) */
  normalized: string;
  /** Reference type */
  type: ReferenceType;
  /** Error message if invalid */
  error: string | null;
}

export interface GeneratedReference {
  /** The generated reference */
  reference: string;
  /** Formatted reference for display */
  displayFormat: string;
  /** Reference type */
  type: ReferenceType;
}

// ============================================
// Constants
// ============================================

/** QRR reference length (27 digits) */
const QRR_LENGTH = 27;

/** SCOR prefix */
const SCOR_PREFIX = 'RF';

/** Maximum SCOR reference length (including RF and check digits) */
const SCOR_MAX_LENGTH = 25;

/** SCOR reference part max length (without RF and check digits) */
const SCOR_REF_MAX_LENGTH = 21;

/** Mod-10 recursive table (ESR/ISR standard) */
const MOD_10_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

// ============================================
// QRR (QR-Reference) Functions
// ============================================

/**
 * Generates a QRR (QR-Reference) for payment
 *
 * QRR format: 27 digits with Mod-10 recursive check digit
 * Typically: [Customer Number] + [Invoice Reference] + [Check Digit]
 *
 * @param customerId - Optional customer identifier (max 6 digits)
 * @param invoiceNumber - Invoice or document number (will be converted to digits)
 * @returns Generated QRR reference
 */
export function generateQrrReference(
  customerId: string | null,
  invoiceNumber: string,
): GeneratedReference {
  // Extract only digits from invoice number
  const invoiceDigits = invoiceNumber.replace(/\D/g, '');

  // Build the reference without check digit (26 digits)
  let refWithoutCheck = '';

  // Add customer ID if provided (padded to 6 digits)
  if (customerId) {
    const customerDigits = customerId.replace(/\D/g, '').slice(0, 6);
    refWithoutCheck += customerDigits.padStart(6, '0');
  }

  // Add invoice digits
  refWithoutCheck += invoiceDigits;

  // Pad or truncate to 26 digits
  if (refWithoutCheck.length > 26) {
    refWithoutCheck = refWithoutCheck.slice(-26);
  } else {
    refWithoutCheck = refWithoutCheck.padStart(26, '0');
  }

  // Calculate check digit (Mod-10 recursive)
  const checkDigit = calculateMod10Recursive(refWithoutCheck);

  // Final reference
  const reference = refWithoutCheck + checkDigit;

  return {
    reference,
    displayFormat: formatQrrForDisplay(reference),
    type: 'QRR',
  };
}

/**
 * Calculates Mod-10 recursive check digit (ESR/ISR algorithm)
 *
 * Algorithm:
 * 1. Start with carry = 0
 * 2. For each digit: carry = MOD_10_TABLE[(carry + digit) % 10]
 * 3. Check digit = (10 - carry) % 10
 *
 * @param digits - String of digits (without check digit)
 * @returns Check digit (single digit 0-9)
 */
export function calculateMod10Recursive(digits: string): string {
  let carry = 0;

  for (const char of digits) {
    const digit = parseInt(char, 10);
    carry = MOD_10_TABLE[(carry + digit) % 10];
  }

  const checkDigit = (10 - carry) % 10;
  return checkDigit.toString();
}

/**
 * Validates a QRR reference
 *
 * @param reference - QRR reference to validate
 * @returns Validation result
 */
export function validateQrrReference(reference: string): ReferenceValidationResult {
  // Remove spaces and format characters
  const normalized = reference.replace(/\s/g, '');

  // Check length
  if (normalized.length !== QRR_LENGTH) {
    return {
      valid: false,
      normalized,
      type: 'QRR',
      error: `QRR reference must be exactly ${QRR_LENGTH} digits, got ${normalized.length}`,
    };
  }

  // Check all digits
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      type: 'QRR',
      error: 'QRR reference must contain only digits',
    };
  }

  // Validate check digit
  const refWithoutCheck = normalized.slice(0, -1);
  const expectedCheckDigit = calculateMod10Recursive(refWithoutCheck);
  const actualCheckDigit = normalized.slice(-1);

  if (expectedCheckDigit !== actualCheckDigit) {
    return {
      valid: false,
      normalized,
      type: 'QRR',
      error: `Invalid check digit: expected ${expectedCheckDigit}, got ${actualCheckDigit}`,
    };
  }

  return {
    valid: true,
    normalized,
    type: 'QRR',
    error: null,
  };
}

/**
 * Formats QRR reference for display (groups of 5 digits)
 *
 * @param reference - QRR reference (27 digits)
 * @returns Formatted reference (e.g., "21 00000 00003 13947 14300 09017")
 */
export function formatQrrForDisplay(reference: string): string {
  const normalized = reference.replace(/\s/g, '');

  // First 2 digits, then groups of 5
  let formatted = normalized.substring(0, 2);
  for (let i = 2; i < normalized.length; i += 5) {
    formatted += ' ' + normalized.substring(i, i + 5);
  }

  return formatted;
}

// ============================================
// SCOR (Structured Creditor Reference) Functions
// ============================================

/**
 * Generates a SCOR reference (ISO 11649)
 *
 * SCOR format: "RF" + 2 check digits + reference (max 21 chars alphanumeric)
 *
 * @param invoiceNumber - Invoice or document number
 * @returns Generated SCOR reference
 */
export function generateScorReference(invoiceNumber: string): GeneratedReference {
  // Clean and uppercase the reference
  let refPart = invoiceNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Truncate to max length
  if (refPart.length > SCOR_REF_MAX_LENGTH) {
    refPart = refPart.slice(0, SCOR_REF_MAX_LENGTH);
  }

  // Calculate check digits using ISO 7064 Mod-97
  const checkDigits = calculateScorCheckDigits(refPart);

  // Build full reference
  const reference = SCOR_PREFIX + checkDigits + refPart;

  return {
    reference,
    displayFormat: formatScorForDisplay(reference),
    type: 'SCOR',
  };
}

/**
 * Calculates SCOR check digits using ISO 7064 Mod-97-10
 *
 * Algorithm:
 * 1. Append "RF00" to the reference
 * 2. Convert letters to numbers (A=10, B=11, ..., Z=35)
 * 3. Calculate 98 - (number mod 97)
 *
 * @param refPart - Reference part (without RF and check digits)
 * @returns Two-digit check digits
 */
export function calculateScorCheckDigits(refPart: string): string {
  // Append RF00 (R=27, F=15, 0=0, 0=0)
  const toCheck = refPart + '271500';

  // Convert letters to numbers
  let numericString = '';
  for (const char of toCheck) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString(); // A=10, B=11, etc.
    } else {
      numericString += char;
    }
  }

  // Calculate: 98 - (numericString mod 97)
  const remainder = mod97(numericString);
  const checkDigits = 98 - remainder;

  return checkDigits.toString().padStart(2, '0');
}

/**
 * Calculate Mod-97 for a large number string
 */
function mod97(numStr: string): number {
  let remainder = 0;

  for (const digit of numStr) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder;
}

/**
 * Validates a SCOR reference (ISO 11649)
 *
 * @param reference - SCOR reference to validate
 * @returns Validation result
 */
export function validateScorReference(reference: string): ReferenceValidationResult {
  // Remove spaces and uppercase
  const normalized = reference.replace(/\s/g, '').toUpperCase();

  // Check prefix
  if (!normalized.startsWith(SCOR_PREFIX)) {
    return {
      valid: false,
      normalized,
      type: 'SCOR',
      error: 'SCOR reference must start with "RF"',
    };
  }

  // Check length
  if (normalized.length < 5 || normalized.length > SCOR_MAX_LENGTH) {
    return {
      valid: false,
      normalized,
      type: 'SCOR',
      error: `SCOR reference must be 5-${SCOR_MAX_LENGTH} characters, got ${normalized.length}`,
    };
  }

  // Check format (RF + 2 digits + alphanumeric)
  if (!/^RF\d{2}[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      type: 'SCOR',
      error: 'Invalid SCOR format: must be RF + 2 digits + alphanumeric reference',
    };
  }

  // Validate check digits using Mod-97
  // Move RF + check digits to end and convert
  const checkDigits = normalized.substring(2, 4);
  const refPart = normalized.substring(4);

  // Convert to numeric: reference + RF digits + check digits
  let numericString = '';
  for (const char of refPart + 'RF' + checkDigits) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  const remainder = mod97(numericString);
  if (remainder !== 1) {
    return {
      valid: false,
      normalized,
      type: 'SCOR',
      error: 'Invalid SCOR check digits',
    };
  }

  return {
    valid: true,
    normalized,
    type: 'SCOR',
    error: null,
  };
}

/**
 * Formats SCOR reference for display
 *
 * @param reference - SCOR reference
 * @returns Formatted reference (e.g., "RF18 5390 0754 7034")
 */
export function formatScorForDisplay(reference: string): string {
  const normalized = reference.replace(/\s/g, '').toUpperCase();

  // Groups of 4
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    groups.push(normalized.substring(i, i + 4));
  }

  return groups.join(' ');
}

// ============================================
// Universal Functions
// ============================================

/**
 * Detects the reference type from a reference string
 *
 * @param reference - Reference to analyze
 * @returns Detected reference type
 */
export function detectReferenceType(reference: string): ReferenceType {
  const normalized = reference.replace(/\s/g, '').toUpperCase();

  if (normalized.startsWith('RF') && normalized.length <= SCOR_MAX_LENGTH) {
    return 'SCOR';
  }

  if (/^\d{27}$/.test(normalized)) {
    return 'QRR';
  }

  return 'NON';
}

/**
 * Validates a reference based on its type
 *
 * @param reference - Reference to validate
 * @param type - Expected reference type (or auto-detect if not provided)
 * @returns Validation result
 */
export function validateReference(
  reference: string,
  type?: ReferenceType,
): ReferenceValidationResult {
  const detectedType = type ?? detectReferenceType(reference);

  switch (detectedType) {
    case 'QRR':
      return validateQrrReference(reference);
    case 'SCOR':
      return validateScorReference(reference);
    case 'NON':
      return {
        valid: true,
        normalized: reference.trim(),
        type: 'NON',
        error: null,
      };
    default:
      return {
        valid: false,
        normalized: reference,
        type: 'NON',
        error: 'Unknown reference type',
      };
  }
}

/**
 * Generates a reference based on the specified type
 *
 * @param type - Reference type to generate
 * @param invoiceNumber - Invoice number to include
 * @param customerId - Optional customer ID (for QRR)
 * @returns Generated reference or null for NON type
 */
export function generateReference(
  type: ReferenceType,
  invoiceNumber: string,
  customerId?: string,
): GeneratedReference | null {
  switch (type) {
    case 'QRR':
      return generateQrrReference(customerId ?? null, invoiceNumber);
    case 'SCOR':
      return generateScorReference(invoiceNumber);
    case 'NON':
      return null;
    default:
      return null;
  }
}
