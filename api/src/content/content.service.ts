import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../upload/cloudflare-r2.service';
import { AssetKind } from '@prisma/client';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';
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
  private readonly fileSizeLimits: typeof FILE_SIZE_LIMITS;
  private static readonly UPLOAD_TITLE_MAX_LENGTH = 100;

  private buildSuffixedTitle(baseTitle: string, suffixNumber: number) {
    const trimmedBase = (baseTitle || '').trim();
    if (!trimmedBase) return trimmedBase;
    if (suffixNumber <= 1) return trimmedBase;

    const suffix = ` (${suffixNumber})`;
    const maxBaseLength = ContentService.UPLOAD_TITLE_MAX_LENGTH - suffix.length;
    const safeBase =
      maxBaseLength > 0
        ? trimmedBase.slice(0, maxBaseLength).trimEnd()
        : '';

    return `${safeBase}${suffix}`.slice(0, ContentService.UPLOAD_TITLE_MAX_LENGTH);
  }

  constructor(
    private prisma: PrismaService,
    private r2Service: CloudflareR2Service,
    private translationService: TranslationService,
    private configService: ConfigService,
  ) {
    // Use environment variable UPLOAD_MAX_MB for e-learning (videos can be large)
    // Fall back to hardcoded defaults if not set or invalid
    const rawUploadMaxMb = this.configService.get<string>('UPLOAD_MAX_MB');
    const uploadMaxMb = Number(rawUploadMaxMb);
    const effectiveUploadMaxMb =
      Number.isFinite(uploadMaxMb) && uploadMaxMb > 0 ? uploadMaxMb : 500;
    
    if (rawUploadMaxMb && (!Number.isFinite(uploadMaxMb) || uploadMaxMb <= 0)) {
      this.logger.warn(`Invalid UPLOAD_MAX_MB="${rawUploadMaxMb}". Falling back to 500MB.`);
    }
    
    this.fileSizeLimits = {
      ELEARNING: effectiveUploadMaxMb * 1024 * 1024, // Use env var for e-learning
      HR_DOCUMENT: FILE_SIZE_LIMITS.HR_DOCUMENT,
      STATE_POLICY: FILE_SIZE_LIMITS.STATE_POLICY,
    };
    this.logger.log(`Content service initialized with e-learning max file size: ${effectiveUploadMaxMb}MB`);
  }

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
    const startTime = Date.now();
    this.logger.log(`📤 [UPLOAD START] E-learning content: ${dto.title}`);
    this.logger.log(`📤 [UPLOAD CONFIG] Max file size: ${this.fileSizeLimits.ELEARNING / 1024 / 1024}MB`);
    
    if (file) {
      this.logger.log(`📤 [UPLOAD FILE] Name: ${file.originalname}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.mimetype}`);
    }

    // Validate file based on content type
    if (dto.type !== ELearningContentType.LINK && dto.videoSourceType !== 'url') {
      if (!file) {
        throw new BadRequestException('File is required for non-LINK content');
      }

      // Validate file size
      this.logger.log(`📤 [VALIDATION] Checking file size: ${file.size} bytes vs limit: ${this.fileSizeLimits.ELEARNING} bytes`);
      if (file.size > this.fileSizeLimits.ELEARNING) {
        this.logger.error(`📤 [VALIDATION FAILED] File size ${file.size} exceeds limit ${this.fileSizeLimits.ELEARNING}`);
        throw new BadRequestException(
          `File size exceeds maximum allowed (${this.fileSizeLimits.ELEARNING / 1024 / 1024}MB)`,
        );
      }
      this.logger.log(`📤 [VALIDATION] File size OK`);

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.ELEARNING.includes(file.mimetype)) {
        this.logger.error(`📤 [VALIDATION FAILED] Invalid MIME type: ${file.mimetype}`);
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.ELEARNING.join(', ')}`,
        );
      }
      this.logger.log(`📤 [VALIDATION] MIME type OK`);
    }

    // Ensure unique title by auto-suffixing duplicates for e-learning
    const elBaseTitle = dto.title?.trim();
    if (!elBaseTitle) {
      throw new BadRequestException('Title is required');
    }
    const elExisting = await this.prisma.asset.findMany({
      where: {
        uploadedById: userId,
        category: 'ELEARNING',
        title: { startsWith: elBaseTitle },
      },
      select: { title: true },
    });
    if (elExisting.length > 0) {
      let maxSuffix = 1;
      const exactMatch = elExisting.some(a => a.title === elBaseTitle);
      if (exactMatch) maxSuffix = 2;
      for (const a of elExisting) {
        const match = a.title.match(new RegExp(`^${elBaseTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} \\((\\d+)\\)$`));
        if (match && match[1]) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n) && n >= maxSuffix) maxSuffix = n + 1;
        }
      }
      if (maxSuffix > 1) dto.title = this.buildSuffixedTitle(elBaseTitle, maxSuffix);
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
          category: 'ELEARNING', // Content type
          contentCategory: dto.category, // Actual category (Child Development, etc.)
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

      // Save translatable fields and trigger translation (non-blocking)
      const translatableFields = FIELDS_BY_ENTITY.elearning || ['title', 'description', 'content_preview'];
      const translationPayload: Record<string, any> = {
        title: asset.title || '',
        description: asset.description || '',
        content_preview: asset.contentPreview || '',
      };
      
      // Log what we're saving
      const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
      this.logger.log(`Saving translations for e-learning ${asset.id} with fields: ${fieldsWithValues.join(', ')}`);
      this.logger.debug(`Translation payload:`, {
        title: translationPayload.title ? `${translationPayload.title.substring(0, 50)}...` : 'empty',
        description: translationPayload.description ? `${translationPayload.description.substring(0, 50)}...` : 'empty',
        content_preview: translationPayload.content_preview ? `${translationPayload.content_preview.substring(0, 50)}...` : 'empty',
      });
      
      if (translationPayload.title || translationPayload.description || translationPayload.content_preview) {
        // Don't await - let it run in background to avoid blocking the response
        this.translationService.saveEntityWithTranslations(
          'elearning',
          asset.id,
          translationPayload,
          translatableFields,
        ).then(() => {
          this.logger.log(`Successfully saved translations for e-learning ${asset.id}`);
        }).catch((error) => {
          this.logger.error(`Failed to save translations for e-learning ${asset.id}:`, error);
        });
      }

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
    const { page = 1, limit = 20, search, category, type, language, status, lang } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      category: 'ELEARNING',
    };

    if (category) {
      where.contentCategory = category;
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

      // Resolve translations if language is specified
      // Always resolve translations to handle cases where source language != target language
      let transformedItems = items.map((item) => this.transformElearningAsset(item));
      if (lang) {
        const translatableFields = FIELDS_BY_ENTITY.elearning || ['title', 'description', 'content_preview'];
        this.logger.debug(`Resolving translations for ${transformedItems.length} e-learning items in language: ${lang}`);
        transformedItems = await Promise.all(
          transformedItems.map(async (item) => {
            const translatedFields = await this.translationService.resolveEntity(
              'elearning',
              item.id,
              translatableFields,
              lang,
            );
            
            this.logger.debug(`E-learning ${item.id} translations resolved:`, {
              title: translatedFields.title ? 'found' : 'missing',
              description: translatedFields.description ? 'found' : 'missing',
              content_preview: translatedFields.content_preview ? 'found' : 'missing',
            });
            
            // Treat empty strings as missing translations (fallback to source)
            // resolveEntity returns empty string if translation not found, so fallback to source
            const finalTitle = (translatedFields.title && translatedFields.title.trim()) || item.title;
            const finalDescription = (translatedFields.description && translatedFields.description.trim()) 
              ? translatedFields.description.trim()
              : (item.description || '');
            const finalContentPreview = (translatedFields.content_preview && translatedFields.content_preview.trim())
              ? translatedFields.content_preview.trim()
              : (item.contentPreview || '');
            
            return {
              ...item,
              title: finalTitle,
              description: finalDescription,
              contentPreview: finalContentPreview,
            };
          }),
        );
      }

      return {
        success: true,
        data: transformedItems,
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
          ...(dto.category && { contentCategory: dto.category }),
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

      // Update translations if translatable fields changed - do this asynchronously to not block the response
      const hasTranslatableChanges = dto.title !== undefined || dto.description !== undefined || dto.contentPreview !== undefined;
      if (hasTranslatableChanges) {
        const translatableFields = FIELDS_BY_ENTITY.elearning || ['title', 'description', 'content_preview'];
        const translationPayload: Record<string, any> = {
          title: updatedAsset.title || '',
          description: updatedAsset.description || '',
          content_preview: updatedAsset.contentPreview || '',
        };
        
        // Log what we're saving
        const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
        this.logger.log(`Updating translations for e-learning ${updatedAsset.id} with fields: ${fieldsWithValues.join(', ')}`);
        
        // Don't await - let translations happen in background
        this.translationService.saveEntityWithTranslations(
          'elearning',
          updatedAsset.id,
          translationPayload,
          translatableFields,
        ).catch((error) => {
          this.logger.error(`Failed to save translations for elearning:${updatedAsset.id}: ${error.message}`);
        });
      }

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
    if (file.size > this.fileSizeLimits.HR_DOCUMENT) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.fileSizeLimits.HR_DOCUMENT / 1024 / 1024}MB)`,
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.HR_DOCUMENT.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.HR_DOCUMENT.join(', ')}`,
      );
    }

    // Ensure unique title by auto-suffixing duplicates: "Title (2)", "Title (3)", ...
    const baseTitle = dto.title?.trim();
    if (!baseTitle) {
      throw new BadRequestException('Title is required');
    }

    // Find existing titles starting with the same base
    const existingWithSamePrefix = await this.prisma.asset.findMany({
      where: {
        uploadedById: userId,
        category: 'HR_DOCUMENT',
        title: { startsWith: baseTitle },
      },
      select: { title: true },
    });

    if (existingWithSamePrefix.length > 0) {
      // Extract numeric suffixes of the form "Title (N)"
      let maxSuffix = 1;
      const exactMatch = existingWithSamePrefix.some(a => a.title === baseTitle);
      if (exactMatch) {
        maxSuffix = 2; // at least "(2)" if exact base exists
      }

      for (const a of existingWithSamePrefix) {
        const match = a.title.match(new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} \\((\\d+)\\)$`));
        if (match && match[1]) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n) && n >= maxSuffix) {
            maxSuffix = n + 1;
          }
        }
      }

      if (maxSuffix > 1) {
        dto.title = this.buildSuffixedTitle(baseTitle, maxSuffix);
      }
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
          category: 'HR_DOCUMENT', // Content type
          contentCategory: dto.category, // Actual category (Onboarding, etc.)
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

      // Save translatable fields and trigger translation (non-blocking)
      const translatableFields = FIELDS_BY_ENTITY.hr_document || ['title', 'description', 'content_preview'];
      const translationPayload: Record<string, any> = {
        title: asset.title || '',
        description: asset.description || '',
        content_preview: asset.contentPreview || '',
      };
      
      // Log what we're saving
      const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
      this.logger.log(`Saving translations for HR document ${asset.id} with fields: ${fieldsWithValues.join(', ')}`);
      
      if (translationPayload.title || translationPayload.description || translationPayload.content_preview) {
        // Don't await - let it run in background to avoid blocking the response
        this.translationService.saveEntityWithTranslations(
          'hr_document',
          asset.id,
          translationPayload,
          translatableFields,
        ).catch((error) => {
          this.logger.error(`Failed to save translations for HR document ${asset.id}:`, error);
        });
      }

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
    const { page = 1, limit = 20, search, category, status, language, lang } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      category: 'HR_DOCUMENT',
    };

    if (category) {
      where.contentCategory = category;
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

      // Resolve translations if language is specified
      // Always resolve translations to handle cases where source language != target language
      let transformedItems = items.map((item) => this.transformHrDocumentAsset(item));
      if (lang) {
        const translatableFields = FIELDS_BY_ENTITY.hr_document || ['title', 'description', 'content_preview'];
        this.logger.debug(`Resolving translations for ${transformedItems.length} HR documents in language: ${lang}`);
        transformedItems = await Promise.all(
          transformedItems.map(async (item) => {
            const translatedFields = await this.translationService.resolveEntity(
              'hr_document',
              item.id,
              translatableFields,
              lang,
            );
            
            this.logger.debug(`HR document ${item.id} translations resolved:`, {
              title: translatedFields.title ? 'found' : 'missing',
              description: translatedFields.description ? 'found' : 'missing',
              content_preview: translatedFields.content_preview ? 'found' : 'missing',
            });
            
            // Treat empty strings as missing translations (fallback to source)
            // resolveEntity returns empty string if translation not found, so fallback to source
            const finalTitle = (translatedFields.title && translatedFields.title.trim()) || item.title;
            const finalDescription = (translatedFields.description && translatedFields.description.trim()) 
              ? translatedFields.description.trim()
              : (item.description || '');
            const finalContentPreview = (translatedFields.content_preview && translatedFields.content_preview.trim())
              ? translatedFields.content_preview.trim()
              : (item.contentPreview || '');
            
            return {
              ...item,
              title: finalTitle,
              description: finalDescription,
              contentPreview: finalContentPreview,
            };
          }),
        );
      }

      return {
        success: true,
        data: transformedItems,
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
          ...(dto.category && { contentCategory: dto.category }),
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

      // Update translations if translatable fields changed
      const hasTranslatableChanges = dto.title !== undefined || dto.description !== undefined || dto.contentPreview !== undefined;
      if (hasTranslatableChanges) {
        const translatableFields = FIELDS_BY_ENTITY.hr_document || ['title', 'description', 'content_preview'];
        const translationPayload: Record<string, any> = {
          title: updatedAsset.title || '',
          description: updatedAsset.description || '',
          content_preview: updatedAsset.contentPreview || '',
        };
        
        // Log what we're saving
        const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
        this.logger.log(`Updating translations for HR document ${updatedAsset.id} with fields: ${fieldsWithValues.join(', ')}`);
        
        // Don't await - let translations happen in background
        this.translationService.saveEntityWithTranslations(
          'hr_document',
          updatedAsset.id,
          translationPayload,
          translatableFields,
        ).catch((error) => {
          this.logger.error(`Failed to save translations for hr_document:${updatedAsset.id}: ${error.message}`);
        });
      }

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
      if (file.size > this.fileSizeLimits.STATE_POLICY) {
        throw new BadRequestException(
          `File size exceeds maximum allowed (${this.fileSizeLimits.STATE_POLICY / 1024 / 1024}MB)`,
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.STATE_POLICY.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.STATE_POLICY.join(', ')}`,
        );
      }
    }

    // Ensure unique title by auto-suffixing duplicates for state policies within country+region
    const spBaseTitle = dto.title?.trim();
    if (!spBaseTitle) {
      throw new BadRequestException('Title is required');
    }
    const spExisting = await this.prisma.asset.findMany({
      where: {
        category: 'STATE_POLICY',
        country: dto.country,
        region: dto.region,
        title: { startsWith: spBaseTitle },
      },
      select: { title: true },
    });
    if (spExisting.length > 0) {
      let maxSuffix = 1;
      const exactMatch = spExisting.some(a => a.title === spBaseTitle);
      if (exactMatch) maxSuffix = 2;
      for (const a of spExisting) {
        const match = a.title.match(new RegExp(`^${spBaseTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')} \\((\\d+)\\)$`));
        if (match && match[1]) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n) && n >= maxSuffix) maxSuffix = n + 1;
        }
      }
      if (maxSuffix > 1) dto.title = this.buildSuffixedTitle(spBaseTitle, maxSuffix);
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
          category: 'STATE_POLICY', // Content type
          contentCategory: dto.category, // Actual category (Education Policy, etc.)
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

      // Save translatable fields and trigger translation (non-blocking)
      const translatableFields = FIELDS_BY_ENTITY.state_policy || ['title', 'description', 'content_preview'];
      const translationPayload: Record<string, any> = {
        title: asset.title || '',
        description: asset.description || '',
        content_preview: asset.contentPreview || '',
      };
      
      // Log what we're saving
      const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
      this.logger.log(`Saving translations for state policy ${asset.id} with fields: ${fieldsWithValues.join(', ')}`);
      
      if (translationPayload.title || translationPayload.description || translationPayload.content_preview) {
        // Don't await - let it run in background to avoid blocking the response
        this.translationService.saveEntityWithTranslations(
          'state_policy',
          asset.id,
          translationPayload,
          translatableFields,
        ).catch((error) => {
          this.logger.error(`Failed to save translations for state policy ${asset.id}:`, error);
        });
      }

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
      lang,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      category: 'STATE_POLICY',
    };

    if (category) {
      where.contentCategory = category;
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

      // Resolve translations if language is specified
      let transformedItems = items.map((item) => this.transformStatePolicyAsset(item));
      if (lang && lang !== 'en') {
        const translatableFields = FIELDS_BY_ENTITY.state_policy || ['title', 'description', 'content_preview'];
        this.logger.debug(`Resolving translations for ${transformedItems.length} state policies in language: ${lang}`);
        transformedItems = await Promise.all(
          transformedItems.map(async (item) => {
            const translatedFields = await this.translationService.resolveEntity(
              'state_policy',
              item.id,
              translatableFields,
              lang,
            );
            
            // Treat empty strings as missing translations (fallback to source)
            const finalTitle = (translatedFields.title && translatedFields.title.trim()) || item.title;
            const finalDescription = (translatedFields.description && translatedFields.description.trim()) 
              ? translatedFields.description.trim()
              : (item.description || '');
            const finalContentPreview = (translatedFields.content_preview && translatedFields.content_preview.trim())
              ? translatedFields.content_preview.trim()
              : (item.contentPreview || '');
            
            this.logger.debug(`State policy ${item.id} translations resolved:`, {
              title: translatedFields.title ? 'found' : 'missing',
              description: translatedFields.description ? 'found' : 'missing',
              content_preview: translatedFields.content_preview ? 'found' : 'missing',
              finalTitle: finalTitle.substring(0, 50),
              finalDescription: finalDescription.substring(0, 50),
              finalContentPreview: finalContentPreview.substring(0, 50),
            });
            
            return {
              ...item,
              title: finalTitle,
              description: finalDescription,
              contentPreview: finalContentPreview,
            };
          }),
        );
      }

      // Log first item's title to verify translations are in response
      if (transformedItems.length > 0 && lang && lang !== 'en') {
        this.logger.debug(`State policies API response sample (lang=${lang}):`, {
          firstItemId: transformedItems[0].id,
          firstItemTitle: transformedItems[0].title?.substring(0, 50),
          firstItemContentPreview: transformedItems[0].contentPreview?.substring(0, 50),
        });
      }

      return {
        success: true,
        data: transformedItems,
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
      if (dto.category && dto.contentCategory && dto.category !== dto.contentCategory) {
        throw new BadRequestException('category and contentCategory must match');
      }
      const effectiveCategory = dto.category ?? dto.contentCategory;
      const updatedAsset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description && { description: dto.description }),
          ...(dto.contentPreview && { contentPreview: dto.contentPreview }),
          ...(effectiveCategory && { contentCategory: effectiveCategory }),
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
          ...(dto.crawlStatus !== undefined && { crawlStatus: dto.crawlStatus }),
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

      // Update translations if translatable fields changed
      const hasTranslatableChanges = 
        dto.title !== undefined || 
        dto.description !== undefined ||
        dto.contentPreview !== undefined;
      if (hasTranslatableChanges) {
        const translatableFields = FIELDS_BY_ENTITY.state_policy || ['title', 'description', 'content_preview'];
        const translationPayload: Record<string, any> = {
          title: updatedAsset.title || '',
          description: updatedAsset.description || '',
          content_preview: updatedAsset.contentPreview || '',
        };
        
        // Log what we're saving
        const fieldsWithValues = Object.keys(translationPayload).filter(k => translationPayload[k] && translationPayload[k].trim().length > 0);
        this.logger.log(`Updating translations for state policy ${updatedAsset.id} with fields: ${fieldsWithValues.join(', ')}`);
        
        // Don't await - let translations happen in background
        this.translationService.saveEntityWithTranslations(
          'state_policy',
          updatedAsset.id,
          translationPayload,
          translatableFields,
        ).catch((error) => {
          this.logger.error(`Failed to save translations for state_policy:${updatedAsset.id}: ${error.message}`);
        });
      }

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
      category: asset.contentCategory || asset.category, // Use contentCategory, fallback to category for backwards compatibility
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
      category: asset.contentCategory || asset.category, // Use contentCategory, fallback to category for backwards compatibility
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
      category: asset.contentCategory || asset.category, // Use contentCategory, fallback to category for backwards compatibility
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

