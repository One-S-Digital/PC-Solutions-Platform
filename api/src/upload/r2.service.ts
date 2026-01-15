import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const IMMUTABLE_PUBLIC_CACHE_CONTROL = `public, max-age=${ONE_YEAR_SECONDS}, immutable`;

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
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'pc-solutions-assets';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || 'https://assets.pc-solutions.com';

    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.error('R2 configuration incomplete. Upload functionality will not work.');
      this.logger.error('Missing environment variables:', {
        R2_ENDPOINT: !!endpoint,
        R2_ACCESS_KEY_ID: !!accessKeyId,
        R2_SECRET_ACCESS_KEY: !!secretAccessKey,
      });
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Upload file directly from server
   */
  async uploadFile(
    file: Express.Multer.File,
    category: string = 'general',
  ): Promise<UploadResult> {
    try {
      // Validate file first
      this.validateFile(file);
      
      // Check if R2 is properly configured
      if (!this.isConfigured()) {
        // Development mode fallback: store locally
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment) {
          this.logger.warn('⚠️ R2 not configured. Using development fallback (local storage simulation)');
          return this.uploadFileLocalFallback(file, category);
        }
        throw new BadRequestException('File storage is not properly configured. Please contact administrator.');
      }

      const key = this.generateStorageKey(file.originalname, category);
      const cacheControl = file.mimetype?.startsWith('image/') ? IMMUTABLE_PUBLIC_CACHE_CONTROL : undefined;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: cacheControl,
        Metadata: {
          'original-filename': file.originalname,
          'category': category,
        },
      });

      this.logger.log(`Uploading file: ${file.originalname} (${category}) to ${key}`);
      
      await this.s3Client.send(command);
      
      const publicUrl = `${this.publicUrl}/${key}`;
      
      this.logger.log(`File uploaded successfully: ${key}`);
      
      return {
        key,
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error('Failed to upload file', {
        error: error.message,
        filename: file?.originalname,
        category,
        stack: error.stack,
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
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
      throw new BadRequestException('Failed to delete file from storage');
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
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File): void {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    this.logger.log(`File validation passed: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
  }

  /**
   * Generate storage key for file organization
   */
  private generateStorageKey(filename: string, category: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${category}/${timestamp}-${sanitizedFilename}`;
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

  /**
   * Development fallback: simulate file upload without R2
   * This stores file metadata in memory and returns mock URLs
   */
  private uploadFileLocalFallback(
    file: Express.Multer.File,
    category: string,
  ): UploadResult {
    const key = this.generateStorageKey(file.originalname, category);
    const mockUrl = `http://localhost:3000/uploads/${key}`;
    
    this.logger.log(`📦 Development fallback: Simulating upload for ${file.originalname}`);
    this.logger.log(`   File size: ${file.size} bytes`);
    this.logger.log(`   Mock URL: ${mockUrl}`);
    this.logger.log(`   ⚠️  Note: File is NOT actually stored. Configure R2 for production.`);
    
    return {
      key,
      url: mockUrl,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Check if R2 service is properly configured
   */
  isConfigured(): boolean {
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    
    return !!(endpoint && accessKeyId && secretAccessKey);
  }

  /**
   * Test R2 connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list objects in the bucket to test connection
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'test-connection-key-that-does-not-exist',
      });
      
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      // If we get a "NoSuchKey" error, the connection is working
      if (error.name === 'NoSuchKey') {
        return true;
      }
      
      this.logger.error('R2 connection test failed', error);
      return false;
    }
  }
}