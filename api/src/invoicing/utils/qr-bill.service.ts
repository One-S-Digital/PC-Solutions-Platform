/**
 * Swiss QR-Bill Service
 *
 * Generates SIX SPS 2022 compliant QR-bill payloads for Swiss payment slips.
 *
 * Reference: SIX Swiss Payment Standards (https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-en.pdf)
 *
 * @module invoicing/utils/qr-bill.service
 */

import { createHash } from 'crypto';
import { validateIban, isQrIban, normalizeIban } from './iban-validator';
import { validateReference, ReferenceType } from './qr-reference';
import { formatMinorToDecimal } from './money-engine';

// ============================================
// Types
// ============================================

export interface QrBillCreditor {
  /** Creditor name (max 70 chars) */
  name: string;
  /** Street or PO Box */
  addressLine1: string;
  /** Building number or apartment (optional) */
  addressLine2?: string;
  /** Postal code */
  postalCode: string;
  /** City */
  city: string;
  /** Country code (CH or LI) */
  country: string;
}

export interface QrBillDebtor {
  /** Debtor name (max 70 chars) */
  name: string;
  /** Street or PO Box */
  addressLine1: string;
  /** Building number or apartment (optional) */
  addressLine2?: string;
  /** Postal code */
  postalCode: string;
  /** City */
  city: string;
  /** Country code (2 letters) */
  country: string;
}

export interface QrBillData {
  /** Creditor IBAN (CH or LI) */
  iban: string;
  /** Creditor details */
  creditor: QrBillCreditor;
  /** Amount in minor units (centimes) - optional for open amount */
  amountMinor?: bigint;
  /** Currency (CHF or EUR) */
  currency: 'CHF' | 'EUR';
  /** Debtor details (optional) */
  debtor?: QrBillDebtor;
  /** Reference type */
  referenceType: ReferenceType;
  /** Reference number (required for QRR and SCOR) */
  reference?: string;
  /** Unstructured message (max 140 chars) */
  unstructuredMessage?: string;
  /** Bill information (structured, max 140 chars, optional) */
  billInformation?: string;
}

export interface QrBillResult {
  /** Whether the payload was generated successfully */
  success: boolean;
  /** The QR payload string */
  payload: string;
  /** SHA-256 hash of the payload */
  payloadHash: string;
  /** Validation errors if any */
  errors: string[];
  /** The parsed/validated data */
  validatedData: QrBillData | null;
}

export interface QrBillValidationResult {
  /** Whether all data is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
}

// ============================================
// Constants
// ============================================

/** QR-bill header */
const QR_TYPE = 'SPC';
const QR_VERSION = '0200';
const QR_CODING = '1'; // UTF-8

/** Address type constants */
const ADDRESS_TYPE_STRUCTURED = 'S';
const ADDRESS_TYPE_COMBINED = 'K';

/** Trailer */
const QR_TRAILER = 'EPD';

/** Field limits */
const MAX_NAME_LENGTH = 70;
const MAX_ADDRESS_LENGTH = 70;
const MAX_CITY_LENGTH = 35;
const MAX_POSTAL_CODE_LENGTH = 16;
const MAX_MESSAGE_LENGTH = 140;

// ============================================
// QR Payload Generation
// ============================================

/**
 * Generates a Swiss QR-bill payload string
 *
 * The payload follows the SIX SPS 2022 specification with 32 data elements
 * separated by newline characters.
 *
 * @param data - QR bill data
 * @returns QR bill result with payload and hash
 */
export function generateQrPayload(data: QrBillData): QrBillResult {
  // Validate all data first
  const validation = validateQrBillData(data);

  if (!validation.valid) {
    return {
      success: false,
      payload: '',
      payloadHash: '',
      errors: validation.errors,
      validatedData: null,
    };
  }

  // Build the payload
  const lines: string[] = [];

  // Header (3 elements)
  lines.push(QR_TYPE);           // 1. QR Type
  lines.push(QR_VERSION);        // 2. Version
  lines.push(QR_CODING);         // 3. Coding Type (1 = UTF-8)

  // Creditor Account (1 element)
  lines.push(normalizeIban(data.iban)); // 4. IBAN

  // Creditor (7 elements) - Using structured address (S)
  lines.push(ADDRESS_TYPE_STRUCTURED);  // 5. Address Type
  lines.push(truncate(data.creditor.name, MAX_NAME_LENGTH)); // 6. Name
  lines.push(truncate(data.creditor.addressLine1, MAX_ADDRESS_LENGTH)); // 7. Street/PO Box
  lines.push(truncate(data.creditor.addressLine2 ?? '', MAX_ADDRESS_LENGTH)); // 8. Building/Apt
  lines.push(truncate(data.creditor.postalCode, MAX_POSTAL_CODE_LENGTH)); // 9. Postal Code
  lines.push(truncate(data.creditor.city, MAX_CITY_LENGTH)); // 10. City
  lines.push(data.creditor.country); // 11. Country

  // Ultimate Creditor (7 elements) - Empty for v1
  lines.push(''); // 12. Address Type
  lines.push(''); // 13. Name
  lines.push(''); // 14. Street
  lines.push(''); // 15. Building
  lines.push(''); // 16. Postal Code
  lines.push(''); // 17. City
  lines.push(''); // 18. Country

  // Payment Amount (2 elements)
  if (data.amountMinor !== undefined && data.amountMinor > 0n) {
    lines.push(formatMinorToDecimal(data.amountMinor)); // 19. Amount (e.g., "1500.00")
  } else {
    lines.push(''); // 19. Empty for open amount
  }
  lines.push(data.currency); // 20. Currency

  // Ultimate Debtor (7 elements)
  if (data.debtor) {
    lines.push(ADDRESS_TYPE_STRUCTURED); // 21. Address Type
    lines.push(truncate(data.debtor.name, MAX_NAME_LENGTH)); // 22. Name
    lines.push(truncate(data.debtor.addressLine1, MAX_ADDRESS_LENGTH)); // 23. Street
    lines.push(truncate(data.debtor.addressLine2 ?? '', MAX_ADDRESS_LENGTH)); // 24. Building
    lines.push(truncate(data.debtor.postalCode, MAX_POSTAL_CODE_LENGTH)); // 25. Postal Code
    lines.push(truncate(data.debtor.city, MAX_CITY_LENGTH)); // 26. City
    lines.push(data.debtor.country); // 27. Country
  } else {
    lines.push(''); // 21. Address Type
    lines.push(''); // 22. Name
    lines.push(''); // 23. Street
    lines.push(''); // 24. Building
    lines.push(''); // 25. Postal Code
    lines.push(''); // 26. City
    lines.push(''); // 27. Country
  }

  // Payment Reference (2 elements)
  lines.push(data.referenceType); // 28. Reference Type (QRR/SCOR/NON)
  lines.push(data.reference ?? ''); // 29. Reference

  // Additional Information (2 elements)
  lines.push(truncate(data.unstructuredMessage ?? '', MAX_MESSAGE_LENGTH)); // 30. Unstructured Message
  lines.push(QR_TRAILER); // 31. Trailer (EPD)

  // Bill Information (1 element, optional)
  if (data.billInformation) {
    lines.push(truncate(data.billInformation, MAX_MESSAGE_LENGTH)); // 32. Bill Information
  }

  // Join with newlines
  const payload = lines.join('\n');

  // Generate hash
  const payloadHash = createHash('sha256').update(payload).digest('hex');

  return {
    success: true,
    payload,
    payloadHash,
    errors: [],
    validatedData: data,
  };
}

/**
 * Validates QR-bill data for completeness and compliance
 *
 * @param data - QR bill data to validate
 * @returns Validation result
 */
export function validateQrBillData(data: QrBillData): QrBillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate IBAN
  const ibanValidation = validateIban(data.iban);
  if (!ibanValidation.valid) {
    errors.push(`IBAN: ${ibanValidation.error}`);
  }

  // Validate IBAN/Reference type compatibility
  if (ibanValidation.valid) {
    const isQr = isQrIban(data.iban);

    if (data.referenceType === 'QRR' && !isQr) {
      errors.push('QRR reference type requires a QR-IBAN (IID 30000-31999)');
    }

    if (data.referenceType !== 'QRR' && isQr) {
      warnings.push('Using QR-IBAN without QRR reference type is suboptimal');
    }
  }

  // Validate reference
  if (data.referenceType !== 'NON') {
    if (!data.reference) {
      errors.push(`Reference is required for ${data.referenceType} type`);
    } else {
      const refValidation = validateReference(data.reference, data.referenceType);
      if (!refValidation.valid) {
        errors.push(`Reference: ${refValidation.error}`);
      }
    }
  }

  // Validate creditor
  if (!data.creditor.name) {
    errors.push('Creditor name is required');
  }
  if (!data.creditor.addressLine1) {
    errors.push('Creditor address is required');
  }
  if (!data.creditor.postalCode) {
    errors.push('Creditor postal code is required');
  }
  if (!data.creditor.city) {
    errors.push('Creditor city is required');
  }
  if (!data.creditor.country || !/^[A-Z]{2}$/.test(data.creditor.country)) {
    errors.push('Creditor country must be a valid 2-letter code');
  }

  // Validate debtor if provided
  if (data.debtor) {
    if (data.debtor.name && !data.debtor.addressLine1) {
      warnings.push('Debtor address is recommended when name is provided');
    }
  }

  // Validate amount
  if (data.amountMinor !== undefined) {
    if (data.amountMinor < 0n) {
      errors.push('Amount cannot be negative');
    }
    if (data.amountMinor > 99999999999n) { // Max 999'999'999.99
      errors.push('Amount exceeds maximum (999,999,999.99)');
    }
  }

  // Validate currency
  if (!['CHF', 'EUR'].includes(data.currency)) {
    errors.push('Currency must be CHF or EUR');
  }

  // Validate message length
  if (data.unstructuredMessage && data.unstructuredMessage.length > MAX_MESSAGE_LENGTH) {
    warnings.push(`Message will be truncated to ${MAX_MESSAGE_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parses a QR payload string back into data
 *
 * @param payload - QR payload string
 * @returns Parsed data or errors
 */
export function parseQrPayload(payload: string): {
  success: boolean;
  data: Partial<QrBillData> | null;
  errors: string[];
} {
  const lines = payload.split('\n');
  const errors: string[] = [];

  // Validate header
  if (lines.length < 31) {
    return {
      success: false,
      data: null,
      errors: ['Invalid payload: insufficient data'],
    };
  }

  if (lines[0] !== QR_TYPE) {
    errors.push(`Invalid QR type: expected ${QR_TYPE}, got ${lines[0]}`);
  }

  if (lines[1] !== QR_VERSION) {
    errors.push(`Unsupported version: expected ${QR_VERSION}, got ${lines[1]}`);
  }

  if (errors.length > 0) {
    return { success: false, data: null, errors };
  }

  // Parse data
  const data: Partial<QrBillData> = {
    iban: lines[3],
    creditor: {
      name: lines[5],
      addressLine1: lines[6],
      addressLine2: lines[7] || undefined,
      postalCode: lines[8],
      city: lines[9],
      country: lines[10],
    },
    currency: lines[19] as 'CHF' | 'EUR',
    referenceType: lines[27] as ReferenceType,
    reference: lines[28] || undefined,
    unstructuredMessage: lines[29] || undefined,
  };

  // Parse amount
  if (lines[18]) {
    const amountStr = lines[18];
    const [intPart, decPart = '00'] = amountStr.split('.');
    const amountMinor = BigInt(intPart) * 100n + BigInt(decPart.padEnd(2, '0').slice(0, 2));
    data.amountMinor = amountMinor;
  }

  // Parse debtor if present
  if (lines[20] && lines[21]) {
    data.debtor = {
      name: lines[21],
      addressLine1: lines[22],
      addressLine2: lines[23] || undefined,
      postalCode: lines[24],
      city: lines[25],
      country: lines[26],
    };
  }

  // Parse bill information if present
  if (lines[31]) {
    data.billInformation = lines[31];
  }

  return { success: true, data, errors: [] };
}

/**
 * Generates a SHA-256 hash of the QR payload
 *
 * @param payload - QR payload string
 * @returns Hex-encoded SHA-256 hash
 */
export function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Truncates a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength);
}

/**
 * Builds QR bill data from invoice document and settings
 *
 * This is a convenience function for building QR bill data from
 * invoicing system entities.
 *
 * @param params - Parameters for building QR bill data
 * @returns QR bill data ready for payload generation
 */
export function buildQrBillDataFromInvoice(params: {
  iban: string;
  creditorName: string;
  creditorAddress: string;
  creditorAddress2?: string;
  creditorPostalCode: string;
  creditorCity: string;
  creditorCountry: string;
  debtorName?: string;
  debtorAddress?: string;
  debtorAddress2?: string;
  debtorPostalCode?: string;
  debtorCity?: string;
  debtorCountry?: string;
  amountMinor: bigint;
  currency: 'CHF' | 'EUR';
  referenceType: ReferenceType;
  reference?: string;
  message?: string;
}): QrBillData {
  const data: QrBillData = {
    iban: params.iban,
    creditor: {
      name: params.creditorName,
      addressLine1: params.creditorAddress,
      addressLine2: params.creditorAddress2,
      postalCode: params.creditorPostalCode,
      city: params.creditorCity,
      country: params.creditorCountry,
    },
    amountMinor: params.amountMinor,
    currency: params.currency,
    referenceType: params.referenceType,
    reference: params.reference,
    unstructuredMessage: params.message,
  };

  if (params.debtorName && params.debtorAddress) {
    data.debtor = {
      name: params.debtorName,
      addressLine1: params.debtorAddress,
      addressLine2: params.debtorAddress2,
      postalCode: params.debtorPostalCode ?? '',
      city: params.debtorCity ?? '',
      country: params.debtorCountry ?? 'CH',
    };
  }

  return data;
}
