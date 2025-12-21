/**
 * Swiss IBAN Validator
 *
 * Validates Swiss and Liechtenstein IBANs according to ISO 13616
 * and detects QR-IBANs (IID 30000-31999).
 *
 * @module invoicing/utils/iban-validator
 */

// ============================================
// Types
// ============================================

export interface IbanValidationResult {
  /** Whether the IBAN is valid */
  valid: boolean;
  /** Normalized IBAN (uppercase, no spaces) */
  normalized: string;
  /** Original input */
  original: string;
  /** Country code (CH or LI) */
  countryCode: string | null;
  /** Check digits */
  checkDigits: string | null;
  /** Bank clearing number / IID */
  iid: string | null;
  /** Account number */
  accountNumber: string | null;
  /** Whether this is a QR-IBAN (IID 30000-31999) */
  isQrIban: boolean;
  /** Error message if invalid */
  error: string | null;
}

// ============================================
// Constants
// ============================================

/** Swiss IBAN length (always 21 characters) */
const SWISS_IBAN_LENGTH = 21;

/** Valid country codes for Swiss QR-bill */
const VALID_COUNTRY_CODES = ['CH', 'LI'];

/** QR-IBAN IID range (Institution Identifier) */
const QR_IID_MIN = 30000;
const QR_IID_MAX = 31999;

/** Character mapping for Mod-97 calculation (A=10, B=11, ..., Z=35) */
const CHAR_MAP: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 18, J: 19,
  K: 20, L: 21, M: 22, N: 23, O: 24, P: 25, Q: 26, R: 27, S: 28, T: 29,
  U: 30, V: 31, W: 32, X: 33, Y: 34, Z: 35,
};

// ============================================
// Core Functions
// ============================================

/**
 * Normalizes an IBAN by removing spaces and converting to uppercase
 *
 * @param iban - Raw IBAN input
 * @returns Normalized IBAN string
 */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/**
 * Validates a Swiss or Liechtenstein IBAN
 *
 * @param iban - IBAN to validate
 * @returns Validation result with parsed components
 */
export function validateIban(iban: string): IbanValidationResult {
  const original = iban;
  const normalized = normalizeIban(iban);

  // Initial result
  const result: IbanValidationResult = {
    valid: false,
    normalized,
    original,
    countryCode: null,
    checkDigits: null,
    iid: null,
    accountNumber: null,
    isQrIban: false,
    error: null,
  };

  // Check for empty input
  if (!normalized) {
    result.error = 'IBAN is required';
    return result;
  }

  // Check length
  if (normalized.length !== SWISS_IBAN_LENGTH) {
    result.error = `Swiss/LI IBAN must be exactly ${SWISS_IBAN_LENGTH} characters, got ${normalized.length}`;
    return result;
  }

  // Extract and validate country code
  const countryCode = normalized.substring(0, 2);
  if (!VALID_COUNTRY_CODES.includes(countryCode)) {
    result.error = `IBAN must start with CH or LI, got ${countryCode}`;
    return result;
  }
  result.countryCode = countryCode;

  // Extract check digits
  const checkDigits = normalized.substring(2, 4);
  if (!/^\d{2}$/.test(checkDigits)) {
    result.error = 'Check digits must be numeric';
    return result;
  }
  result.checkDigits = checkDigits;

  // Validate remaining characters (must be alphanumeric)
  const bban = normalized.substring(4);
  if (!/^[A-Z0-9]+$/.test(bban)) {
    result.error = 'IBAN contains invalid characters';
    return result;
  }

  // Extract IID (Bank Clearing Number) - positions 4-8 (5 digits)
  const iid = normalized.substring(4, 9);
  if (!/^\d{5}$/.test(iid)) {
    result.error = 'Invalid bank clearing number (IID)';
    return result;
  }
  result.iid = iid;

  // Extract account number (positions 9-21)
  result.accountNumber = normalized.substring(9);

  // Validate Mod-97 checksum
  if (!validateMod97(normalized)) {
    result.error = 'Invalid IBAN checksum (Mod-97 validation failed)';
    return result;
  }

  // Check if QR-IBAN
  const iidNum = parseInt(iid, 10);
  result.isQrIban = iidNum >= QR_IID_MIN && iidNum <= QR_IID_MAX;

  result.valid = true;
  return result;
}

/**
 * Validates IBAN using Mod-97 algorithm (ISO 7064)
 *
 * Algorithm:
 * 1. Move first 4 characters to end
 * 2. Convert letters to numbers (A=10, B=11, ..., Z=35)
 * 3. Calculate modulo 97 of resulting number
 * 4. Result must be 1
 *
 * @param iban - Normalized IBAN
 * @returns True if checksum is valid
 */
export function validateMod97(iban: string): boolean {
  // Rearrange: move first 4 chars to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);

  // Convert letters to numbers
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += CHAR_MAP[char];
    } else {
      numericString += char;
    }
  }

  // Calculate modulo 97 using chunk-based approach (handles large numbers)
  const mod97 = mod97Check(numericString);

  return mod97 === 1;
}

/**
 * Calculate Mod-97 for a large number string
 *
 * @param numStr - Numeric string
 * @returns Mod-97 result
 */
function mod97Check(numStr: string): number {
  let remainder = 0;

  for (const digit of numStr) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder;
}

/**
 * Generates check digits for an IBAN
 *
 * @param countryCode - Country code (CH or LI)
 * @param bban - Basic Bank Account Number (17 characters for CH/LI)
 * @returns Two-digit check digits
 */
export function generateCheckDigits(countryCode: string, bban: string): string {
  // Replace check digits with 00
  const tempIban = bban + countryCode + '00';

  // Convert letters to numbers
  let numericString = '';
  for (const char of tempIban) {
    if (char >= 'A' && char <= 'Z') {
      numericString += CHAR_MAP[char];
    } else {
      numericString += char;
    }
  }

  // Calculate: 98 - (numericString mod 97)
  const remainder = mod97Check(numericString);
  const checkDigits = 98 - remainder;

  return checkDigits.toString().padStart(2, '0');
}

/**
 * Checks if an IBAN is a QR-IBAN (IID 30000-31999)
 *
 * @param iban - IBAN to check (can be raw or normalized)
 * @returns True if QR-IBAN
 */
export function isQrIban(iban: string): boolean {
  const normalized = normalizeIban(iban);

  if (normalized.length !== SWISS_IBAN_LENGTH) {
    return false;
  }

  const iid = normalized.substring(4, 9);
  const iidNum = parseInt(iid, 10);

  return iidNum >= QR_IID_MIN && iidNum <= QR_IID_MAX;
}

/**
 * Formats an IBAN with spaces for display
 *
 * @param iban - Normalized IBAN
 * @returns Formatted IBAN (e.g., "CH93 0076 2011 6238 5295 7")
 */
export function formatIbanForDisplay(iban: string): string {
  const normalized = normalizeIban(iban);

  // Group into blocks of 4, last block may be shorter
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    groups.push(normalized.substring(i, i + 4));
  }

  return groups.join(' ');
}

/**
 * Extracts bank information from IBAN IID
 *
 * @param iban - IBAN to analyze
 * @returns Object with IID and whether it's a QR-IBAN
 */
export function extractBankInfo(iban: string): {
  iid: string;
  isQrIban: boolean;
  iidDescription: string;
} {
  const normalized = normalizeIban(iban);
  const iid = normalized.substring(4, 9);
  const iidNum = parseInt(iid, 10);
  const isQr = iidNum >= QR_IID_MIN && iidNum <= QR_IID_MAX;

  return {
    iid,
    isQrIban: isQr,
    iidDescription: isQr
      ? 'QR-IID (supports QR-Reference)'
      : 'Standard IID (supports SCOR or NON reference)',
  };
}

/**
 * Validates IBAN is compatible with a reference type
 *
 * @param iban - IBAN to validate
 * @param referenceType - Reference type (QRR, SCOR, or NON)
 * @returns Object with compatibility status and any errors
 */
export function validateIbanReferenceCompatibility(
  iban: string,
  referenceType: 'QRR' | 'SCOR' | 'NON',
): {
  compatible: boolean;
  error: string | null;
  recommendation: string | null;
} {
  const validation = validateIban(iban);

  if (!validation.valid) {
    return {
      compatible: false,
      error: validation.error,
      recommendation: null,
    };
  }

  if (referenceType === 'QRR') {
    if (!validation.isQrIban) {
      return {
        compatible: false,
        error: 'QRR reference requires a QR-IBAN (IID 30000-31999)',
        recommendation:
          'Use a QR-IBAN from your bank, or switch to SCOR reference type',
      };
    }
  }

  if (referenceType === 'SCOR' || referenceType === 'NON') {
    if (validation.isQrIban) {
      return {
        compatible: true, // Still compatible, but suboptimal
        error: null,
        recommendation:
          'You have a QR-IBAN which supports QRR references. Consider using QRR for better bank processing.',
      };
    }
  }

  return {
    compatible: true,
    error: null,
    recommendation: null,
  };
}
