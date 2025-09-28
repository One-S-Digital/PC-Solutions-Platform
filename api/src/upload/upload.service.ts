import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { AssetKind } from '@repo/types';

export interface CreateAssetData {
  kind: AssetKind;
  filename: string;
  publicUrl: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
}

export interface GetAssetsOptions {
  kind?: AssetKind;
  limit?: number;
  offset?: number;
}

export interface CleanupResult {
  deletedCount: number;
  errors: string[];
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: CloudflareR2Service,
  ) {}

  /**
   * Create asset record in database
   */
  async createAsset(data: CreateAssetData) {
    try {
      const asset = await this.prisma.asset.create({
        data: {
          kind: data.kind,
          filename: data.filename,
          publicUrl: data.publicUrl,
          storageKey: data.storageKey,
          mimeType: data.mimeType,
          size: data.size,
          uploadedBy: data.uploadedBy,
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

      this.logger.log(`Asset created: ${asset.id} (${asset.kind})`);
      return asset;
    } catch (error) {
      this.logger.error('Failed to create asset', error);
      throw error;
    }
  }

  /**
   * Get asset by ID with ownership verification
   */
  async getAsset(assetId: string, appUserId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
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

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check ownership (user can only access their own assets unless admin)
    if (asset.uploadedBy !== appUserId) {
      // In a real implementation, you might want to check if user is admin here
      throw new ForbiddenException('Access denied');
    }

    return asset;
  }

  /**
   * Get user's assets with optional filtering
   */
  async getUserAssets(appUserId: string, options: GetAssetsOptions = {}) {
    const { kind, limit = 50, offset = 0 } = options;

    const where = {
      uploadedBy: appUserId,
      ...(kind && { kind }),
    };

    const assets = await this.prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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

    return assets;
  }

  /**
   * Delete asset from database and R2
   */
  async deleteAsset(assetId: string, appUserId: string) {
    // Get asset to verify ownership
    const asset = await this.getAsset(assetId, appUserId);

    try {
      // Delete from database first
      await this.prisma.asset.delete({
        where: { id: assetId },
      });

      // Delete from R2
      await this.r2Service.deleteFile(asset.storageKey);

      this.logger.log(`Asset deleted: ${assetId}`);
    } catch (error) {
      this.logger.error('Failed to delete asset', error);
      throw error;
    }
  }

  /**
   * Update asset metadata
   */
  async updateAsset(assetId: string, appUserId: string, updates: Partial<CreateAssetData>) {
    // Verify ownership
    await this.getAsset(assetId, appUserId);

    const asset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        ...updates,
        // Don't allow changing uploadedBy
        uploadedBy: undefined,
      },
    });

    this.logger.log(`Asset updated: ${assetId}`);
    return asset;
  }

  /**
   * Get asset statistics for user
   */
  async getAssetStats(appUserId: string) {
    const stats = await this.prisma.asset.groupBy({
      by: ['kind'],
      where: { uploadedBy: appUserId },
      _count: { id: true },
      _sum: { size: true },
    });

    const totalSize = await this.prisma.asset.aggregate({
      where: { uploadedBy: appUserId },
      _sum: { size: true },
      _count: { id: true },
    });

    return {
      byKind: stats.map(stat => ({
        kind: stat.kind,
        count: stat._count.id,
        totalSize: stat._sum.size || 0,
      })),
      total: {
        count: totalSize._count.id,
        totalSize: totalSize._sum.size || 0,
      },
    };
  }

  /**
   * Clean up orphaned files (admin only)
   */
  async cleanupOrphanedFiles(): Promise<CleanupResult> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Get all assets from database
      const assets = await this.prisma.asset.findMany({
        select: { id: true, storageKey: true },
      });

      // Check each asset's existence in R2
      for (const asset of assets) {
        try {
          const fileInfo = await this.r2Service.getFileInfo(asset.storageKey);
          if (!fileInfo) {
            // File doesn't exist in R2, remove from database
            await this.prisma.asset.delete({
              where: { id: asset.id },
            });
            deletedCount++;
            this.logger.log(`Cleaned up orphaned asset: ${asset.id}`);
          }
        } catch (error) {
          const errorMsg = `Failed to check asset ${asset.id}: ${(error as Error).message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      this.logger.log(`Cleanup completed: ${deletedCount} orphaned assets removed`);
    } catch (error) {
      const errorMsg = `Cleanup failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      this.logger.error(errorMsg);
    }

    return { deletedCount, errors };
  }

  /**
   * Get assets by organization (for organization logos, covers, etc.)
   */
  async getOrganizationAssets(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        logoAsset: true,
        coverAsset: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const assets = [];
    if (organization.logoAsset) assets.push(organization.logoAsset);
    if (organization.coverAsset) assets.push(organization.coverAsset);

    return assets;
  }

  /**
   * Upload file and create asset record
   */
  async uploadFile(file: Express.Multer.File, uploadedBy: string, kind: AssetKind) {
    try {
      // Upload to R2
      const uploadResult = await this.r2Service.uploadFile(file, kind, uploadedBy);

      // Create asset record
      const asset = await this.createAsset({
        kind,
        filename: file.originalname,
        publicUrl: uploadResult.url,
        storageKey: uploadResult.key,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy,
      });

      return {
        asset,
        publicUrl: uploadResult.url,
      };
    } catch (error) {
      this.logger.error('File upload failed', error);
      throw error;
    }
  }

  /**
   * Associate asset with organization
   */
  async associateAssetWithOrganization(
    assetId: string,
    organizationId: string,
    associationType: 'logo' | 'cover',
    userId: string,
  ) {
    // Verify asset ownership
    await this.getAsset(assetId, userId);

    // Verify organization access (user should be part of the organization)
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!organization || organization.members.length === 0) {
      throw new ForbiddenException('Access denied to organization');
    }

    // Update organization with asset reference
    const updateData = associationType === 'logo' 
      ? { logoAssetId: assetId }
      : { coverAssetId: assetId };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    this.logger.log(`Asset ${assetId} associated with organization ${organizationId} as ${associationType}`);
    return { success: true };
  }
}