import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetKind } from '@prisma/client';
import {
  CreateOrganizationDocumentDto,
  UpdateOrganizationDocumentDto,
  OrganizationDocumentResponseDto,
} from './dto/organization-document.dto';

@Injectable()
export class OrganizationDocumentsService {
  private readonly logger = new Logger(OrganizationDocumentsService.name);

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
   * Validate asset ownership and kind
   */
  private async validateAsset(
    assetId: string,
    accountId: string,
  ): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.uploadedById !== accountId) {
      throw new ForbiddenException('Unauthorized to use this asset');
    }

    // Allow COMPANY_PROFILE_DOC, DOCUMENT, CATALOG_PDF, CATALOG_CSV
    const allowedKinds: AssetKind[] = [
      AssetKind.COMPANY_PROFILE_DOC,
      AssetKind.DOCUMENT,
      AssetKind.CATALOG_PDF,
      AssetKind.CATALOG_CSV,
    ];

    if (!allowedKinds.includes(asset.kind)) {
      throw new BadRequestException(
        `Asset must be of kind ${allowedKinds.join(' or ')} for organization documents`,
      );
    }
  }

  /**
   * Get all documents for an organization
   */
  async getDocuments(organizationId: string): Promise<OrganizationDocumentResponseDto[]> {
    const documents = await this.prisma.organizationDocument.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        asset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            mimeType: true,
            size: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      organizationId: doc.organizationId,
      assetId: doc.assetId,
      documentType: doc.documentType,
      title: doc.title || undefined,
      description: doc.description || undefined,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      asset: doc.asset
        ? {
            id: doc.asset.id,
            filename: doc.asset.filename,
            publicUrl: doc.asset.publicUrl,
            mimeType: doc.asset.mimeType || undefined,
            size: doc.asset.size || undefined,
          }
        : undefined,
    }));
  }

  /**
   * Create a new organization document
   */
  async createDocument(
    organizationId: string,
    accountId: string,
    dto: CreateOrganizationDocumentDto,
  ): Promise<OrganizationDocumentResponseDto> {
    // Validate asset ownership and type
    await this.validateAsset(dto.assetId, accountId);

    // Get the next display order
    const maxOrderDoc = await this.prisma.organizationDocument.findFirst({
      where: { organizationId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    const nextDisplayOrder = (maxOrderDoc?.displayOrder || 0) + 1;

    const document = await this.prisma.organizationDocument.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        documentType: dto.documentType,
        title: dto.title,
        description: dto.description,
        displayOrder: nextDisplayOrder,
      },
      include: {
        asset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    this.logger.log(
      `Created organization document ${document.id} for organization ${organizationId}`,
    );

    return {
      id: document.id,
      organizationId: document.organizationId,
      assetId: document.assetId,
      documentType: document.documentType,
      title: document.title || undefined,
      description: document.description || undefined,
      displayOrder: document.displayOrder,
      isActive: document.isActive,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      asset: document.asset
        ? {
            id: document.asset.id,
            filename: document.asset.filename,
            publicUrl: document.asset.publicUrl,
            mimeType: document.asset.mimeType || undefined,
            size: document.asset.size || undefined,
          }
        : undefined,
    };
  }

  /**
   * Update an organization document
   */
  async updateDocument(
    documentId: string,
    organizationId: string,
    dto: UpdateOrganizationDocumentDto,
  ): Promise<OrganizationDocumentResponseDto> {
    // Verify the document belongs to the organization
    const existingDoc = await this.prisma.organizationDocument.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!existingDoc) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.organizationDocument.update({
      where: { id: documentId },
      data: {
        ...(dto.documentType !== undefined && { documentType: dto.documentType }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        asset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    this.logger.log(`Updated organization document ${documentId}`);

    return {
      id: document.id,
      organizationId: document.organizationId,
      assetId: document.assetId,
      documentType: document.documentType,
      title: document.title || undefined,
      description: document.description || undefined,
      displayOrder: document.displayOrder,
      isActive: document.isActive,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      asset: document.asset
        ? {
            id: document.asset.id,
            filename: document.asset.filename,
            publicUrl: document.asset.publicUrl,
            mimeType: document.asset.mimeType || undefined,
            size: document.asset.size || undefined,
          }
        : undefined,
    };
  }

  /**
   * Delete an organization document
   */
  async deleteDocument(documentId: string, organizationId: string): Promise<void> {
    // Verify the document belongs to the organization
    const existingDoc = await this.prisma.organizationDocument.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!existingDoc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.organizationDocument.delete({
      where: { id: documentId },
    });

    this.logger.log(`Deleted organization document ${documentId}`);
  }

  /**
   * Get documents for public profile viewing
   */
  async getPublicDocuments(organizationId: string): Promise<OrganizationDocumentResponseDto[]> {
    const documents = await this.prisma.organizationDocument.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        asset: {
          select: {
            id: true,
            filename: true,
            publicUrl: true,
            mimeType: true,
            size: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      organizationId: doc.organizationId,
      assetId: doc.assetId,
      documentType: doc.documentType,
      title: doc.title || undefined,
      description: doc.description || undefined,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      asset: doc.asset
        ? {
            id: doc.asset.id,
            filename: doc.asset.filename,
            publicUrl: doc.asset.publicUrl,
            mimeType: doc.asset.mimeType || undefined,
            size: doc.asset.size || undefined,
          }
        : undefined,
    }));
  }
}
