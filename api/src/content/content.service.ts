import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../upload/cloudflare-r2.service';
import { AssetKind } from '@prisma/client';
import {
  UploadElearningDto,
  UpdateElearningDto,
  GetElearningQueryDto,
} from './dto/elearning.dto';
import {
  UploadHrDocumentDto,
  UpdateHrDocumentDto,
  GetHrDocumentsQueryDto,
} from './dto/hr-document.dto';
import {
  UploadStatePolicyDto,
  UpdateStatePolicyDto,
  GetStatePoliciesQueryDto,
} from './dto/state-policy.dto';
import {
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  ELearningContentType,
} from './dto/content.enums';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: CloudflareR2Service,
  ) {}

  /**
   * ========================================
   * E-LEARNING CONTENT
   * ========================================
   */

  async uploadElearning(
    file: Express.Multer.File | undefined,
    dto: UploadElearningDto,
    userId: string,
  ) {
    this.logger.log(`Uploading e-learning content: ${dto.title}`);

    // Validate file based on content type
    if (dto.type !== ELearningContentType.LINK && dto.videoSourceType !== 'url') {
      if (!file) {
        throw new BadRequestException('File is required for non-LINK content');
      }

      // Validate file size
      if (file.size > FILE_SIZE_LIMITS.ELEARNING) {
        throw new BadRequestException(
          `File size exceeds maximum allowed (${FILE_SIZE_LIMITS.ELEARNING / 1024 / 1024}MB)`,
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.ELEARNING.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.ELEARNING.join(', ')}`,
        );
      }
    }

    // Check for duplicate title
    const existingContent = await this.prisma.asset.findFirst({
      where: {
        title: dto.title,
        uploadedById: userId,
        category: 'ELEARNING',
      },
    });

    if (existingContent) {
      throw new BadRequestException(
        'E-learning content with this title already exists',
      );
    }

    let uploadResult: { url: string; key: string } | undefined;

    try {
      // Upload file if provided
      if (file && dto.type !== ELearningContentType.LINK && dto.videoSourceType !== 'url') {
        uploadResult = await this.r2Service.uploadFile(
          file,
          AssetKind.ELEARNING, // Use ELEARNING kind for R2 validation
          userId,
          `e-learning/${dto.category}`, // Pass content type + category as subfolder
        );
      }

      // Create asset record with typed fields
      const asset = await this.prisma.asset.create({
        data: {
          kind: AssetKind.ELEARNING, // Use ELEARNING kind
          category: 'ELEARNING',
          filename: file?.originalname || dto.title,
          publicUrl: uploadResult?.url || dto.fileUrl || '',
          storageKey: uploadResult?.key || `link-${Date.now()}`,
          mimeType: file?.mimetype || 'text/uri-list',
          size: file?.size || 0,
          uploadedById: userId,
          
          // Typed content fields
          title: dto.title,
          description: dto.description,
          contentPreview: dto.contentPreview,
          contentType: dto.type,
          language: dto.language,
          accessRoles: dto.accessRoles || [],
          status: dto.status || 'Draft',
          tags: dto.tags || [],
          
          // E-learning specific
          duration: dto.duration,
          lessons: dto.lessons,
          videoSourceType: dto.videoSourceType,
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`E-learning content created: ${asset.id}`);

      return {
        success: true,
        data: this.transformElearningAsset(asset),
        message: 'E-learning content uploaded successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Cleanup uploaded file if DB operation fails
      if (uploadResult) {
        try {
          await this.r2Service.deleteFile(uploadResult.key);
        } catch (deleteError) {
          this.logger.error('Failed to delete orphaned file:', deleteError);
        }
      }

      this.logger.error('E-learning upload failed:', error);
      throw new BadRequestException(
        `Failed to upload e-learning content: ${error.message}`,
      );
    }
  }

  async getElearningContent(
    query: GetElearningQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, category, type, language, status } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      category: 'ELEARNING',
    };

    if (category) {
      where.title = { contains: category, mode: 'insensitive' };
    }

    if (type) {
      where.contentType = type;
    }

    if (language) {
      where.language = language;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.asset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                clerkId: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.asset.count({ where }),
      ]);

      return {
        success: true,
        data: items.map((item) => this.transformElearningAsset(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch e-learning content:', error);
      throw new BadRequestException(
        `Failed to fetch e-learning content: ${error.message}`,
      );
    }
  }

  async updateElearning(
    id: string,
    dto: UpdateElearningDto,
    userId: string,
  ) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('E-learning content not found');
    }

    if (asset.category !== 'ELEARNING') {
      throw new BadRequestException('Asset is not e-learning content');
    }

    try {
      const updatedAsset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description && { description: dto.description }),
          ...(dto.contentPreview && { contentPreview: dto.contentPreview }),
          ...(dto.category && { category: dto.category }),
          ...(dto.type && { contentType: dto.type }),
          ...(dto.language && { language: dto.language }),
          ...(dto.accessRoles && { accessRoles: dto.accessRoles }),
          ...(dto.status && { status: dto.status }),
          ...(dto.tags && { tags: dto.tags }),
          ...(dto.duration && { duration: dto.duration }),
          ...(dto.lessons && { lessons: dto.lessons }),
          ...(dto.fileUrl && { publicUrl: dto.fileUrl }),
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`E-learning content updated: ${id}`);

      return {
        success: true,
        data: this.transformElearningAsset(updatedAsset),
        message: 'E-learning content updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('E-learning update failed:', error);
      throw new BadRequestException(
        `Failed to update e-learning content: ${error.message}`,
      );
    }
  }

  async deleteElearning(id: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('E-learning content not found');
    }

    if (asset.category !== 'ELEARNING') {
      throw new BadRequestException('Asset is not e-learning content');
    }

    try {
      // Delete from R2 if it's a file (not a link)
      if (asset.contentType !== 'LINK' && asset.storageKey && !asset.storageKey.startsWith('link-')) {
        try {
          await this.r2Service.deleteFile(asset.storageKey);
        } catch (r2Error) {
          this.logger.error(`R2 deletion failed for key ${asset.storageKey}:`, r2Error);
          // Continue with DB deletion
        }
      }

      await this.prisma.asset.delete({
        where: { id },
      });

      this.logger.log(`E-learning content deleted: ${id}`);

      return {
        success: true,
        message: 'E-learning content deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('E-learning deletion failed:', error);
      throw new BadRequestException(
        `Failed to delete e-learning content: ${error.message}`,
      );
    }
  }

  /**
   * ========================================
   * HR DOCUMENTS
   * ========================================
   */

  async uploadHrDocument(
    file: Express.Multer.File,
    dto: UploadHrDocumentDto,
    userId: string,
  ) {
    this.logger.log(`Uploading HR document: ${dto.title}`);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file size
    if (file.size > FILE_SIZE_LIMITS.HR_DOCUMENT) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${FILE_SIZE_LIMITS.HR_DOCUMENT / 1024 / 1024}MB)`,
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.HR_DOCUMENT.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.HR_DOCUMENT.join(', ')}`,
      );
    }

    // Check for duplicate
    const existingDoc = await this.prisma.asset.findFirst({
      where: {
        title: dto.title,
        uploadedById: userId,
        category: 'HR_DOCUMENT',
      },
    });

    if (existingDoc) {
      throw new BadRequestException(
        'HR document with this title already exists',
      );
    }

    let uploadResult: { url: string; key: string } | undefined;

    try {
      uploadResult = await this.r2Service.uploadFile(
        file,
        AssetKind.DOCUMENT,
        userId,
        `hr-documents/${dto.category}`, // Pass content type + category as subfolder
      );

      const asset = await this.prisma.asset.create({
        data: {
          kind: AssetKind.DOCUMENT,
          category: 'HR_DOCUMENT',
          filename: file.originalname,
          publicUrl: uploadResult.url,
          storageKey: uploadResult.key,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: userId,
          
          // Typed content fields
          title: dto.title,
          description: dto.description,
          contentPreview: dto.contentPreview,
          language: dto.language,
          accessRoles: dto.accessRoles || [],
          status: dto.status || 'Draft',
          tags: dto.tags || [],
          
          // HR specific
          fileType: dto.fileType,
          versionNumber: dto.version,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`HR document created: ${asset.id}`);

      return {
        success: true,
        data: this.transformHrDocumentAsset(asset),
        message: 'HR document uploaded successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Cleanup
      if (uploadResult) {
        try {
          await this.r2Service.deleteFile(uploadResult.key);
        } catch (deleteError) {
          this.logger.error('Failed to delete orphaned file:', deleteError);
        }
      }

      this.logger.error('HR document upload failed:', error);
      throw new BadRequestException(
        `Failed to upload HR document: ${error.message}`,
      );
    }
  }

  async getHrDocuments(
    query: GetHrDocumentsQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, category, status, language } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      category: 'HR_DOCUMENT',
    };

    if (category) {
      where.title = { contains: category, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (language) {
      where.language = language;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.asset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                clerkId: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.asset.count({ where }),
      ]);

      return {
        success: true,
        data: items.map((item) => this.transformHrDocumentAsset(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch HR documents:', error);
      throw new BadRequestException(
        `Failed to fetch HR documents: ${error.message}`,
      );
    }
  }

  async updateHrDocument(
    id: string,
    dto: UpdateHrDocumentDto,
    userId: string,
  ) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('HR document not found');
    }

    if (asset.category !== 'HR_DOCUMENT') {
      throw new BadRequestException('Asset is not an HR document');
    }

    try {
      const updatedAsset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description && { description: dto.description }),
          ...(dto.contentPreview && { contentPreview: dto.contentPreview }),
          ...(dto.category && { category: dto.category }),
          ...(dto.language && { language: dto.language }),
          ...(dto.accessRoles && { accessRoles: dto.accessRoles }),
          ...(dto.status && { status: dto.status }),
          ...(dto.tags && { tags: dto.tags }),
          ...(dto.fileType && { fileType: dto.fileType }),
          ...(dto.version && { versionNumber: dto.version }),
          ...(dto.effectiveDate && { effectiveDate: new Date(dto.effectiveDate) }),
          ...(dto.reviewDate && { reviewDate: new Date(dto.reviewDate) }),
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`HR document updated: ${id}`);

      return {
        success: true,
        data: this.transformHrDocumentAsset(updatedAsset),
        message: 'HR document updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('HR document update failed:', error);
      throw new BadRequestException(
        `Failed to update HR document: ${error.message}`,
      );
    }
  }

  async deleteHrDocument(id: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('HR document not found');
    }

    if (asset.category !== 'HR_DOCUMENT') {
      throw new BadRequestException('Asset is not an HR document');
    }

    try {
      // Delete from R2
      try {
        await this.r2Service.deleteFile(asset.storageKey);
      } catch (r2Error) {
        this.logger.error(`R2 deletion failed:`, r2Error);
      }

      await this.prisma.asset.delete({
        where: { id },
      });

      this.logger.log(`HR document deleted: ${id}`);

      return {
        success: true,
        message: 'HR document deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('HR document deletion failed:', error);
      throw new BadRequestException(
        `Failed to delete HR document: ${error.message}`,
      );
    }
  }

  /**
   * ========================================
   * STATE POLICIES
   * ========================================
   */

  async uploadStatePolicy(
    file: Express.Multer.File | undefined,
    dto: UploadStatePolicyDto,
    userId: string,
  ) {
    this.logger.log(`Uploading state policy: ${dto.title}`);

    // File is optional if external link or description is provided
    if (!file && !dto.externalLink && !dto.description) {
      throw new BadRequestException(
        'File, external link, or description is required',
      );
    }

    if (file) {
      // Validate file size
      if (file.size > FILE_SIZE_LIMITS.STATE_POLICY) {
        throw new BadRequestException(
          `File size exceeds maximum allowed (${FILE_SIZE_LIMITS.STATE_POLICY / 1024 / 1024}MB)`,
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.STATE_POLICY.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.STATE_POLICY.join(', ')}`,
        );
      }
    }

    // Check for duplicate
    const existingPolicy = await this.prisma.asset.findFirst({
      where: {
        title: dto.title,
        country: dto.country,
        region: dto.region,
        category: 'STATE_POLICY',
      },
    });

    if (existingPolicy) {
      throw new BadRequestException(
        'State policy with this title already exists for this region',
      );
    }

    let uploadResult: { url: string; key: string } | undefined;

    try {
      if (file) {
        uploadResult = await this.r2Service.uploadFile(
          file,
          AssetKind.DOCUMENT,
          userId,
          `state-policies/${dto.category}`, // Pass content type + category as subfolder
        );
      }

      const asset = await this.prisma.asset.create({
        data: {
          kind: AssetKind.DOCUMENT,
          category: 'STATE_POLICY',
          filename: file?.originalname || dto.title,
          publicUrl: uploadResult?.url || dto.externalLink || '',
          storageKey: uploadResult?.key || `policy-${Date.now()}`,
          mimeType: file?.mimetype || 'text/uri-list',
          size: file?.size || 0,
          uploadedById: userId,
          
          // Typed content fields
          title: dto.title,
          description: dto.description,
          contentPreview: dto.contentPreview || dto.description,
          language: dto.language,
          accessRoles: dto.accessRoles || [],
          status: dto.status || 'Draft',
          tags: dto.tags || [],
          
          // Policy specific
          country: dto.country,
          region: dto.region,
          policyType: dto.policyType,
          isCritical: dto.isCritical || false,
          fileType: dto.fileType,
          versionNumber: dto.version,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
          expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
          externalLink: dto.externalLink,
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`State policy created: ${asset.id}`);

      return {
        success: true,
        data: this.transformStatePolicyAsset(asset),
        message: 'State policy uploaded successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Cleanup
      if (uploadResult) {
        try {
          await this.r2Service.deleteFile(uploadResult.key);
        } catch (deleteError) {
          this.logger.error('Failed to delete orphaned file:', deleteError);
        }
      }

      this.logger.error('State policy upload failed:', error);
      throw new BadRequestException(
        `Failed to upload state policy: ${error.message}`,
      );
    }
  }

  async getStatePolicies(
    query: GetStatePoliciesQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      status, 
      language, 
      country, 
      region,
      isCritical,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      category: 'STATE_POLICY',
    };

    if (category) {
      where.title = { contains: category, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (language) {
      where.language = language;
    }

    if (country) {
      where.country = country;
    }

    if (region) {
      where.region = region;
    }

    if (isCritical !== undefined) {
      where.isCritical = isCritical;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.asset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                clerkId: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.asset.count({ where }),
      ]);

      return {
        success: true,
        data: items.map((item) => this.transformStatePolicyAsset(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch state policies:', error);
      throw new BadRequestException(
        `Failed to fetch state policies: ${error.message}`,
      );
    }
  }

  async updateStatePolicy(
    id: string,
    dto: UpdateStatePolicyDto,
    userId: string,
  ) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('State policy not found');
    }

    if (asset.category !== 'STATE_POLICY') {
      throw new BadRequestException('Asset is not a state policy');
    }

    try {
      const updatedAsset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description && { description: dto.description }),
          ...(dto.contentPreview && { contentPreview: dto.contentPreview }),
          ...(dto.category && { category: dto.category }),
          ...(dto.language && { language: dto.language }),
          ...(dto.country && { country: dto.country }),
          ...(dto.region && { region: dto.region }),
          ...(dto.policyType && { policyType: dto.policyType }),
          ...(dto.isCritical !== undefined && { isCritical: dto.isCritical }),
          ...(dto.accessRoles && { accessRoles: dto.accessRoles }),
          ...(dto.status && { status: dto.status }),
          ...(dto.tags && { tags: dto.tags }),
          ...(dto.fileType && { fileType: dto.fileType }),
          ...(dto.version && { versionNumber: dto.version }),
          ...(dto.effectiveDate && { effectiveDate: new Date(dto.effectiveDate) }),
          ...(dto.expirationDate && { expirationDate: new Date(dto.expirationDate) }),
          ...(dto.externalLink && { externalLink: dto.externalLink }),
        },
        include: {
          uploader: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`State policy updated: ${id}`);

      return {
        success: true,
        data: this.transformStatePolicyAsset(updatedAsset),
        message: 'State policy updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('State policy update failed:', error);
      throw new BadRequestException(
        `Failed to update state policy: ${error.message}`,
      );
    }
  }

  async deleteStatePolicy(id: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('State policy not found');
    }

    if (asset.category !== 'STATE_POLICY') {
      throw new BadRequestException('Asset is not a state policy');
    }

    try {
      // Delete from R2 if it's a file
      if (asset.storageKey && !asset.storageKey.startsWith('policy-')) {
        try {
          await this.r2Service.deleteFile(asset.storageKey);
        } catch (r2Error) {
          this.logger.error(`R2 deletion failed:`, r2Error);
        }
      }

      await this.prisma.asset.delete({
        where: { id },
      });

      this.logger.log(`State policy deleted: ${id}`);

      return {
        success: true,
        message: 'State policy deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('State policy deletion failed:', error);
      throw new BadRequestException(
        `Failed to delete state policy: ${error.message}`,
      );
    }
  }

  /**
   * ========================================
   * TRANSFORM HELPERS
   * ========================================
   */

  private transformElearningAsset(asset: any) {
    return {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      contentPreview: asset.contentPreview,
      type: asset.contentType,
      category: asset.category,
      language: asset.language,
      accessRoles: asset.accessRoles || [],
      status: asset.status,
      tags: asset.tags || [],
      duration: asset.duration,
      lessons: asset.lessons,
      videoSourceType: asset.videoSourceType,
      fileUrl: asset.publicUrl,
      filename: asset.filename,
      size: asset.size,
      mimeType: asset.mimeType,
      updatedAt: asset.updatedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
      uploader: asset.uploader,
    };
  }

  private transformHrDocumentAsset(asset: any) {
    return {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      contentPreview: asset.contentPreview,
      category: asset.category,
      language: asset.language,
      accessRoles: asset.accessRoles || [],
      status: asset.status,
      tags: asset.tags || [],
      fileType: asset.fileType,
      version: asset.versionNumber,
      effectiveDate: asset.effectiveDate?.toISOString(),
      reviewDate: asset.reviewDate?.toISOString(),
      publicUrl: asset.publicUrl,
      filename: asset.filename,
      size: asset.size,
      mimeType: asset.mimeType,
      updatedAt: asset.updatedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
      uploader: asset.uploader,
    };
  }

  private transformStatePolicyAsset(asset: any) {
    return {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      contentPreview: asset.contentPreview,
      category: asset.category,
      language: asset.language,
      country: asset.country,
      region: asset.region,
      policyType: asset.policyType,
      isCritical: asset.isCritical,
      accessRoles: asset.accessRoles || [],
      status: asset.status,
      tags: asset.tags || [],
      fileType: asset.fileType,
      version: asset.versionNumber,
      effectiveDate: asset.effectiveDate?.toISOString(),
      expirationDate: asset.expirationDate?.toISOString(),
      externalLink: asset.externalLink,
      publicUrl: asset.publicUrl,
      filename: asset.filename,
      size: asset.size,
      mimeType: asset.mimeType,
      updatedAt: asset.updatedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
      uploader: asset.uploader,
    };
  }
}

