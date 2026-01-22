import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, OrganizationType, PromoCode, Prisma } from '@prisma/client';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  PromoCodeResponseDto,
} from './dto/promo-code.dto';

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's organization ID
   */
  async getUserOrganizationId(profileId: string): Promise<string | null> {
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: profileId },
      select: { organizationId: true },
    });
    return userOrg?.organizationId || null;
  }

  /**
   * Get or create organization for user (for suppliers/service providers only)
   */
  async getOrCreateOrganizationForUser(profileId: string): Promise<string | null> {
    // First check if organization already exists
    const existingOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: profileId },
      select: { organizationId: true },
    });

    if (existingOrg) {
      return existingOrg.organizationId;
    }

    // Get user to determine their role
    const user = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: { 
        id: true, 
        role: true, 
        firstName: true, 
        lastName: true, 
        email: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found: ${profileId}`);
      return null;
    }

    // Only create organizations for supplier/service provider roles
    const roleToOrgType: Record<string, OrganizationType> = {
      [UserRole.PRODUCT_SUPPLIER]: OrganizationType.PRODUCT_SUPPLIER,
      [UserRole.SERVICE_PROVIDER]: OrganizationType.SERVICE_PROVIDER,
    };

    const orgType = roleToOrgType[user.role];
    if (!orgType) {
      this.logger.warn(`User role ${user.role} does not support promo codes`);
      return null;
    }

    // Create organization and link it to the user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'My Organization',
          type: orgType,
          contactPerson: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          isActive: true,
        },
      });

      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: user.role,
        },
      });

      this.logger.log(
        `Created organization ${organization.id} for user ${profileId} (${user.role})`
      );

      return organization.id;
    });

    return result;
  }

  /**
   * Map database record to response DTO
   */
  private mapToResponse(promoCode: PromoCode): PromoCodeResponseDto {
    return {
      id: promoCode.id,
      code: promoCode.code,
      description: promoCode.description || undefined,
      discount: promoCode.discount,
      isActive: promoCode.isActive,
      organizationId: promoCode.organizationId,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
  }

  /**
   * Get all promo codes for an organization
   */
  async getPromoCodes(organizationId: string): Promise<PromoCodeResponseDto[]> {
    const promoCodes = await this.prisma.promoCode.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return promoCodes.map(code => this.mapToResponse(code));
  }

  /**
   * Get a single promo code by ID
   */
  async getPromoCode(promoCodeId: string, organizationId: string): Promise<PromoCodeResponseDto> {
    const promoCode = await this.prisma.promoCode.findFirst({
      where: {
        id: promoCodeId,
        organizationId,
      },
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found');
    }

    return this.mapToResponse(promoCode);
  }

  /**
   * Create a new promo code
   */
  async createPromoCode(
    organizationId: string,
    dto: CreatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    // Check if code already exists for this organization
    const existingCode = await this.prisma.promoCode.findFirst({
      where: {
        code: dto.code.toUpperCase(),
        organizationId,
      },
    });

    if (existingCode) {
      throw new ConflictException('A promo code with this code already exists');
    }

    const promoCode = await this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description || null,
        discount: dto.discount,
        isActive: dto.isActive ?? true,
        organizationId,
      },
    });

    this.logger.log(
      `Created promo code ${promoCode.code} for organization ${organizationId}`,
    );

    return this.mapToResponse(promoCode);
  }

  /**
   * Update a promo code
   */
  async updatePromoCode(
    promoCodeId: string,
    organizationId: string,
    dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    // Verify the promo code belongs to the organization
    const existingCode = await this.prisma.promoCode.findFirst({
      where: {
        id: promoCodeId,
        organizationId,
      },
    });

    if (!existingCode) {
      throw new NotFoundException('Promo code not found');
    }

    // If updating code, check for duplicates
    if (dto.code && dto.code.toUpperCase() !== existingCode.code) {
      const duplicateCode = await this.prisma.promoCode.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          organizationId,
          id: { not: promoCodeId },
        },
      });

      if (duplicateCode) {
        throw new ConflictException('A promo code with this code already exists');
      }
    }

    const promoCode = await this.prisma.promoCode.update({
      where: { id: promoCodeId },
      data: {
        ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Updated promo code ${promoCodeId}`);

    return this.mapToResponse(promoCode);
  }

  /**
   * Delete a promo code
   */
  async deletePromoCode(promoCodeId: string, organizationId: string): Promise<void> {
    // Verify the promo code belongs to the organization
    const existingCode = await this.prisma.promoCode.findFirst({
      where: {
        id: promoCodeId,
        organizationId,
      },
    });

    if (!existingCode) {
      throw new NotFoundException('Promo code not found');
    }

    await this.prisma.promoCode.delete({
      where: { id: promoCodeId },
    });

    this.logger.log(`Deleted promo code ${promoCodeId}`);
  }

  /**
   * Get public/active promo codes for an organization (for profile viewing)
   */
  async getPublicPromoCodes(organizationId: string): Promise<PromoCodeResponseDto[]> {
    const promoCodes = await this.prisma.promoCode.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return promoCodes.map(code => this.mapToResponse(code));
  }

  /**
   * Redeem a promo code - validates and returns discount info for order processing.
   * Since promo codes are now display-only (free text discount descriptions),
   * this method parses the discount text to extract type and value when possible.
   * 
   * @param code - The promo code string
   * @param organizationId - The supplier/organization ID the code belongs to
   * @param tx - Optional Prisma transaction client
   * @returns Promo code with parsed discount info, or null if invalid/not found
   */
  async redeemPromoCode(
    code: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; code: string; discountType: string; value: number } | null> {
    const prismaClient = tx || this.prisma;

    const promoCode = await prismaClient.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        organizationId,
        isActive: true,
      },
    });

    if (!promoCode) {
      this.logger.warn(
        `Promo code "${code}" not found or inactive for organization ${organizationId}`,
      );
      return null;
    }

    // Parse the free-text discount field to extract type and value
    // Examples: "20% off" -> Percentage/20, "CHF 10 off" -> FixedAmount/10
    const parsed = this.parseDiscountText(promoCode.discount);

    this.logger.log(
      `Promo code ${promoCode.code} redeemed for organization ${organizationId} - ` +
      `parsed as ${parsed.discountType}/${parsed.value}`,
    );

    return {
      id: promoCode.id,
      code: promoCode.code,
      discountType: parsed.discountType,
      value: parsed.value,
    };
  }

  /**
   * Parse free-text discount description into structured type and value.
   * Handles formats like:
   * - "20% off" -> { discountType: 'Percentage', value: 20 }
   * - "CHF 10 off" -> { discountType: 'FixedAmount', value: 10 }
   * - "10 free minutes" -> { discountType: 'FreeMinutes', value: 10 }
   * - Other formats -> { discountType: 'Other', value: 0 } (no auto discount)
   */
  private parseDiscountText(discount: string): { discountType: string; value: number } {
    if (!discount) {
      return { discountType: 'Other', value: 0 };
    }

    const normalizedDiscount = discount.toLowerCase().trim();

    // Match percentage: "20% off", "20%", "20 percent", "20 per cent"
    const percentMatch = normalizedDiscount.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent|per\s*cent)/);
    if (percentMatch) {
      return { discountType: 'Percentage', value: parseFloat(percentMatch[1]) };
    }

    // Match fixed amount: "CHF 10 off", "CHF 10", "$10 off", "10 CHF off"
    const fixedMatchPrefix = normalizedDiscount.match(/^(?:chf|usd|\$|€|eur)\s*(\d+(?:\.\d+)?)/);
    if (fixedMatchPrefix) {
      return { discountType: 'FixedAmount', value: parseFloat(fixedMatchPrefix[1]) };
    }

    const fixedMatchSuffix = normalizedDiscount.match(/^(\d+(?:\.\d+)?)\s*(?:chf|usd|\$|€|eur)/);
    if (fixedMatchSuffix) {
      return { discountType: 'FixedAmount', value: parseFloat(fixedMatchSuffix[1]) };
    }

    // Match free minutes: "10 free minutes", "10 minutes free"
    const minutesMatch = normalizedDiscount.match(/(\d+)\s*(?:free\s*)?minutes?/);
    if (minutesMatch) {
      return { discountType: 'FreeMinutes', value: parseInt(minutesMatch[1], 10) };
    }

    // Fallback: try to extract any number as a percentage
    const anyNumberMatch = normalizedDiscount.match(/(\d+(?:\.\d+)?)/);
    if (anyNumberMatch && normalizedDiscount.includes('%')) {
      return { discountType: 'Percentage', value: parseFloat(anyNumberMatch[1]) };
    }

    // Unknown format - promo code is display-only, no automatic discount
    this.logger.warn(`Could not parse discount format: "${discount}" - treating as display-only`);
    return { discountType: 'Other', value: 0 };
  }
}
