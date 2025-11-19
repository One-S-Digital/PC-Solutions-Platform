import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentItemDto, UpdateContentItemDto, CreateContentCategoryDto } from './dto/content-management.dto';
import { ContentItem, ContentCategory } from '@prisma/client';
import { R2Service } from '../upload/r2.service';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';

@Injectable()
export class ContentManagementService {
  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
    private translationService: TranslationService,
  ) {}

  async getContentItems(options: {
    page: number;
    limit: number;
    category?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: ContentItem[]; total: number; page: number; limit: number }> {
    const { page, limit, category, status, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getContentItem(id: string): Promise<ContentItem> {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Content item not found');
    }

    return item;
  }

  async createContentItem(
    createDto: CreateContentItemDto,
    file?: Express.Multer.File,
  ): Promise<ContentItem> {
    let fileUrl: string | undefined;
    let fileSize: number | undefined;
    let mimeType: string | undefined;
    let uploadResult: { url: string; key: string } | undefined;

    if (file) {
      // Upload file to R2
      uploadResult = await this.r2Service.uploadFile(file, 'content');
      fileUrl = uploadResult.url;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    try {
      const item = await this.prisma.contentItem.create({
        data: {
          ...createDto,
          fileUrl,
          fileSize,
          mimeType,
        },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Save translatable fields and trigger translation for content items
      const translatableFields = FIELDS_BY_ENTITY.content || ['title', 'body', 'excerpt', 'description'];
      const translationPayload: Record<string, any> = {
        title: item.title as any,
        description: (item as any).description || '',
        body: (item as any).body || '',
        excerpt: (item as any).excerpt || '',
      };

      if (translationPayload.title || translationPayload.description || translationPayload.body || translationPayload.excerpt) {
        await this.translationService.saveEntityWithTranslations(
          'content',
          item.id,
          translationPayload,
          translatableFields,
        );
      }

      return item;
    } catch (error) {
      // If DB operation fails and we uploaded a file, clean it up
      if (uploadResult) {
        try {
          await this.r2Service.deleteFile(uploadResult.url);
        } catch (deleteError) {
          console.error('Failed to delete orphaned file:', deleteError);
        }
      }
      throw error;
    }
  }

  async updateContentItem(
    id: string,
    updateDto: UpdateContentItemDto,
    file?: Express.Multer.File,
  ): Promise<ContentItem> {
    const existingItem = await this.prisma.contentItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      throw new NotFoundException('Content item not found');
    }

    let fileUrl = existingItem.fileUrl;
    let fileSize = existingItem.fileSize;
    let mimeType = existingItem.mimeType;

    if (file) {
      // Delete old file if exists
      if (existingItem.fileUrl) {
        await this.r2Service.deleteFile(existingItem.fileUrl);
      }

      // Upload new file to R2
      const uploadResult = await this.r2Service.uploadFile(file, 'content');
      fileUrl = uploadResult.url;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const updated = await this.prisma.contentItem.update({
      where: { id },
      data: {
        ...updateDto,
        fileUrl,
        fileSize,
        mimeType,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update translations if translatable fields changed
    const translatableFields = FIELDS_BY_ENTITY.content || ['title', 'body', 'excerpt', 'description'];
    const hasTranslatableChanges =
      (updateDto as any).title !== undefined ||
      (updateDto as any).description !== undefined ||
      (updateDto as any).body !== undefined ||
      (updateDto as any).excerpt !== undefined;

    if (hasTranslatableChanges) {
      const translationPayload: Record<string, any> = {
        title: updated.title as any,
        description: (updated as any).description || '',
        body: (updated as any).body || '',
        excerpt: (updated as any).excerpt || '',
      };

      await this.translationService.saveEntityWithTranslations(
        'content',
        updated.id,
        translationPayload,
        translatableFields,
      );
    }

    return updated;
  }

  async deleteContentItem(id: string): Promise<void> {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Content item not found');
    }

    // Delete file from R2 if exists
    if (item.fileUrl) {
      await this.r2Service.deleteFile(item.fileUrl);
    }

    await this.prisma.contentItem.delete({
      where: { id },
    });
  }

  async getContentCategories(): Promise<ContentCategory[]> {
    return this.prisma.contentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createContentCategory(createDto: CreateContentCategoryDto): Promise<ContentCategory> {
    return this.prisma.contentCategory.create({
      data: createDto,
    });
  }

  async updateContentCategory(
    id: string,
    updateDto: CreateContentCategoryDto,
  ): Promise<ContentCategory> {
    const category = await this.prisma.contentCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Content category not found');
    }

    return this.prisma.contentCategory.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteContentCategory(id: string): Promise<void> {
    const category = await this.prisma.contentCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Content category not found');
    }

    // Check if category has content items
    const itemCount = await this.prisma.contentItem.count({
      where: { category: category.name },
    });

    if (itemCount > 0) {
      throw new BadRequestException('Cannot delete category with existing content items');
    }

    await this.prisma.contentCategory.delete({
      where: { id },
    });
  }

  async getContentDashboard(): Promise<any> {
    const [totalItems, publishedItems, draftItems, archivedItems, categories] = await Promise.all([
      this.prisma.contentItem.count(),
      this.prisma.contentItem.count({ where: { status: 'published' } }),
      this.prisma.contentItem.count({ where: { status: 'draft' } }),
      this.prisma.contentItem.count({ where: { status: 'archived' } }),
      this.prisma.contentCategory.count({ where: { isActive: true } }),
    ]);

    const recentItems = await this.prisma.contentItem.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const categoryStats = await this.prisma.contentItem.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalItems,
      publishedItems,
      draftItems,
      archivedItems,
      categories,
      recentItems,
      categoryStats,
    };
  }

  async publishContentItem(id: string): Promise<ContentItem> {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Content item not found');
    }

    return this.prisma.contentItem.update({
      where: { id },
      data: { status: 'published' },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async archiveContentItem(id: string): Promise<ContentItem> {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Content item not found');
    }

    return this.prisma.contentItem.update({
      where: { id },
      data: { status: 'archived' },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}