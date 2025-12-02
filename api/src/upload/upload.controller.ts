import { Controller, Get, Options, Param, Res, UseGuards, BadRequestException, Logger, Req, NotFoundException, Post, UploadedFile, UseInterceptors, Body, Query, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { UploadService } from './upload.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ClamAVService } from '../security/clamav.service';
import { MimeValidationService } from '../security/mime-validation.service';
import { AssetKind } from '@workspace/types';
import { UploadThrottle } from '../common/decorators/throttle.decorator';

@Controller('upload')
@UseGuards(ClerkAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private readonly allowedOrigins: string[];
  private readonly malwareScanningEnabled: boolean;

  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly clamAVService: ClamAVService,
    private readonly mimeValidationService: MimeValidationService,
  ) {
    // Configure allowed origins for CORS
    const adminOrigin = this.configService.get<string>('ADMIN_ORIGIN');
    const appOrigin = this.configService.get<string>('APP_ORIGIN');
    this.allowedOrigins = [adminOrigin, appOrigin].filter((origin): origin is string => !!origin);
    
    // Check if malware scanning is enabled (defaults to true in production)
    const scanningConfig = this.configService.get<string>('MALWARE_SCANNING_ENABLED', 'true');
    this.malwareScanningEnabled = scanningConfig.toLowerCase() !== 'false';
    
    this.logger.log(`Upload security initialized - CORS origins: ${this.allowedOrigins.join(', ')}, Malware scanning: ${this.malwareScanningEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Verify CORS origin is allowed
   */
  private isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return false;
    
    // Allow all localhost origins in development
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return true;
      }
    }
    
    // In production, check against configured origins
    return this.allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed));
  }

  /**
   * Set restrictive CORS headers for upload/download endpoints
   */
  private setCorsHeaders(req: Request, res: Response): void {
    const origin = req.headers.origin;
    
    if (this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      res.setHeader('Access-Control-Max-Age', '3600');
    } else {
      // Still set basic headers for error responses
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    }
  }

  /**
   * Upload file and create asset record with security scanning
   * POST /api/upload/file
   */
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @UploadThrottle()
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('assetKind') assetKind: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body('conversationId') conversationId?: string,
  ) {
    try {
      // Set restrictive CORS headers
      this.setCorsHeaders(req, res);

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

      this.logger.log(`🔒 Secure upload initiated: ${file.originalname} (${validAssetKind}) for user ${req.context.appUserId}${conversationId ? ` in conversation ${conversationId}` : ''}`);

      // Step 1: MIME type validation
      const mimeValidation = await this.mimeValidationService.validateFile(file.buffer, file.originalname);
      if (!mimeValidation.isValid) {
        this.logger.warn(`❌ MIME validation failed: ${mimeValidation.reason}`);
        throw new BadRequestException(`Invalid file: ${mimeValidation.reason}`);
      }

      // Step 2: Malware scanning (if enabled)
      if (this.malwareScanningEnabled) {
        try {
          this.logger.log(`🛡️ Scanning file for malware: ${file.originalname}`);
          const isClean = await this.clamAVService.scanBuffer(file.buffer);
          
          if (!isClean) {
            this.logger.warn(`⚠️ MALWARE DETECTED in file: ${file.originalname} by user ${req.context.appUserId}`);
            throw new BadRequestException('File contains malware. Upload blocked for security reasons.');
          }
          
          this.logger.log(`✅ File clean: ${file.originalname}`);
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error; // Re-throw malware detection errors
          }
          
          // Log error but continue upload if scanner is unavailable (graceful degradation)
          // In production, you might want to block uploads if scanner is down
          this.logger.error(`⚠️ Malware scan failed (scanner unavailable): ${file.originalname}`, error);
          
          // Uncomment to block uploads when scanner is unavailable:
          // throw new ServiceUnavailableException('Security scanner unavailable. Please try again later.');
        }
      }

      // Step 3: Upload file
      const result = await this.uploadService.uploadFile(file, req.context.appUserId, validAssetKind, conversationId);

      this.logger.log(`✅ Secure upload completed: ${file.originalname}`);

      return res.status(201).json({
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
      });
    } catch (error) {
      this.logger.error('❌ File upload failed', error);
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
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
<<<<<<< HEAD
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
=======
   * Proxy endpoint to download files with authentication and authorization
>>>>>>> ee5d98c46 (Updated various tasks)
   * GET /api/upload/download/*
   */
  @Options('download/*')
  async downloadFileOptions(@Req() req: Request, @Res() res: Response) {
    // Set restrictive CORS headers for preflight
    this.setCorsHeaders(req, res);
    res.status(200).send();
  }

  @Get('download/*')
  @UploadThrottle()
  async downloadFile(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Set restrictive CORS headers
      this.setCorsHeaders(req, res);

      // Verify authentication
      if (!req.context?.appUserId) {
        this.logger.warn(`❌ Unauthorized download attempt`);
        throw new BadRequestException('User not authenticated');
      }

      // Extract the storage key from the URL path
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
      
      // Verify user has access to this file (ownership or admin)
      const asset = await this.uploadService.verifyFileAccess(
        storageKey, 
        req.context.appUserId,
        req.context.role
      );
      
      this.logger.log(`🔒 Authorized download: ${storageKey} by user ${req.context.appUserId}`);
      
      // Get the file from R2
      const fileStream = await this.r2Service.getFileStream(storageKey);
      
      const contentType = fileStream.contentType || 'application/octet-stream';
      const filename = asset.filename || storageKey.split('/').pop() || 'download';
      
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
      
      this.logger.log(`✅ Serving file: ${filename} (${contentType}, ${fileStream.size} bytes, ${isStreamableMedia ? 'inline streaming' : 'download'})`);
      
      // Stream the file
      fileStream.stream.pipe(res);
    } catch (error) {
      this.logger.error('❌ Download failed', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to download file');
    }
  }
}
