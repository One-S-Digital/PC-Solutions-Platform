/**
 * Invoicing Settings DTOs
 *
 * DTOs for managing organization invoicing settings including
 * company details, banking info, QR-bill settings, and numbering.
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  Max,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Enums (matching Prisma schema)
// ============================================

export enum InvoiceReferenceType {
  QRR = 'QRR',
  SCOR = 'SCOR',
  NON = 'NON',
}

export enum InvoiceAddressType {
  STRUCTURED = 'STRUCTURED',
  COMBINED = 'COMBINED',
}

export enum InvoicePaymentTerms {
  DUE_ON_RECEIPT = 'DUE_ON_RECEIPT',
  NET_7 = 'NET_7',
  NET_10 = 'NET_10',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  NET_90 = 'NET_90',
  CUSTOM = 'CUSTOM',
}

export enum VatDisplayMode {
  EXCLUDED = 'EXCLUDED',
  INCLUDED = 'INCLUDED',
}

// ============================================
// Bank Account DTOs
// ============================================

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Account holder name', example: 'ProCrèche GmbH' })
  @IsString()
  @MaxLength(70)
  accountName: string;

  @ApiProperty({
    description: 'Swiss IBAN (CH or LI)',
    example: 'CH93 0076 2011 6238 5295 7',
  })
  @IsString()
  @Matches(/^(CH|LI)\d{2}\s?[\dA-Z]{4}\s?[\dA-Z]{4}\s?[\dA-Z]{4}\s?[\dA-Z]{4}\s?[\dA-Z]{1}$/, {
    message: 'IBAN must be a valid Swiss (CH) or Liechtenstein (LI) IBAN',
  })
  iban: string;

  @ApiPropertyOptional({ description: 'Bank name', example: 'PostFinance AG' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  bankName?: string;

  @ApiPropertyOptional({ description: 'BIC/SWIFT code', example: 'POFICHBEXXX' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'BIC must be a valid SWIFT code (8 or 11 characters)',
  })
  bic?: string;

  @ApiPropertyOptional({
    description: 'Set as default account for this organization',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  accountName?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  bankName?: string;

  @ApiPropertyOptional({ description: 'BIC/SWIFT code' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'BIC must be a valid SWIFT code (8 or 11 characters)',
  })
  bic?: string;

  @ApiPropertyOptional({ description: 'Set as default account' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Account active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BankAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  iban: string;

  @ApiPropertyOptional()
  bankName?: string;

  @ApiPropertyOptional()
  bic?: string;

  @ApiProperty({ description: 'Whether this is a QR-IBAN (IID 30000-31999)' })
  isQrIban: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// Invoicing Settings DTOs
// ============================================

export class CreateInvoicingSettingsDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Legal company name for invoices',
    example: 'ProCrèche GmbH',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Trading/DBA name (if different)',
    example: 'ProCrèche',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  tradingName?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: 'Musterstrasse 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  addressLine1?: string;

  @ApiPropertyOptional({
    description: 'Building/apartment (optional)',
    example: 'Building A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '8000' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Zürich' })
  @IsOptional()
  @IsString()
  @MaxLength(35)
  city?: string;

  @ApiPropertyOptional({
    description: 'ISO country code',
    example: 'CH',
    default: 'CH',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({
    description: 'Address format for QR-bill',
    enum: InvoiceAddressType,
    default: InvoiceAddressType.STRUCTURED,
  })
  @IsOptional()
  @IsEnum(InvoiceAddressType)
  addressType?: InvoiceAddressType;

  @ApiPropertyOptional({
    description: 'Swiss VAT number (CHE-xxx.xxx.xxx MWST)',
    example: 'CHE-123.456.789 MWST',
  })
  @IsOptional()
  @IsString()
  @Matches(/^CHE-\d{3}\.\d{3}\.\d{3}\s?(MWST|TVA|IVA)?$/, {
    message: 'VAT number must be in format CHE-xxx.xxx.xxx MWST',
  })
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial register number',
    example: 'CHE-123.456.789',
  })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Default bank account ID',
  })
  @IsOptional()
  @IsUUID()
  defaultBankAccountId?: string;

  @ApiPropertyOptional({
    description: 'Enable QR-bill by default on new documents',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  qrEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Default reference type for QR-bill',
    enum: InvoiceReferenceType,
    default: InvoiceReferenceType.SCOR,
  })
  @IsOptional()
  @IsEnum(InvoiceReferenceType)
  defaultReferenceType?: InvoiceReferenceType;

  @ApiPropertyOptional({
    description: 'Default payment terms',
    enum: InvoicePaymentTerms,
    default: InvoicePaymentTerms.NET_30,
  })
  @IsOptional()
  @IsEnum(InvoicePaymentTerms)
  defaultPaymentTerms?: InvoicePaymentTerms;

  @ApiPropertyOptional({
    description: 'Default due days for CUSTOM payment terms',
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  defaultDueDays?: number;

  @ApiPropertyOptional({
    description: 'Default VAT display mode',
    enum: VatDisplayMode,
    default: VatDisplayMode.EXCLUDED,
  })
  @IsOptional()
  @IsEnum(VatDisplayMode)
  defaultVatDisplayMode?: VatDisplayMode;

  @ApiPropertyOptional({
    description: 'Default notes/footer for documents',
    example: 'Thank you for your business!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultNotes?: string;

  @ApiPropertyOptional({
    description: 'Default document language',
    example: 'de',
    default: 'de',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(de|fr|it|en)$/, {
    message: 'Language must be de, fr, it, or en',
  })
  defaultLanguage?: string;

  @ApiPropertyOptional({
    description: 'Invoice number prefix',
    example: 'INV',
    default: 'INV',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  invoicePrefix?: string;

  @ApiPropertyOptional({
    description: 'Credit note number prefix',
    example: 'CN',
    default: 'CN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  creditNotePrefix?: string;

  @ApiPropertyOptional({
    description: 'Proforma invoice number prefix',
    example: 'PF',
    default: 'PF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  proformaPrefix?: string;

  @ApiPropertyOptional({
    description: 'Quote number prefix',
    example: 'QT',
    default: 'QT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  quotePrefix?: string;

  @ApiPropertyOptional({
    description: 'Number format template',
    example: '{PREFIX}-{YEAR}-{SEQ:5}',
    default: '{PREFIX}-{YEAR}-{SEQ:5}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numberFormat?: string;

  @ApiPropertyOptional({
    description: 'Reset sequence numbers each year',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  yearlyReset?: boolean;
}

export class UpdateInvoicingSettingsDto {
  @ApiPropertyOptional({ description: 'Legal company name for invoices' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Trading/DBA name' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  tradingName?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Building/apartment' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(35)
  city?: string;

  @ApiPropertyOptional({ description: 'ISO country code' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({
    description: 'Address format',
    enum: InvoiceAddressType,
  })
  @IsOptional()
  @IsEnum(InvoiceAddressType)
  addressType?: InvoiceAddressType;

  @ApiPropertyOptional({ description: 'Swiss VAT number' })
  @IsOptional()
  @IsString()
  @Matches(/^CHE-\d{3}\.\d{3}\.\d{3}\s?(MWST|TVA|IVA)?$/, {
    message: 'VAT number must be in format CHE-xxx.xxx.xxx MWST',
  })
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Commercial register number' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Default bank account ID' })
  @IsOptional()
  @IsUUID()
  defaultBankAccountId?: string;

  @ApiPropertyOptional({ description: 'Enable QR-bill by default' })
  @IsOptional()
  @IsBoolean()
  qrEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Default reference type',
    enum: InvoiceReferenceType,
  })
  @IsOptional()
  @IsEnum(InvoiceReferenceType)
  defaultReferenceType?: InvoiceReferenceType;

  @ApiPropertyOptional({
    description: 'Default payment terms',
    enum: InvoicePaymentTerms,
  })
  @IsOptional()
  @IsEnum(InvoicePaymentTerms)
  defaultPaymentTerms?: InvoicePaymentTerms;

  @ApiPropertyOptional({ description: 'Default due days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  defaultDueDays?: number;

  @ApiPropertyOptional({
    description: 'Default VAT display mode',
    enum: VatDisplayMode,
  })
  @IsOptional()
  @IsEnum(VatDisplayMode)
  defaultVatDisplayMode?: VatDisplayMode;

  @ApiPropertyOptional({ description: 'Default notes/footer' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultNotes?: string;

  @ApiPropertyOptional({ description: 'Default document language' })
  @IsOptional()
  @IsString()
  @Matches(/^(de|fr|it|en)$/, {
    message: 'Language must be de, fr, it, or en',
  })
  defaultLanguage?: string;

  @ApiPropertyOptional({ description: 'Invoice number prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  invoicePrefix?: string;

  @ApiPropertyOptional({ description: 'Credit note number prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  creditNotePrefix?: string;

  @ApiPropertyOptional({ description: 'Proforma invoice number prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  proformaPrefix?: string;

  @ApiPropertyOptional({ description: 'Quote number prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  quotePrefix?: string;

  @ApiPropertyOptional({ description: 'Number format template' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numberFormat?: string;

  @ApiPropertyOptional({ description: 'Reset sequence numbers each year' })
  @IsOptional()
  @IsBoolean()
  yearlyReset?: boolean;
}

export class InvoicingSettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiPropertyOptional()
  tradingName?: string;

  @ApiPropertyOptional()
  addressLine1?: string;

  @ApiPropertyOptional()
  addressLine2?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiProperty()
  country: string;

  @ApiProperty({ enum: InvoiceAddressType })
  addressType: InvoiceAddressType;

  @ApiPropertyOptional()
  vatNumber?: string;

  @ApiPropertyOptional()
  registrationNumber?: string;

  @ApiPropertyOptional()
  defaultBankAccountId?: string;

  @ApiProperty()
  qrEnabled: boolean;

  @ApiProperty({ enum: InvoiceReferenceType })
  defaultReferenceType: InvoiceReferenceType;

  @ApiProperty({ enum: InvoicePaymentTerms })
  defaultPaymentTerms: InvoicePaymentTerms;

  @ApiProperty()
  defaultDueDays: number;

  @ApiProperty({ enum: VatDisplayMode })
  defaultVatDisplayMode: VatDisplayMode;

  @ApiPropertyOptional()
  defaultNotes?: string;

  @ApiProperty()
  defaultLanguage: string;

  @ApiProperty()
  invoicePrefix: string;

  @ApiProperty()
  creditNotePrefix: string;

  @ApiProperty()
  proformaPrefix: string;

  @ApiProperty()
  quotePrefix: string;

  @ApiProperty()
  numberFormat: string;

  @ApiProperty()
  yearlyReset: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: BankAccountResponseDto })
  defaultBankAccount?: BankAccountResponseDto;

  @ApiPropertyOptional({
    description: 'Whether settings are complete for QR-bill generation',
  })
  qrEligible?: boolean;
}

// ============================================
// Numbering Preview DTOs
// ============================================

export class NumberingPreviewDto {
  @ApiProperty({
    description: 'Document type',
    enum: ['INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'QUOTE'],
  })
  documentType: string;

  @ApiProperty({
    description: 'Current prefix for this document type',
    example: 'INV',
  })
  prefix: string;

  @ApiProperty({
    description: 'Next sequence number',
    example: 42,
  })
  nextNumber: number;

  @ApiProperty({
    description: 'Preview of next document number',
    example: 'INV-2025-00042',
  })
  preview: string;

  @ApiProperty({
    description: 'Current year for sequence',
    example: 2025,
  })
  year: number;
}

export class NumberingPreviewResponseDto {
  @ApiProperty({
    type: [NumberingPreviewDto],
    description: 'Numbering preview for each document type',
  })
  previews: NumberingPreviewDto[];
}

// ============================================
// QR Eligibility DTOs
// ============================================

export class QrEligibilityCheckDto {
  @ApiProperty({
    description: 'Whether the organization is eligible to generate QR-bills',
  })
  eligible: boolean;

  @ApiProperty({
    description: 'List of missing fields required for QR-bill',
    type: [String],
  })
  missingFields: string[];

  @ApiPropertyOptional({
    description: 'Validation errors',
    type: [String],
  })
  errors?: string[];
}

