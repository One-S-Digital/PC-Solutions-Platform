import { Controller, Get, Param, Res, UseGuards, BadRequestException, Logger, Req, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('upload')
@UseGuards(ClerkAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly prisma: PrismaService,
  ) {}

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
   * Proxy endpoint to download files with proper CORS headers
   * GET /api/upload/download/*
   */
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
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Set content disposition to trigger download
      const filename = storageKey.split('/').pop() || 'download';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', fileStream.contentType || 'application/octet-stream');
      
      // Stream the file
      fileStream.stream.pipe(res);
    } catch (error) {
      this.logger.error('Download failed', error);
      throw new BadRequestException('Failed to download file');
    }
  }
}
