/**
 * Invoicing Settings Controller
 *
 * REST endpoints for managing organization invoicing settings,
 * bank accounts, and document numbering.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InvoicingSettingsService } from './invoicing-settings.service';
import {
  CreateInvoicingSettingsDto,
  UpdateInvoicingSettingsDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  InvoicingSettingsResponseDto,
  BankAccountResponseDto,
  NumberingPreviewResponseDto,
  QrEligibilityCheckDto,
} from './dto/invoicing-settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Invoicing Settings')
@Controller('invoicing')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicingSettingsController {
  constructor(private readonly settingsService: InvoicingSettingsService) {}

  /**
   * Get user ID from request for audit logging
   */
  private getUserId(request: any): string {
    return request.user?.id || request.user?.clerkId || 'unknown';
  }

  // ============================================
  // Invoicing Settings Endpoints
  // ============================================

  @Get('settings/:organizationId')
  @ApiOperation({ summary: 'Get invoicing settings for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoicing settings',
    type: InvoicingSettingsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async getSettings(@Param('organizationId') organizationId: string) {
    return this.settingsService.getSettings(organizationId);
  }

  @Post('settings')
  @ApiOperation({ summary: 'Create invoicing settings for an organization' })
  @ApiResponse({
    status: 201,
    description: 'Settings created',
    type: InvoicingSettingsResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Settings already exist' })
  async createSettings(
    @Body() dto: CreateInvoicingSettingsDto,
    @Request() request: any,
  ) {
    return this.settingsService.createSettings(dto, this.getUserId(request));
  }

  @Patch('settings/:organizationId')
  @ApiOperation({ summary: 'Update invoicing settings for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated',
    type: InvoicingSettingsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async updateSettings(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateInvoicingSettingsDto,
    @Request() request: any,
  ) {
    return this.settingsService.updateSettings(organizationId, dto, this.getUserId(request));
  }

  // ============================================
  // Bank Account Endpoints
  // ============================================

  @Get('settings/:organizationId/bank-accounts')
  @ApiOperation({ summary: 'Get all bank accounts for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'List of bank accounts',
    type: [BankAccountResponseDto],
  })
  async getBankAccounts(@Param('organizationId') organizationId: string) {
    return this.settingsService.getBankAccounts(organizationId);
  }

  @Get('settings/:organizationId/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Get a specific bank account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Bank account ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account details',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async getBankAccount(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.settingsService.getBankAccount(accountId, organizationId);
  }

  @Post('settings/:organizationId/bank-accounts')
  @ApiOperation({ summary: 'Create a bank account for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Bank account created',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 409, description: 'IBAN already exists' })
  async createBankAccount(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateBankAccountDto,
    @Request() request: any,
  ) {
    return this.settingsService.createBankAccount(organizationId, dto, this.getUserId(request));
  }

  @Patch('settings/:organizationId/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Bank account ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated',
    type: BankAccountResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async updateBankAccount(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateBankAccountDto,
    @Request() request: any,
  ) {
    return this.settingsService.updateBankAccount(
      accountId,
      organizationId,
      dto,
      this.getUserId(request),
    );
  }

  @Delete('settings/:organizationId/bank-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (deactivate) a bank account' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'accountId', description: 'Bank account ID' })
  @ApiResponse({ status: 204, description: 'Bank account deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete default account' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async deleteBankAccount(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @Request() request: any,
  ): Promise<void> {
    await this.settingsService.deleteBankAccount(accountId, organizationId, this.getUserId(request));
  }

  // ============================================
  // Numbering Preview Endpoints
  // ============================================

  @Get('settings/:organizationId/numbering-preview')
  @ApiOperation({ summary: 'Get document numbering preview for all types' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Numbering preview for all document types',
    type: NumberingPreviewResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async getNumberingPreviews(
    @Param('organizationId') organizationId: string,
  ): Promise<NumberingPreviewResponseDto> {
    const previews = await this.settingsService.getNumberingPreviews(organizationId);
    return { previews };
  }

  // ============================================
  // QR Eligibility Endpoints
  // ============================================

  @Get('settings/:organizationId/qr-eligibility')
  @ApiOperation({
    summary: 'Check if organization is eligible for QR-bill generation',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'QR eligibility status',
    type: QrEligibilityCheckDto,
  })
  async checkQrEligibility(
    @Param('organizationId') organizationId: string,
  ): Promise<QrEligibilityCheckDto> {
    return this.settingsService.checkQrEligibility(organizationId);
  }
}
