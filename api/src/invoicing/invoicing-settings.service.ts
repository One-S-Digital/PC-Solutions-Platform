/**
 * Invoicing Settings Service
 *
 * Manages organization invoicing settings, bank accounts,
 * and document numbering sequences.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoicingSettingsDto,
  UpdateInvoicingSettingsDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  NumberingPreviewDto,
  QrEligibilityCheckDto,
} from './dto/invoicing-settings.dto';
import { InvoiceDocumentType } from '@prisma/client';

@Injectable()
export class InvoicingSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Invoicing Settings CRUD
  // ============================================

  /**
   * Get invoicing settings for an organization
   */
  async getSettings(organizationId: string) {
    const settings = await this.prisma.invoicingSettings.findUnique({
      where: { organizationId },
      include: {
        defaultBankAccount: true,
      },
    });

    if (!settings) {
      return null;
    }

    // Add QR eligibility status
    return {
      ...settings,
      qrEligible: this.checkQrEligibilitySync(settings),
    };
  }

  /**
   * Create invoicing settings for an organization
   */
  async createSettings(dto: CreateInvoicingSettingsDto, actorId: string) {
    // Check if settings already exist
    const existing = await this.prisma.invoicingSettings.findUnique({
      where: { organizationId: dto.organizationId },
    });

    if (existing) {
      throw new ConflictException(
        'Invoicing settings already exist for this organization',
      );
    }

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // If defaultBankAccountId is provided, verify it exists and belongs to org
    if (dto.defaultBankAccountId) {
      const bankAccount = await this.prisma.organizationBankAccount.findUnique({
        where: { id: dto.defaultBankAccountId },
      });

      if (!bankAccount || bankAccount.organizationId !== dto.organizationId) {
        throw new BadRequestException('Invalid bank account for this organization');
      }
    }

    // Create settings
    const settings = await this.prisma.invoicingSettings.create({
      data: {
        organizationId: dto.organizationId,
        legalName: dto.legalName,
        tradingName: dto.tradingName,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country ?? 'CH',
        addressType: dto.addressType ?? 'STRUCTURED',
        vatNumber: dto.vatNumber,
        registrationNumber: dto.registrationNumber,
        defaultBankAccountId: dto.defaultBankAccountId,
        qrEnabled: dto.qrEnabled ?? true,
        defaultReferenceType: dto.defaultReferenceType ?? 'SCOR',
        defaultPaymentTerms: dto.defaultPaymentTerms ?? 'NET_30',
        defaultDueDays: dto.defaultDueDays ?? 30,
        defaultVatDisplayMode: dto.defaultVatDisplayMode ?? 'EXCLUDED',
        defaultNotes: dto.defaultNotes,
        defaultLanguage: dto.defaultLanguage ?? 'de',
        invoicePrefix: dto.invoicePrefix ?? 'INV',
        creditNotePrefix: dto.creditNotePrefix ?? 'CN',
        proformaPrefix: dto.proformaPrefix ?? 'PF',
        quotePrefix: dto.quotePrefix ?? 'QT',
        numberFormat: dto.numberFormat ?? '{PREFIX}-{YEAR}-{SEQ:5}',
        yearlyReset: dto.yearlyReset ?? true,
      },
      include: {
        defaultBankAccount: true,
      },
    });

    // Log audit
    await this.logSettingsAudit(dto.organizationId, 'created', null, settings, actorId);

    return {
      ...settings,
      qrEligible: this.checkQrEligibilitySync(settings),
    };
  }

  /**
   * Update invoicing settings for an organization
   */
  async updateSettings(
    organizationId: string,
    dto: UpdateInvoicingSettingsDto,
    actorId: string,
  ) {
    const existing = await this.prisma.invoicingSettings.findUnique({
      where: { organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Invoicing settings not found');
    }

    // If defaultBankAccountId is provided, verify it exists and belongs to org
    if (dto.defaultBankAccountId) {
      const bankAccount = await this.prisma.organizationBankAccount.findUnique({
        where: { id: dto.defaultBankAccountId },
      });

      if (!bankAccount || bankAccount.organizationId !== organizationId) {
        throw new BadRequestException('Invalid bank account for this organization');
      }
    }

    // Update settings
    const settings = await this.prisma.invoicingSettings.update({
      where: { organizationId },
      data: {
        legalName: dto.legalName,
        tradingName: dto.tradingName,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country,
        addressType: dto.addressType,
        vatNumber: dto.vatNumber,
        registrationNumber: dto.registrationNumber,
        defaultBankAccountId: dto.defaultBankAccountId,
        qrEnabled: dto.qrEnabled,
        defaultReferenceType: dto.defaultReferenceType,
        defaultPaymentTerms: dto.defaultPaymentTerms,
        defaultDueDays: dto.defaultDueDays,
        defaultVatDisplayMode: dto.defaultVatDisplayMode,
        defaultNotes: dto.defaultNotes,
        defaultLanguage: dto.defaultLanguage,
        invoicePrefix: dto.invoicePrefix,
        creditNotePrefix: dto.creditNotePrefix,
        proformaPrefix: dto.proformaPrefix,
        quotePrefix: dto.quotePrefix,
        numberFormat: dto.numberFormat,
        yearlyReset: dto.yearlyReset,
      },
      include: {
        defaultBankAccount: true,
      },
    });

    // Log audit with changes
    await this.logSettingsAuditDiff(organizationId, existing, settings, actorId);

    return {
      ...settings,
      qrEligible: this.checkQrEligibilitySync(settings),
    };
  }

  // ============================================
  // Bank Account Management
  // ============================================

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
   * Get a specific bank account
   */
  async getBankAccount(id: string, organizationId: string) {
    const account = await this.prisma.organizationBankAccount.findUnique({
      where: { id },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  /**
   * Create a bank account for an organization
   */
  async createBankAccount(
    organizationId: string,
    dto: CreateBankAccountDto,
    actorId: string,
  ) {
    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Normalize IBAN (remove spaces)
    const normalizedIban = dto.iban.replace(/\s/g, '').toUpperCase();

    // Check for duplicate IBAN
    const existingAccount = await this.prisma.organizationBankAccount.findUnique({
      where: {
        organizationId_iban: {
          organizationId,
          iban: normalizedIban,
        },
      },
    });

    if (existingAccount) {
      throw new ConflictException('A bank account with this IBAN already exists');
    }

    // Detect QR-IBAN (IID 30000-31999)
    const isQrIban = this.isQrIban(normalizedIban);

    // If this is marked as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.organizationBankAccount.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await this.prisma.organizationBankAccount.create({
      data: {
        organizationId,
        accountName: dto.accountName,
        iban: normalizedIban,
        bankName: dto.bankName,
        bic: dto.bic,
        isQrIban,
        isDefault: dto.isDefault ?? false,
        isActive: true,
        isVerified: false,
      },
    });

    return account;
  }

  /**
   * Update a bank account
   */
  async updateBankAccount(
    id: string,
    organizationId: string,
    dto: UpdateBankAccountDto,
    actorId: string,
  ) {
    const existing = await this.prisma.organizationBankAccount.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('Bank account not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.organizationBankAccount.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.organizationBankAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        bankName: dto.bankName,
        bic: dto.bic,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Delete a bank account
   */
  async deleteBankAccount(id: string, organizationId: string, actorId: string) {
    const account = await this.prisma.organizationBankAccount.findUnique({
      where: { id },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Bank account not found');
    }

    // Check if it's used as default in settings
    const settings = await this.prisma.invoicingSettings.findFirst({
      where: { defaultBankAccountId: id },
    });

    if (settings) {
      throw new BadRequestException(
        'Cannot delete: this account is set as default in invoicing settings',
      );
    }

    // Soft delete by marking inactive (or hard delete if preferred)
    return this.prisma.organizationBankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // Numbering Preview
  // ============================================

  /**
   * Get numbering preview for all document types
   */
  async getNumberingPreviews(organizationId: string): Promise<NumberingPreviewDto[]> {
    const settings = await this.getSettings(organizationId);
    if (!settings) {
      throw new NotFoundException('Invoicing settings not found');
    }

    const currentYear = new Date().getFullYear();
    const documentTypes: InvoiceDocumentType[] = [
      'INVOICE',
      'CREDIT_NOTE',
      'PROFORMA',
      'QUOTE',
    ];

    const previews: NumberingPreviewDto[] = [];

    for (const docType of documentTypes) {
      const prefix = this.getPrefixForDocumentType(docType, settings);
      const sequence = await this.getOrCreateSequence(
        organizationId,
        docType,
        currentYear,
      );
      const nextNumber = sequence.lastNumber + 1;
      const preview = this.formatDocumentNumber(
        settings.numberFormat,
        prefix,
        currentYear,
        nextNumber,
      );

      previews.push({
        documentType: docType,
        prefix,
        nextNumber,
        preview,
        year: currentYear,
      });
    }

    return previews;
  }

  /**
   * Get or create sequence for document type and year
   */
  async getOrCreateSequence(
    organizationId: string,
    documentType: InvoiceDocumentType,
    year: number,
  ) {
    let sequence = await this.prisma.documentSequence.findUnique({
      where: {
        organizationId_documentType_year: {
          organizationId,
          documentType,
          year,
        },
      },
    });

    if (!sequence) {
      sequence = await this.prisma.documentSequence.create({
        data: {
          organizationId,
          documentType,
          year,
          lastNumber: 0,
        },
      });
    }

    return sequence;
  }

  /**
   * Reserve the next document number (called during issuance)
   */
  async reserveNextNumber(
    organizationId: string,
    documentType: InvoiceDocumentType,
  ): Promise<string> {
    const settings = await this.getSettings(organizationId);
    if (!settings) {
      throw new NotFoundException('Invoicing settings not found');
    }

    const currentYear = new Date().getFullYear();

    // Atomic increment of sequence
    const sequence = await this.prisma.documentSequence.upsert({
      where: {
        organizationId_documentType_year: {
          organizationId,
          documentType,
          year: currentYear,
        },
      },
      create: {
        organizationId,
        documentType,
        year: currentYear,
        lastNumber: 1,
      },
      update: {
        lastNumber: { increment: 1 },
      },
    });

    const prefix = this.getPrefixForDocumentType(documentType, settings);
    return this.formatDocumentNumber(
      settings.numberFormat,
      prefix,
      currentYear,
      sequence.lastNumber,
    );
  }

  // ============================================
  // QR Eligibility
  // ============================================

  /**
   * Check if organization is eligible for QR-bill generation
   */
  async checkQrEligibility(organizationId: string): Promise<QrEligibilityCheckDto> {
    const settings = await this.prisma.invoicingSettings.findUnique({
      where: { organizationId },
      include: { defaultBankAccount: true },
    });

    if (!settings) {
      return {
        eligible: false,
        missingFields: ['invoicingSettings'],
        errors: ['Invoicing settings not configured'],
      };
    }

    const missingFields: string[] = [];
    const errors: string[] = [];

    // Required creditor fields for QR-bill
    if (!settings.legalName) missingFields.push('legalName');
    if (!settings.addressLine1) missingFields.push('addressLine1');
    if (!settings.postalCode) missingFields.push('postalCode');
    if (!settings.city) missingFields.push('city');
    if (!settings.country) missingFields.push('country');

    // Bank account required
    if (!settings.defaultBankAccount) {
      missingFields.push('defaultBankAccount');
    } else if (!settings.defaultBankAccount.isActive) {
      errors.push('Default bank account is inactive');
    }

    // Check reference type compatibility with IBAN type
    if (settings.defaultBankAccount) {
      const { isQrIban } = settings.defaultBankAccount;
      const { defaultReferenceType } = settings;

      if (defaultReferenceType === 'QRR' && !isQrIban) {
        errors.push('QRR reference requires a QR-IBAN (IID 30000-31999)');
      }
      if (defaultReferenceType === 'SCOR' && isQrIban) {
        // SCOR can work with QR-IBAN, but NON is preferred
        // Just a warning, not an error
      }
    }

    return {
      eligible: missingFields.length === 0 && errors.length === 0,
      missingFields,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  private checkQrEligibilitySync(settings: any): boolean {
    if (!settings) return false;
    if (!settings.legalName) return false;
    if (!settings.addressLine1) return false;
    if (!settings.postalCode) return false;
    if (!settings.city) return false;
    if (!settings.defaultBankAccount) return false;
    return true;
  }

  private isQrIban(iban: string): boolean {
    // QR-IBAN has IID (Institution Identifier) in range 30000-31999
    // IBAN format: CHxx BBBB BCCC CCCC CCCC C
    // where BBBBB is the IID (positions 4-8 after CH and check digits)
    if (!iban.startsWith('CH') && !iban.startsWith('LI')) {
      return false;
    }

    const iid = parseInt(iban.substring(4, 9), 10);
    return iid >= 30000 && iid <= 31999;
  }

  private getPrefixForDocumentType(
    documentType: InvoiceDocumentType,
    settings: any,
  ): string {
    switch (documentType) {
      case 'INVOICE':
        return settings.invoicePrefix;
      case 'CREDIT_NOTE':
        return settings.creditNotePrefix;
      case 'PROFORMA':
        return settings.proformaPrefix;
      case 'QUOTE':
        return settings.quotePrefix;
      default:
        return 'DOC';
    }
  }

  private formatDocumentNumber(
    format: string,
    prefix: string,
    year: number,
    sequence: number,
  ): string {
    let result = format;

    // Replace {PREFIX}
    result = result.replace('{PREFIX}', prefix);

    // Replace {YEAR} with full year or {YEAR:2} with 2-digit year
    result = result.replace('{YEAR}', year.toString());
    result = result.replace('{YEAR:4}', year.toString());
    result = result.replace('{YEAR:2}', year.toString().slice(-2));

    // Replace {SEQ:N} with zero-padded sequence
    const seqMatch = result.match(/\{SEQ:(\d+)\}/);
    if (seqMatch) {
      const padding = parseInt(seqMatch[1], 10);
      result = result.replace(seqMatch[0], sequence.toString().padStart(padding, '0'));
    } else {
      result = result.replace('{SEQ}', sequence.toString());
    }

    return result;
  }

  private async logSettingsAudit(
    organizationId: string,
    action: string,
    oldValue: any,
    newValue: any,
    actorId: string,
  ) {
    await this.prisma.invoicingSettingsAuditLog.create({
      data: {
        organizationId,
        action,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        actorId,
      },
    });
  }

  private async logSettingsAuditDiff(
    organizationId: string,
    oldSettings: any,
    newSettings: any,
    actorId: string,
  ) {
    // Log each changed field
    const fieldsToCompare = [
      'legalName',
      'tradingName',
      'addressLine1',
      'addressLine2',
      'postalCode',
      'city',
      'country',
      'addressType',
      'vatNumber',
      'registrationNumber',
      'defaultBankAccountId',
      'qrEnabled',
      'defaultReferenceType',
      'defaultPaymentTerms',
      'defaultDueDays',
      'defaultVatDisplayMode',
      'defaultNotes',
      'defaultLanguage',
      'invoicePrefix',
      'creditNotePrefix',
      'proformaPrefix',
      'quotePrefix',
      'numberFormat',
      'yearlyReset',
    ];

    for (const field of fieldsToCompare) {
      const oldVal = oldSettings[field];
      const newVal = newSettings[field];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        await this.prisma.invoicingSettingsAuditLog.create({
          data: {
            organizationId,
            action: 'updated',
            field,
            oldValue: oldVal !== undefined ? String(oldVal) : null,
            newValue: newVal !== undefined ? String(newVal) : null,
            actorId,
          },
        });
      }
    }
  }
}
