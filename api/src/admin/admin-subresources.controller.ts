import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUrl,
  IsIn,
  IsNotEmpty,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { CreateProductDto, UpdateProductDto } from '../marketplace/dto/create-product.dto';
import { CreateServiceDto, UpdateServiceDto } from '../marketplace/dto/create-service.dto';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class AdminCreateWorkExperienceDto {
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsNotEmpty()
  institutionName: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptionPoints?: string[];
}

class AdminUpdateWorkExperienceDto {
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptionPoints?: string[];

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class AdminCreateEducationDto {
  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  institutionName: string;

  @IsOptional()
  @IsString()
  graduationYear?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class AdminUpdateEducationDto {
  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  graduationYear?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class AdminCreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.credentialUrl)
  @IsUrl()
  credentialUrl?: string;
}

class AdminUpdateCertificationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.credentialUrl)
  @IsUrl()
  credentialUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

const VALID_DOCUMENT_TYPES = ['CATALOG', 'COMPANY_PROFILE', 'BROCHURE', 'PRICE_LIST', 'CERTIFICATE', 'OTHER'] as const;

class AdminCreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsOptional()
  @IsIn(VALID_DOCUMENT_TYPES)
  documentType?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

const MEMBER_ROLES = [
  UserRole.EDUCATOR,
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
  UserRole.PARENT,
  UserRole.ADMIN,
] as const;

class AdminAddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(UserRole)
  @IsIn(MEMBER_ROLES)
  role: UserRole;
}

class AdminUpdateMemberRoleDto {
  @IsEnum(UserRole)
  @IsIn(MEMBER_ROLES)
  role: UserRole;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('admin-subresources')
@Controller('admin')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminSubresourcesController {
  private readonly logger = new Logger(AdminSubresourcesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplace: MarketplaceService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Resolve AppUser.id → User.id (profileId). Throws 404 if not found. */
  private async resolveProfileId(userId: string): Promise<string> {
    const appUser = await this.prisma.appUser.findUnique({ where: { id: userId } });
    if (appUser) {
      const user = await this.prisma.user.findUnique({ where: { clerkId: appUser.clerkId } });
      if (!user) throw new NotFoundException('User profile not found');
      return user.id;
    }
    // Fallback: maybe userId is already a User.id
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  /** Verify organization exists, throw 404 if not. */
  private async assertOrgExists(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
  }

  // ─── Educator: Work Experience ─────────────────────────────────────────────

  @Get('users/:userId/work-experience')
  @ApiOperation({ summary: 'List work experience items for a user (admin)' })
  async listWorkExperience(@Param('userId', ParseUUIDPipe) userId: string) {
    const profileId = await this.resolveProfileId(userId);
    const items = await this.prisma.educatorWorkExperience.findMany({
      where: { userId: profileId },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: items };
  }

  @Post('users/:userId/work-experience')
  @ApiOperation({ summary: 'Add a work experience item (admin)' })
  async createWorkExperience(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminCreateWorkExperienceDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const count = await this.prisma.educatorWorkExperience.count({ where: { userId: profileId } });
    const item = await this.prisma.educatorWorkExperience.create({
      data: {
        userId: profileId,
        jobTitle: dto.jobTitle,
        institutionName: dto.institutionName,
        startDate: dto.startDate,
        endDate: dto.endDate,
        descriptionPoints: dto.descriptionPoints ?? [],
        sortOrder: count,
      },
    });
    this.logger.log(`[ADMIN] Created work experience ${item.id} for user ${userId}`);
    return { success: true, data: item };
  }

  @Patch('users/:userId/work-experience/:itemId')
  @ApiOperation({ summary: 'Update a work experience item (admin)' })
  async updateWorkExperience(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AdminUpdateWorkExperienceDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorWorkExperience.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Work experience item not found');

    const updated = await this.prisma.educatorWorkExperience.update({
      where: { id: itemId },
      data: {
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.institutionName !== undefined && { institutionName: dto.institutionName }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.descriptionPoints !== undefined && { descriptionPoints: dto.descriptionPoints }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    return { success: true, data: updated };
  }

  @Delete('users/:userId/work-experience/:itemId')
  @ApiOperation({ summary: 'Delete a work experience item (admin, hard delete)' })
  async deleteWorkExperience(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorWorkExperience.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Work experience item not found');
    await this.prisma.educatorWorkExperience.delete({ where: { id: itemId } });
    this.logger.log(`[ADMIN] Hard-deleted work experience ${itemId} for user ${userId}`);
    return { success: true, message: 'Work experience item deleted' };
  }

  // ─── Educator: Education ──────────────────────────────────────────────────

  @Get('users/:userId/education')
  @ApiOperation({ summary: 'List education items for a user (admin)' })
  async listEducation(@Param('userId', ParseUUIDPipe) userId: string) {
    const profileId = await this.resolveProfileId(userId);
    const items = await this.prisma.educatorEducation.findMany({
      where: { userId: profileId },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: items };
  }

  @Post('users/:userId/education')
  @ApiOperation({ summary: 'Add an education item (admin)' })
  async createEducation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminCreateEducationDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const count = await this.prisma.educatorEducation.count({ where: { userId: profileId } });
    const item = await this.prisma.educatorEducation.create({
      data: {
        userId: profileId,
        degree: dto.degree,
        institutionName: dto.institutionName,
        graduationYear: dto.graduationYear,
        description: dto.description,
        sortOrder: count,
      },
    });
    this.logger.log(`[ADMIN] Created education ${item.id} for user ${userId}`);
    return { success: true, data: item };
  }

  @Patch('users/:userId/education/:itemId')
  @ApiOperation({ summary: 'Update an education item (admin)' })
  async updateEducation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AdminUpdateEducationDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorEducation.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Education item not found');
    const updated = await this.prisma.educatorEducation.update({
      where: { id: itemId },
      data: {
        ...(dto.degree !== undefined && { degree: dto.degree }),
        ...(dto.institutionName !== undefined && { institutionName: dto.institutionName }),
        ...(dto.graduationYear !== undefined && { graduationYear: dto.graduationYear }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    return { success: true, data: updated };
  }

  @Delete('users/:userId/education/:itemId')
  @ApiOperation({ summary: 'Delete an education item (admin, hard delete)' })
  async deleteEducation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorEducation.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Education item not found');
    await this.prisma.educatorEducation.delete({ where: { id: itemId } });
    this.logger.log(`[ADMIN] Hard-deleted education ${itemId} for user ${userId}`);
    return { success: true, message: 'Education item deleted' };
  }

  // ─── Educator: Certifications ─────────────────────────────────────────────

  @Get('users/:userId/certifications')
  @ApiOperation({ summary: 'List certification items for a user (admin)' })
  async listCertifications(@Param('userId', ParseUUIDPipe) userId: string) {
    const profileId = await this.resolveProfileId(userId);
    const items = await this.prisma.educatorCertification.findMany({
      where: { userId: profileId },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: items };
  }

  @Post('users/:userId/certifications')
  @ApiOperation({ summary: 'Add a certification item (admin)' })
  async createCertification(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminCreateCertificationDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const count = await this.prisma.educatorCertification.count({ where: { userId: profileId } });
    const item = await this.prisma.educatorCertification.create({
      data: {
        userId: profileId,
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        credentialUrl: dto.credentialUrl,
        sortOrder: count,
      },
    });
    this.logger.log(`[ADMIN] Created certification ${item.id} for user ${userId}`);
    return { success: true, data: item };
  }

  @Patch('users/:userId/certifications/:itemId')
  @ApiOperation({ summary: 'Update a certification item (admin)' })
  async updateCertification(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AdminUpdateCertificationDto,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorCertification.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Certification item not found');
    const updated = await this.prisma.educatorCertification.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.issuingOrganization !== undefined && { issuingOrganization: dto.issuingOrganization }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate }),
        ...(dto.credentialUrl !== undefined && { credentialUrl: dto.credentialUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    return { success: true, data: updated };
  }

  @Delete('users/:userId/certifications/:itemId')
  @ApiOperation({ summary: 'Delete a certification item (admin, hard delete)' })
  async deleteCertification(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const profileId = await this.resolveProfileId(userId);
    const existing = await this.prisma.educatorCertification.findFirst({
      where: { id: itemId, userId: profileId },
    });
    if (!existing) throw new NotFoundException('Certification item not found');
    await this.prisma.educatorCertification.delete({ where: { id: itemId } });
    this.logger.log(`[ADMIN] Hard-deleted certification ${itemId} for user ${userId}`);
    return { success: true, message: 'Certification item deleted' };
  }

  // ─── Organization: Products ───────────────────────────────────────────────

  @Get('organizations/:orgId/products')
  @ApiOperation({ summary: 'List products for an organization (admin)' })
  async listProducts(@Param('orgId', ParseUUIDPipe) orgId: string) {
    await this.assertOrgExists(orgId);
    const products = await this.prisma.product.findMany({
      where: { supplierId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: products };
  }

  @Post('organizations/:orgId/products')
  @ApiOperation({ summary: 'Create a product for an organization (admin)' })
  async createProduct(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateProductDto,
  ) {
    await this.assertOrgExists(orgId);
    const result = await this.marketplace.createProduct(dto, orgId);
    this.logger.log(`[ADMIN] Created product for org ${orgId}`);
    return result;
  }

  @Patch('organizations/:orgId/products/:productId')
  @ApiOperation({ summary: 'Update a product (admin)' })
  async updateProduct(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, supplierId: orgId },
    });
    if (!product) throw new NotFoundException('Product not found for this organization');
    const result = await this.marketplace.updateProduct(productId, dto);
    return result;
  }

  @Delete('organizations/:orgId/products/:productId')
  @ApiOperation({ summary: 'Hard-delete a product (admin)' })
  async deleteProduct(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, supplierId: orgId },
    });
    if (!product) throw new NotFoundException('Product not found for this organization');
    await this.marketplace.deleteProduct(productId);
    this.logger.log(`[ADMIN] Hard-deleted product ${productId} from org ${orgId}`);
    return { success: true, message: 'Product deleted' };
  }

  // ─── Organization: Services ───────────────────────────────────────────────

  @Get('organizations/:orgId/services')
  @ApiOperation({ summary: 'List services for an organization (admin)' })
  async listServices(@Param('orgId', ParseUUIDPipe) orgId: string) {
    await this.assertOrgExists(orgId);
    const provider = await this.prisma.serviceProvider.findUnique({ where: { organizationId: orgId } });
    if (!provider) return { success: true, data: [] };
    const services = await this.prisma.service.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: services };
  }

  @Post('organizations/:orgId/services')
  @ApiOperation({ summary: 'Create a service for an organization (admin)' })
  async createService(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateServiceDto,
  ) {
    await this.assertOrgExists(orgId);
    const providerId = await this.marketplace.ensureServiceProviderIdForOrganization(orgId);
    const result = await this.marketplace.createService(dto, providerId);
    this.logger.log(`[ADMIN] Created service for org ${orgId}`);
    return result;
  }

  @Patch('organizations/:orgId/services/:serviceId')
  @ApiOperation({ summary: 'Update a service (admin)' })
  async updateService(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { organizationId: orgId } });
    if (!provider) throw new NotFoundException('Service provider not found for this organization');
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId: provider.id },
    });
    if (!service) throw new NotFoundException('Service not found for this organization');
    const result = await this.marketplace.updateService(serviceId, dto);
    return result;
  }

  @Delete('organizations/:orgId/services/:serviceId')
  @ApiOperation({ summary: 'Hard-delete a service (admin)' })
  async deleteService(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { organizationId: orgId } });
    if (!provider) throw new NotFoundException('Service provider not found for this organization');
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, providerId: provider.id },
    });
    if (!service) throw new NotFoundException('Service not found for this organization');
    await this.marketplace.deleteService(serviceId);
    this.logger.log(`[ADMIN] Hard-deleted service ${serviceId} from org ${orgId}`);
    return { success: true, message: 'Service deleted' };
  }

  // ─── Organization: Documents ──────────────────────────────────────────────

  @Get('organizations/:orgId/documents')
  @ApiOperation({ summary: 'List documents for an organization (admin)' })
  async listDocuments(@Param('orgId', ParseUUIDPipe) orgId: string) {
    await this.assertOrgExists(orgId);
    const docs = await this.prisma.organizationDocument.findMany({
      where: { organizationId: orgId },
      include: { asset: true },
      orderBy: { displayOrder: 'asc' },
    });
    return {
      success: true,
      data: docs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        title: d.title,
        description: d.description,
        displayOrder: d.displayOrder,
        isActive: d.isActive,
        createdAt: d.createdAt,
        asset: {
          id: d.asset.id,
          publicUrl: (d.asset as any).publicUrl ?? null,
          fileName: (d.asset as any).fileName ?? null,
          mimeType: (d.asset as any).mimeType ?? null,
        },
      })),
    };
  }

  @Post('organizations/:orgId/documents')
  @ApiOperation({ summary: 'Attach a document to an organization (admin)' })
  async createDocument(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AdminCreateDocumentDto,
  ) {
    await this.assertOrgExists(orgId);

    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new BadRequestException('Asset not found. Upload the file first.');

    const count = await this.prisma.organizationDocument.count({ where: { organizationId: orgId } });
    const doc = await this.prisma.organizationDocument.create({
      data: {
        organizationId: orgId,
        assetId: dto.assetId,
        documentType: dto.documentType ?? 'CATALOG',
        title: dto.title,
        description: dto.description,
        displayOrder: dto.displayOrder ?? count,
        isActive: true,
      },
      include: { asset: true },
    });

    this.logger.log(`[ADMIN] Attached document ${doc.id} to org ${orgId}`);
    return { success: true, data: doc };
  }

  @Delete('organizations/:orgId/documents/:docId')
  @ApiOperation({ summary: 'Hard-delete a document (admin)' })
  async deleteDocument(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    const doc = await this.prisma.organizationDocument.findFirst({
      where: { id: docId, organizationId: orgId },
    });
    if (!doc) throw new NotFoundException('Document not found for this organization');

    // Hard delete — cascade defined in schema (onDelete: Cascade on asset relation)
    await this.prisma.organizationDocument.delete({ where: { id: docId } });
    this.logger.log(`[ADMIN] Hard-deleted document ${docId} from org ${orgId}`);
    return { success: true, message: 'Document deleted' };
  }

  // ─── Organization: Members ────────────────────────────────────────────────

  @Get('organizations/:orgId/members')
  @ApiOperation({ summary: 'List members of an organization (admin)' })
  async listMembers(@Param('orgId', ParseUUIDPipe) orgId: string) {
    await this.assertOrgExists(orgId);
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      success: true,
      data: members.map((m) => ({
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
        },
      })),
    };
  }

  @Post('organizations/:orgId/members')
  @ApiOperation({ summary: 'Add a member to an organization (admin)' })
  async addMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AdminAddMemberDto,
  ) {
    await this.assertOrgExists(orgId);

    // Resolve the user — dto.userId can be AppUser.id or User.id
    const profileId = await this.resolveProfileId(dto.userId);

    const existing = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: profileId, organizationId: orgId } },
    });
    if (existing) throw new ConflictException('User is already a member of this organization');

    const membership = await this.prisma.userOrganization.create({
      data: { userId: profileId, organizationId: orgId, role: dto.role },
      include: { user: true },
    });

    this.logger.log(`[ADMIN] Added user ${profileId} to org ${orgId} as ${dto.role}`);
    return {
      success: true,
      data: {
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        user: {
          id: membership.user.id,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
        },
      },
    };
  }

  @Patch('organizations/:orgId/members/:userId')
  @ApiOperation({ summary: 'Change a member role within an organization (admin)' })
  async updateMemberRole(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateMemberRoleDto,
  ) {
    await this.assertOrgExists(orgId);
    const profileId = await this.resolveProfileId(userId);

    const existing = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: profileId, organizationId: orgId } },
    });
    if (!existing) throw new NotFoundException('User is not a member of this organization');

    const updated = await this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId: profileId, organizationId: orgId } },
      data: { role: dto.role },
    });

    this.logger.log(`[ADMIN] Updated role for user ${profileId} in org ${orgId} to ${dto.role}`);
    return { success: true, data: updated };
  }

  @Delete('organizations/:orgId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from an organization (admin)' })
  async removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.assertOrgExists(orgId);
    const profileId = await this.resolveProfileId(userId);

    const existing = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: profileId, organizationId: orgId } },
    });
    if (!existing) throw new NotFoundException('User is not a member of this organization');

    await this.prisma.userOrganization.delete({
      where: { userId_organizationId: { userId: profileId, organizationId: orgId } },
    });

    this.logger.log(`[ADMIN] Removed user ${profileId} from org ${orgId}`);
    return { success: true, message: 'Member removed from organization' };
  }

  // ─── Impersonation ───────────────────────────────────────────────────────────

  @Post('users/:userId/impersonate')
  @ApiOperation({ summary: 'Log impersonation start for a user (audit trail)' })
  async impersonateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    const targetProfileId = await this.resolveProfileId(userId);

    const target = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: targetProfileId },
          { appUsers: { some: { id: targetProfileId } } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    if (!target) throw new NotFoundException('Target user not found');

    const adminAppUserId: string | undefined = req.context?.appUserId;
    const adminUser = adminAppUserId
      ? await this.prisma.user.findFirst({
          where: { appUsers: { some: { id: adminAppUserId } } },
          select: { id: true, email: true },
        })
      : null;

    await this.prisma.auditLog.create({
      data: {
        entity: 'User',
        entityId: target.id,
        action: 'impersonate',
        actorId: adminUser?.id ?? adminAppUserId ?? 'unknown',
        metadata: {
          targetUserId: target.id,
          targetEmail: target.email,
          adminEmail: adminUser?.email,
        },
      },
    });

    this.logger.log(`[ADMIN] Impersonation started: admin=${adminUser?.email} → user=${target.email}`);
    return {
      success: true,
      data: {
        id: target.id,
        firstName: target.firstName,
        lastName: target.lastName,
        email: target.email,
        role: target.role,
        displayName: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim() || target.email,
      },
    };
  }
}
