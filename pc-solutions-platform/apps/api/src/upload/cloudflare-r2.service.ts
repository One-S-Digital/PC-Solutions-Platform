import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AssetKind } from '@prisma/client';

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignedUploadData {
  url: string;
  fields: Record<string, string>;
  key: string;
}

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'pc-solutions-assets';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || 'https://assets.pc-solutions.com';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Generate a presigned URL for direct client uploads
   */
  async generatePresignedUpload(
    filename: string,
    mimeType: string,
    assetKind: AssetKind,
    userId: string,
  ): Promise<PresignedUploadData> {
    const key = this.generateStorageKey(filename, assetKind, userId);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        'uploaded-by': userId,
        'asset-kind': assetKind,
        'original-filename': filename,
      },
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
      
      return {
        url,
        fields: {
          'Content-Type': mimeType,
        },
        key,
      };
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', error);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  /**
   * Upload file directly from server
   */
  async uploadFile(
    file: Express.Multer.File,
    assetKind: AssetKind,
    userId: string,
  ): Promise<UploadResult> {
    const key = this.generateStorageKey(file.originalname, assetKind, userId);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'uploaded-by': userId,
        'asset-kind': assetKind,
        'original-filename': file.originalname,
      },
    });

    try {
      await this.s3Client.send(command);
      
      const publicUrl = `${this.publicUrl}/${key}`;
      
      return {
        key,
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Generate a presigned URL for file access
   */
  async generatePresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error('Failed to generate download URL', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Validate file type and size based on asset kind
   */
  validateFile(file: Express.Multer.File, assetKind: AssetKind): void {
    const maxSizes = {
      AVATAR: 5 * 1024 * 1024, // 5MB
      LOGO: 5 * 1024 * 1024, // 5MB
      COVER_IMAGE: 10 * 1024 * 1024, // 10MB
      PRODUCT_IMAGE: 10 * 1024 * 1024, // 10MB
      DOCUMENT: 50 * 1024 * 1024, // 50MB
      CV: 10 * 1024 * 1024, // 10MB
    };

    const allowedTypes = {
      AVATAR: ['image/jpeg', 'image/png', 'image/webp'],
      LOGO: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      COVER_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      PRODUCT_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      CV: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };

    const maxSize = maxSizes[assetKind];
    const allowedMimeTypes = allowedTypes[assetKind];

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed for ${assetKind}`);
    }
  }

  /**
   * Generate storage key for file organization
   */
  private generateStorageKey(filename: string, assetKind: AssetKind, userId: string): string {
    const timestamp = Date.now();
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${assetKind.toLowerCase()}/${userId}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Get file content as string
   */
  async getFileContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File body is empty');
      }

      // Convert stream to string
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      return buffer.toString('utf-8');
    } catch (error) {
      this.logger.error('Failed to get file content', error);
      throw new BadRequestException('Failed to get file content');
    }
  }

  /**
   * Get file info without downloading
   */
  async getFileInfo(key: string): Promise<{ size: number; mimeType: string; lastModified: Date } | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get file info', error);
      return null;
    }
  }
}