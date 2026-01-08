import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Query,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnsureProfileInterceptor } from '../principal/ensure-profile.interceptor';
import { PromoCodesService } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  PromoCodeResponseDto,
} from './dto/promo-code.dto';

@ApiTags('promo-codes')
@Controller('promo-codes')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(EnsureProfileInterceptor)
@ApiBearerAuth()
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  private getContext(request: any) {
    const context = request?.context ?? {};
    const { profileId, accountId, clerkUserId } = context;
    if (!profileId || !accountId || !clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }
    return { profileId, accountId, clerkUserId };
  }

  /**
   * Get all promo codes for the current user's organization
   */
  @Get()
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get organization promo codes' })
  @ApiResponse({
    status: 200,
    description: 'Promo codes retrieved successfully',
    type: [PromoCodeResponseDto],
  })
  async getPromoCodes(@Request() req) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.promoCodesService.getUserOrganizationId(profileId);
    if (!organizationId) {
      return {
        success: true,
        hasOrganization: false,
        data: [],
        message: 'No organization found',
      };
    }

    const promoCodes = await this.promoCodesService.getPromoCodes(organizationId);

    return {
      success: true,
      hasOrganization: true,
      data: promoCodes,
    };
  }

  /**
   * Create a new promo code
   */
  @Post()
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({
    status: 201,
    description: 'Promo code created successfully',
    type: PromoCodeResponseDto,
  })
  async createPromoCode(
    @Request() req,
    @Body() dto: CreatePromoCodeDto,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.promoCodesService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    const promoCode = await this.promoCodesService.createPromoCode(organizationId, dto);

    return {
      success: true,
      data: promoCode,
      message: 'Promo code created successfully',
    };
  }

  /**
   * Get public/active promo codes for a specific organization (for viewing profiles)
   * Any authenticated user can access this endpoint to view organization promo codes
   * NOTE: This route MUST be declared before @Get(':id') to avoid route conflicts
   */
  @Get('public/:organizationId')
  @ApiOperation({ summary: 'Get public promo codes for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Public promo codes retrieved successfully',
    type: [PromoCodeResponseDto],
  })
  async getPublicPromoCodes(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const promoCodes = await this.promoCodesService.getPublicPromoCodes(organizationId);

    return {
      success: true,
      data: promoCodes,
    };
  }

  /**
   * Validate a promo code for an organization (for buyers/foundations)
   * NOTE: This route MUST be declared before @Get(':id') to avoid route conflicts
   */
  @Get('validate/:organizationId')
  @ApiOperation({ summary: 'Validate a promo code for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'code', description: 'Promo code to validate' })
  @ApiResponse({
    status: 200,
    description: 'Promo code validation result',
  })
  async validatePromoCode(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('code') code: string,
  ) {
    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const promoCode = await this.promoCodesService.validatePromoCode(code, organizationId);

    return {
      success: true,
      valid: promoCode !== null,
      data: promoCode,
    };
  }

  /**
   * Get a single promo code by ID
   * NOTE: This route MUST be declared after specific routes like 'public/:organizationId'
   * and 'validate/:organizationId' to avoid NestJS matching ':id' for those paths
   */
  @Get(':id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get a specific promo code' })
  @ApiParam({ name: 'id', description: 'Promo Code ID' })
  @ApiResponse({
    status: 200,
    description: 'Promo code retrieved successfully',
    type: PromoCodeResponseDto,
  })
  async getPromoCode(
    @Request() req,
    @Param('id', ParseUUIDPipe) promoCodeId: string,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.promoCodesService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    const promoCode = await this.promoCodesService.getPromoCode(promoCodeId, organizationId);

    return {
      success: true,
      data: promoCode,
    };
  }

  /**
   * Update a promo code
   */
  @Patch(':id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Update a promo code' })
  @ApiParam({ name: 'id', description: 'Promo Code ID' })
  @ApiResponse({
    status: 200,
    description: 'Promo code updated successfully',
    type: PromoCodeResponseDto,
  })
  async updatePromoCode(
    @Request() req,
    @Param('id', ParseUUIDPipe) promoCodeId: string,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.promoCodesService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    const promoCode = await this.promoCodesService.updatePromoCode(
      promoCodeId,
      organizationId,
      dto,
    );

    return {
      success: true,
      data: promoCode,
      message: 'Promo code updated successfully',
    };
  }

  /**
   * Delete a promo code
   */
  @Delete(':id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Delete a promo code' })
  @ApiParam({ name: 'id', description: 'Promo Code ID' })
  @ApiResponse({
    status: 200,
    description: 'Promo code deleted successfully',
  })
  async deletePromoCode(
    @Request() req,
    @Param('id', ParseUUIDPipe) promoCodeId: string,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.promoCodesService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    await this.promoCodesService.deletePromoCode(promoCodeId, organizationId);

    return {
      success: true,
      message: 'Promo code deleted successfully',
    };
  }
}
