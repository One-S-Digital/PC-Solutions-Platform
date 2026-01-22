import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, OrganizationType, PromoCode } from '@prisma/client';
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
}
