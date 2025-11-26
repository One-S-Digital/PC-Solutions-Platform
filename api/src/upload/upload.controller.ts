import { Controller, Get, Options, Param, Res, UseGuards, BadRequestException, Logger, Req, NotFoundException, Post, UploadedFile, UseInterceptors, Body, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { UploadService } from './upload.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AssetKind } from '@workspace/types';

@Controller('upload')
@UseGuards(ClerkAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload file and create asset record
   * POST /api/upload/file
   */
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('assetKind') assetKind: string,
    @Req() req: Request,
    @Body('conversationId') conversationId?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      if (!req.context?.appUserId) {
        throw new BadRequestException('User not authenticated');
      }

      // Validate assetKind
      const validAssetKind = assetKind as AssetKind;
      if (!Object.values(AssetKind).includes(validAssetKind)) {
        throw new BadRequestException(`Invalid assetKind. Must be one of: ${Object.values(AssetKind).join(', ')}`);
      }

      this.logger.log(`Uploading file: ${file.originalname} (${validAssetKind}) for user ${req.context.appUserId}${conversationId ? ` in conversation ${conversationId}` : ''}`);

      const result = await this.uploadService.uploadFile(file, req.context.appUserId, validAssetKind, conversationId);

      return {
        success: true,
        asset: {
          id: result.asset.id,
          filename: result.asset.filename,
          publicUrl: result.asset.publicUrl,
          url: result.asset.publicUrl, // Alias for compatibility
          size: result.asset.size,
          mimeType: result.asset.mimeType,
          contentType: result.asset.contentType,
          kind: result.asset.kind,
        },
        publicUrl: result.publicUrl,
      };
    } catch (error) {
      this.logger.error('File upload failed', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Get asset metadata by ID
   * GET /api/upload/asset/:id
   */
  @Get('asset/:id')
  async getAsset(@Param('id') assetId: string) {
    try {
      this.logger.log(`Fetching asset: ${assetId}`);
      
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          kind: true,
          filename: true,
          publicUrl: true,
          storageKey: true,
          mimeType: true,
          size: true,
          uploadedById: true,
          category: true,
          title: true,
          description: true,
          contentType: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!asset) {
        this.logger.warn(`Asset not found: ${assetId}`);
        throw new NotFoundException(`Asset not found: ${assetId}`);
      }

      return {
        success: true,
        asset,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch asset ${assetId}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch asset');
    }
  }

  /**
   * Get current user's assets (files)
   * GET /api/upload/my-files
   * Query params:
   * - kind: Filter by AssetKind (optional, e.g., DOCUMENT, CV)
   * - limit: Max number of results (default 50)
   * - offset: Pagination offset (default 0)
   */
  @Get('my-files')
  async getMyFiles(
    @Req() req: Request,
    @Query('kind') kind?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const user = (req as any).user;
      
      if (!user?.id) {
        this.logger.warn('User not found in request context for my-files');
        throw new BadRequestException('User context not found');
      }

      this.logger.log(`Fetching files for user: ${user.id}, kind: ${kind || 'all'}`);

      // Parse kind if provided and valid
      let assetKind: AssetKind | undefined;
      const validKinds = Object.values(AssetKind);
      if (kind && validKinds.includes(kind as AssetKind)) {
        assetKind = kind as AssetKind;
      }

      // Parse and validate limit/offset parameters
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset) || parsedLimit < 0 || parsedOffset < 0) {
        throw new BadRequestException('Invalid limit or offset parameter');
      }

      const assets = await this.uploadService.getUserAssets(user.id, {
        kind: assetKind,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      // Transform to DocumentItem format for frontend compatibility
      const files = assets.map(asset => ({
        id: asset.id,
        name: asset.filename,
        url: asset.publicUrl,
        type: this.mapAssetKindToDocumentType(asset.kind),
        uploadDate: asset.createdAt.toISOString(),
        size: asset.size || 0,
        mimeType: asset.mimeType,
        storageKey: asset.storageKey,
      }));

      return {
        success: true,
        data: files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user files', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch files');
    }
  }

  /**
   * Map AssetKind to DocumentItem type for frontend
   */
  private mapAssetKindToDocumentType(kind: string): string {
    const kindMap: Record<string, string> = {
      'CV': 'CV',
      'DOCUMENT': 'Other',
      'AVATAR': 'Other',
      'LOGO': 'Other',
      'COVER_IMAGE': 'Other',
      'PRODUCT_IMAGE': 'Other',
      'CATALOG_PDF': 'Other',
      'CATALOG_CSV': 'Other',
      'FRONTEND_LOGO': 'Other',
      'FRONTEND_FAVICON': 'Other',
      'FRONTEND_OG_IMAGE': 'Other',
      'ADMIN_LOGO': 'Other',
      'ADMIN_FAVICON': 'Other',
      'ELEARNING': 'Other',
    };
    return kindMap[kind] || 'Other';
  }

  /**
   * Proxy endpoint to download files with proper CORS headers
   * GET /api/upload/download/*
   */
  @Options('download/*')
  async downloadFileOptions(@Res() res: Response) {
    // Handle CORS preflight for video streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache for 24 hours
    res.status(200).send();
  }

  @Get('download/*')
  async downloadFile(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Extract the storage key from the URL path
      // The URL format is: /api/upload/download/{storageKey}
      // Find everything after '/download/'
      const fullPath = req.path;
      const downloadIndex = fullPath.indexOf('/download/');
      
      if (downloadIndex === -1) {
        this.logger.error(`Invalid download path format: ${fullPath}`);
        throw new BadRequestException('Invalid download path');
      }
      
      // Extract everything after '/download/' (this is the storage key)
      const storageKey = fullPath.substring(downloadIndex + '/download/'.length);
      
      if (!storageKey || storageKey.trim() === '') {
        this.logger.error(`Invalid storage key extracted from path: ${fullPath}`);
        throw new BadRequestException('Invalid file path');
      }
      
      this.logger.log(`Downloading file: ${storageKey}`);
      
      // Get the file from R2
      const fileStream = await this.r2Service.getFileStream(storageKey);
      
      // Set CORS headers for video streaming and downloads
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      
      const contentType = fileStream.contentType || 'application/octet-stream';
      const filename = storageKey.split('/').pop() || 'download';
      
      // For video/audio files, use inline to allow streaming playback
      // For other files, use attachment to trigger download
      const isStreamableMedia = contentType.startsWith('video/') || contentType.startsWith('audio/');
      
      if (isStreamableMedia) {
        // Enable video/audio streaming
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for seeking
      } else {
        // Trigger download for documents and other files
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileStream.size.toString());
      
      this.logger.log(`Serving file: ${filename} (${contentType}, ${fileStream.size} bytes, ${isStreamableMedia ? 'inline streaming' : 'download'})`);
      
      // Stream the file
      fileStream.stream.pipe(res);
    } catch (error) {
      this.logger.error('Download failed', error);
      throw new BadRequestException('Failed to download file');
    }
  }
}
