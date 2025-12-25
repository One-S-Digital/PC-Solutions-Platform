import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
   * Get all promo codes for an organization
   */
  async getPromoCodes(organizationId: string): Promise<PromoCodeResponseDto[]> {
    const promoCodes = await this.prisma.promoCode.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-update expired statuses
    const now = new Date();
    const expiredIds: string[] = [];
    
    for (const code of promoCodes) {
      if (code.status === 'Active' && new Date(code.expiryDate) < now) {
        expiredIds.push(code.id);
      }
    }

    if (expiredIds.length > 0) {
      await this.prisma.promoCode.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'Expired' },
      });
    }

    return promoCodes.map((code) => ({
      id: code.id,
      code: code.code,
      discountType: code.discountType,
      value: code.value,
      expiryDate: code.expiryDate,
      status: expiredIds.includes(code.id) ? 'Expired' : code.status,
      description: code.description || undefined,
      usageCount: code.usageCount,
      maxUsage: code.maxUsage || undefined,
      organizationId: code.organizationId,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
    }));
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

    return {
      id: promoCode.id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: promoCode.value,
      expiryDate: promoCode.expiryDate,
      status: promoCode.status,
      description: promoCode.description || undefined,
      usageCount: promoCode.usageCount,
      maxUsage: promoCode.maxUsage || undefined,
      organizationId: promoCode.organizationId,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
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
        discountType: dto.discountType,
        value: dto.value,
        expiryDate: new Date(dto.expiryDate),
        description: dto.description,
        maxUsage: dto.maxUsage,
        organizationId,
      },
    });

    this.logger.log(
      `Created promo code ${promoCode.code} for organization ${organizationId}`,
    );

    return {
      id: promoCode.id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: promoCode.value,
      expiryDate: promoCode.expiryDate,
      status: promoCode.status,
      description: promoCode.description || undefined,
      usageCount: promoCode.usageCount,
      maxUsage: promoCode.maxUsage || undefined,
      organizationId: promoCode.organizationId,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
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
        ...(dto.discountType !== undefined && { discountType: dto.discountType }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.expiryDate !== undefined && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.maxUsage !== undefined && { maxUsage: dto.maxUsage }),
      },
    });

    this.logger.log(`Updated promo code ${promoCodeId}`);

    return {
      id: promoCode.id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: promoCode.value,
      expiryDate: promoCode.expiryDate,
      status: promoCode.status,
      description: promoCode.description || undefined,
      usageCount: promoCode.usageCount,
      maxUsage: promoCode.maxUsage || undefined,
      organizationId: promoCode.organizationId,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
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
    const now = new Date();
    
    const promoCodes = await this.prisma.promoCode.findMany({
      where: {
        organizationId,
        status: 'Active',
        expiryDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    return promoCodes.map((code) => ({
      id: code.id,
      code: code.code,
      discountType: code.discountType,
      value: code.value,
      expiryDate: code.expiryDate,
      status: code.status,
      description: code.description || undefined,
      usageCount: code.usageCount,
      maxUsage: code.maxUsage || undefined,
      organizationId: code.organizationId,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
    }));
  }

  /**
   * Validate and apply a promo code (for use by foundations/buyers)
   */
  async validatePromoCode(
    code: string,
    organizationId: string,
  ): Promise<PromoCodeResponseDto | null> {
    const now = new Date();

    const promoCode = await this.prisma.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        organizationId,
        status: 'Active',
        expiryDate: { gte: now },
      },
    });

    if (!promoCode) {
      return null;
    }

    // Check max usage
    if (promoCode.maxUsage && promoCode.usageCount >= promoCode.maxUsage) {
      return null;
    }

    return {
      id: promoCode.id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: promoCode.value,
      expiryDate: promoCode.expiryDate,
      status: promoCode.status,
      description: promoCode.description || undefined,
      usageCount: promoCode.usageCount,
      maxUsage: promoCode.maxUsage || undefined,
      organizationId: promoCode.organizationId,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt,
    };
  }
}
