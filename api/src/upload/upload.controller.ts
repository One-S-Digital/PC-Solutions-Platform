import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Body,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudflareR2Service, PresignedUploadData } from './cloudflare-r2.service';
import { UploadService } from './upload.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AssetKind } from '@repo/types';
import { UploadThrottle } from '../common/decorators/throttle.decorator';

export class PresignedUploadDto {
  filename: string;
  mimeType: string;
  assetKind: AssetKind;
}

export class UploadFileDto {
  assetKind: AssetKind;
}

@ApiTags('Upload')
@Controller('upload')
@UseGuards(RolesGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly uploadService: UploadService,
  ) {}

  @Post('presigned')
  @UploadThrottle()
  @ApiOperation({ summary: 'Generate presigned URL for direct upload' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or file type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generatePresignedUpload(
    @Body() presignedUploadDto: PresignedUploadDto,
    @Request() req,
  ): Promise<PresignedUploadData> {
    const { filename, mimeType, assetKind } = presignedUploadDto;
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Generating presigned URL for user ${appUserId}: ${filename} (${assetKind})`);

    try {
      // Validate file type and size
      const mockFile = {
        originalname: filename,
        mimetype: mimeType,
        size: 0, // We'll validate size on client side
      } as Express.Multer.File;

      this.r2Service.validateFile(mockFile, assetKind);

      const result = await this.r2Service.generatePresignedUpload(filename, mimeType, assetKind, appUserId);
      
      this.logger.log(`Presigned URL generated successfully for ${filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${filename}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException('Failed to generate upload URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('file')
  @UploadThrottle()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file directly to server' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        assetKind: {
          type: 'string',
          enum: Object.values(AssetKind),
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const { assetKind } = uploadFileDto;
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Uploading file for user ${appUserId}: ${file.originalname} (${assetKind}, ${file.size} bytes)`);

    try {
      // Validate file
      this.r2Service.validateFile(file, assetKind);

      // Check if R2 is configured
      if (!this.r2Service.isConfigured()) {
        this.logger.error('R2 service is not properly configured');
        throw new HttpException('Storage service is not available', HttpStatus.SERVICE_UNAVAILABLE);
      }

      // Upload to R2
      const uploadResult = await this.r2Service.uploadFile(file, assetKind, appUserId);

      // Save to database
      const asset = await this.uploadService.createAsset({
        kind: assetKind,
        filename: uploadResult.filename,
        publicUrl: uploadResult.url,
        storageKey: uploadResult.key,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        uploadedById: appUserId,
      });

      this.logger.log(`File uploaded successfully: ${asset.id} (${uploadResult.key})`);

      return {
        success: true,
        message: 'File uploaded successfully',
        asset: {
          id: asset.id,
          kind: asset.kind,
          filename: asset.filename,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          size: asset.size,
          createdAt: asset.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${file.originalname}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException('Failed to upload file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('asset/:id')
  @ApiOperation({ summary: 'Get asset information' })
  @ApiResponse({ status: 200, description: 'Asset information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getAsset(@Param('id') id: string, @Request() req) {
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Getting asset ${id} for user ${appUserId}`);

    try {
      const asset = await this.uploadService.getAsset(id, appUserId);

      return {
        success: true,
        asset: {
          id: asset.id,
          kind: asset.kind,
          filename: asset.filename,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          size: asset.size,
          createdAt: asset.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get asset ${id}:`, error);
      throw error;
    }
  }

  @Get('assets')
  @ApiOperation({ summary: 'Get user assets' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserAssets(
    @Request() req,
    @Body() query: { kind?: AssetKind; limit?: number; offset?: number } = {},
  ) {
    const appUserId = req.context?.appUserId;
    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }
    const { kind, limit = 50, offset = 0 } = query;

    this.logger.log(`Getting assets for user ${appUserId} (kind: ${kind}, limit: ${limit}, offset: ${offset})`);

    try {
      const assets = await this.uploadService.getUserAssets(appUserId, { kind, limit, offset });

      return {
        success: true,
        assets: assets.map(asset => ({
          id: asset.id,
          kind: asset.kind,
          filename: asset.filename,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          size: asset.size,
          createdAt: asset.createdAt,
        })),
        total: assets.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get assets for user ${appUserId}:`, error);
      throw new HttpException('Failed to retrieve assets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('asset/:id')
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteAsset(@Param('id') id: string, @Request() req) {
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Deleting asset ${id} for user ${appUserId}`);

    try {
      // Get asset to verify ownership and get storage key
      const asset = await this.uploadService.getAsset(id, appUserId);
      
      // Delete from R2
      await this.r2Service.deleteFile(asset.storageKey);
      
      // Delete from database
      await this.uploadService.deleteAsset(id, appUserId);

      this.logger.log(`Asset deleted successfully: ${id}`);

      return {
        success: true,
        message: 'Asset deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete asset ${id}:`, error);
      throw error;
    }
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Generate download URL for asset' })
  @ApiResponse({ status: 200, description: 'Download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async generateDownloadUrl(@Param('id') id: string, @Request() req) {
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Generating download URL for asset ${id} (user: ${appUserId})`);

    try {
      // Get asset to verify ownership
      const asset = await this.uploadService.getAsset(id, appUserId);
      
      // Generate presigned download URL
      const downloadUrl = await this.r2Service.generatePresignedDownloadUrl(asset.storageKey);

      return {
        success: true,
        downloadUrl,
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      this.logger.error(`Failed to generate download URL for asset ${id}:`, error);
      throw error;
    }
  }

  @Post('admin/cleanup')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Clean up orphaned files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async cleanupOrphanedFiles(@Request() req) {
    const appUserId = req.context?.appUserId;

    if (!appUserId) {
      throw new BadRequestException('Missing authenticated user');
    }

    this.logger.log(`Starting orphaned files cleanup (initiated by user: ${appUserId})`);

    try {
      const result = await this.uploadService.cleanupOrphanedFiles();

      this.logger.log(`Cleanup completed: ${result.deletedCount} files deleted, ${result.errors.length} errors`);

      return {
        success: true,
        message: 'Cleanup completed',
        deletedCount: result.deletedCount,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned files:', error);
      throw new HttpException('Failed to cleanup orphaned files', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check upload service health' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth() {
    try {
      const isConfigured = this.r2Service.isConfigured();
      const connectionTest = isConfigured ? await this.r2Service.testConnection() : false;

      return {
        success: true,
        status: 'healthy',
        r2: {
          configured: isConfigured,
          connected: connectionTest,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}