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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudflareR2Service, PresignedUploadData } from './cloudflare-r2.service';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, AssetKind } from '@prisma/client';
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
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly uploadService: UploadService,
  ) {}

  @Post('presigned')
  @UploadThrottle()
  @ApiOperation({ summary: 'Generate presigned URL for direct upload' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  async generatePresignedUpload(
    @Body() presignedUploadDto: PresignedUploadDto,
    @Request() req,
  ): Promise<PresignedUploadData> {
    const { filename, mimeType, assetKind } = presignedUploadDto;
    const userId = req.user.id;

    // Validate file type and size
    const mockFile = {
      originalname: filename,
      mimetype: mimeType,
      size: 0, // We'll validate size on client side
    } as Express.Multer.File;

    this.r2Service.validateFile(mockFile, assetKind);

    return this.r2Service.generatePresignedUpload(filename, mimeType, assetKind, userId);
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const { assetKind } = uploadFileDto;
    const userId = req.user.id;

    // Validate file
    this.r2Service.validateFile(file, assetKind);

    // Upload to R2
    const uploadResult = await this.r2Service.uploadFile(file, assetKind, userId);

    // Save to database
    const asset = await this.uploadService.createAsset({
      kind: assetKind,
      filename: uploadResult.filename,
      publicUrl: uploadResult.url,
      storageKey: uploadResult.key,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      uploadedBy: userId,
    });

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
  }

  @Get('asset/:id')
  @ApiOperation({ summary: 'Get asset information' })
  @ApiResponse({ status: 200, description: 'Asset information retrieved successfully' })
  async getAsset(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const asset = await this.uploadService.getAsset(id, userId);

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
  }

  @Get('assets')
  @ApiOperation({ summary: 'Get user assets' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  async getUserAssets(
    @Request() req,
    @Body() query: { kind?: AssetKind; limit?: number; offset?: number } = {},
  ) {
    const userId = req.user.id;
    const { kind, limit = 50, offset = 0 } = query;

    const assets = await this.uploadService.getUserAssets(userId, { kind, limit, offset });

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
    };
  }

  @Delete('asset/:id')
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  async deleteAsset(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    
    // Get asset to verify ownership and get storage key
    const asset = await this.uploadService.getAsset(id, userId);
    
    // Delete from R2
    await this.r2Service.deleteFile(asset.storageKey);
    
    // Delete from database
    await this.uploadService.deleteAsset(id, userId);

    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Generate download URL for asset' })
  @ApiResponse({ status: 200, description: 'Download URL generated successfully' })
  async generateDownloadUrl(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    
    // Get asset to verify ownership
    const asset = await this.uploadService.getAsset(id, userId);
    
    // Generate presigned download URL
    const downloadUrl = await this.r2Service.generatePresignedDownloadUrl(asset.storageKey);

    return {
      success: true,
      downloadUrl,
      expiresIn: 3600, // 1 hour
    };
  }

  @Post('admin/cleanup')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Clean up orphaned files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupOrphanedFiles(@Request() req) {
    const result = await this.uploadService.cleanupOrphanedFiles();

    return {
      success: true,
      message: 'Cleanup completed',
      deletedCount: result.deletedCount,
      errors: result.errors,
    };
  }
}