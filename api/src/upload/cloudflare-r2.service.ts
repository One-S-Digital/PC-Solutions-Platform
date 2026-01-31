import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AssetKind } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { Readable } from 'stream';

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  etag?: string;
  checksum?: string;
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
   * Generate a presigned URL for direct client uploads
   */
  async generatePresignedUpload(
    filename: string,
    mimeType: string,
    assetKind: AssetKind,
    appUserId: string,
  ): Promise<PresignedUploadData> {
    const key = this.generateStorageKey(filename, assetKind, appUserId, undefined);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        'uploaded-by': appUserId,
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
   * Upload file directly from server with checksum verification
   * Supports both memory storage (file.buffer) and disk storage (file.path)
   * Uses streaming for disk storage to avoid loading large files into memory
   */
  async uploadFile(
    file: Express.Multer.File,
    assetKind: AssetKind,
    appUserId: string,
    subcategory?: string,
    conversationId?: string,
  ): Promise<UploadResult> {
    try {
      // Validate file first
      this.validateFile(file, assetKind);
      
      // Check if R2 is properly configured
      if (!this.isConfigured()) {
        // Development mode fallback: store locally
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment) {
          this.logger.warn('⚠️ R2 not configured. Using development fallback (local storage simulation)');
          return this.uploadFileLocalFallback(file, assetKind, appUserId, subcategory, conversationId);
        }
        throw new BadRequestException('File storage is not properly configured. Please contact administrator.');
      }

      const key = this.generateStorageKey(file.originalname, assetKind, appUserId, subcategory, conversationId);
      
      let fileBody: Buffer | Readable;
      let checksum: string;
      
      if (file.buffer) {
        // Memory storage - file is already in memory (small files)
        fileBody = file.buffer;
        checksum = this.calculateChecksum(file.buffer);
        this.logger.log(`Using memory storage for ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } else if (file.path) {
        // Disk storage - stream file directly to R2 (large files)
        this.logger.log(`Using disk storage for ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB), streaming from ${file.path}`);
        
        // Calculate checksum by streaming (memory efficient)
        const hash = createHash('sha256');
        const checksumStream = fs.createReadStream(file.path);
        for await (const chunk of checksumStream) {
          hash.update(chunk);
        }
        checksum = hash.digest('base64');
        
        // Create fresh read stream for upload
        fileBody = fs.createReadStream(file.path);
      } else {
        throw new BadRequestException('File data not available');
      }
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBody,
        ContentType: file.mimetype,
        ContentLength: file.size, // Required for streaming
        ChecksumSHA256: checksum, // S3-compatible checksum
        Metadata: {
          'uploaded-by': appUserId,
          'asset-kind': assetKind,
          'original-filename': file.originalname,
          'checksum-sha256': checksum,
        },
      });

      this.logger.log(`Uploading file: ${file.originalname} (${assetKind}) to ${key} with checksum: ${checksum.substring(0, 16)}...`);
      
      await this.s3Client.send(command);
      
      // Clean up temp file if using disk storage
      if (file.path) {
        try {
          await fs.promises.unlink(file.path);
          this.logger.log(`Cleaned up temp file: ${file.path}`);
        } catch (cleanupError) {
          this.logger.warn(`Failed to clean up temp file ${file.path}:`, cleanupError);
        }
      }
      
      // Verify upload by fetching ETag
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const headResponse = await this.s3Client.send(headCommand);
      const etag = headResponse.ETag?.replace(/"/g, '') || '';
      
      const publicUrl = `${this.publicUrl}/${key}`;
      
      this.logger.log(`File uploaded successfully: ${key}, ETag: ${etag}`);
      
      return {
        key,
        url: publicUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        etag,
        checksum,
      };
    } catch (error) {
      // Clean up temp file on error if using disk storage
      if (file.path) {
        try {
          await fs.promises.unlink(file.path);
        } catch (cleanupError) {
          this.logger.warn(`Failed to clean up temp file on error:`, cleanupError);
        }
      }
      
      this.logger.error('Failed to upload file', {
        error: error.message,
        filename: file?.originalname,
        assetKind,
        userId: appUserId,
        stack: error.stack,
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Calculate SHA-256 checksum (base64 encoded for S3 compatibility)
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('base64');
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
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
   * Validate file type and size based on asset kind
   */
  validateFile(file: Express.Multer.File, assetKind: AssetKind): void {
    // Use UPLOAD_MAX_MB env var for e-learning (videos can be large), default to 500MB
    // Validate to avoid NaN or invalid values disabling size checks
    const rawUploadMaxMb = this.configService.get<string>('UPLOAD_MAX_MB');
    const uploadMaxMb = Number(rawUploadMaxMb);
    const effectiveUploadMaxMb =
      Number.isFinite(uploadMaxMb) && uploadMaxMb > 0 ? uploadMaxMb : 500;
    
    if (rawUploadMaxMb && (!Number.isFinite(uploadMaxMb) || uploadMaxMb <= 0)) {
      this.logger.warn(`Invalid UPLOAD_MAX_MB="${rawUploadMaxMb}". Falling back to 500MB.`);
    }
    
    const maxSizes = {
      AVATAR: 5 * 1024 * 1024, // 5MB
      LOGO: 5 * 1024 * 1024, // 5MB
      COVER_IMAGE: 10 * 1024 * 1024, // 10MB
      PRODUCT_IMAGE: 10 * 1024 * 1024, // 10MB
      DOCUMENT: 50 * 1024 * 1024, // 50MB
      CV: 10 * 1024 * 1024, // 10MB
      CATALOG_PDF: 50 * 1024 * 1024, // 50MB
      CATALOG_CSV: 10 * 1024 * 1024, // 10MB
      FRONTEND_LOGO: 5 * 1024 * 1024, // 5MB
      FRONTEND_FAVICON: 1 * 1024 * 1024, // 1MB
      FRONTEND_OG_IMAGE: 5 * 1024 * 1024, // 5MB
      ADMIN_LOGO: 5 * 1024 * 1024, // 5MB
      ADMIN_FAVICON: 1 * 1024 * 1024, // 1MB
      SIDEBAR_LOGO: 5 * 1024 * 1024, // 5MB
      ELEARNING: effectiveUploadMaxMb * 1024 * 1024, // Use env var - for large video uploads
      COMPANY_PROFILE_DOC: 50 * 1024 * 1024, // 50MB - for catalogs, company profiles
    };

    const allowedTypes = {
      AVATAR: ['image/jpeg', 'image/png', 'image/webp'],
      LOGO: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      COVER_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      PRODUCT_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      CV: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      CATALOG_PDF: ['application/pdf'],
      CATALOG_CSV: ['text/csv', 'application/csv'],
      FRONTEND_LOGO: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      FRONTEND_FAVICON: ['image/x-icon', 'image/png', 'image/jpeg'],
      FRONTEND_OG_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      ADMIN_LOGO: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      ADMIN_FAVICON: ['image/x-icon', 'image/png', 'image/jpeg'],
      SIDEBAR_LOGO: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      ELEARNING: [
        'application/pdf',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo', // AVI (legacy MIME type)
        'video/vnd.avi', // AVI (detected by file-type library v21+)
        'video/webm',
        'video/x-m4v', // M4V files
        'video/3gpp', // 3GP files
        'video/ogg', // OGG video
        'video/x-matroska', // MKV files
        'video/mpeg', // MPEG files
        'video/x-flv', // FLV files
        'application/octet-stream', // Generic binary (some browsers report video files this way)
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      COMPANY_PROFILE_DOC: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
    };

    const maxSize = maxSizes[assetKind];
    const allowedMimeTypes = allowedTypes[assetKind];

    if (!maxSize) {
      throw new BadRequestException(`Unsupported asset kind: ${assetKind}`);
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed for ${assetKind}. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    this.logger.log(`File validation passed for ${assetKind}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
  }

  /**
   * Generate storage key for file organization
   */
  private generateStorageKey(
    filename: string, 
    assetKind: AssetKind, 
    appUserId: string,
    subcategory?: string,
    conversationId?: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const sanitizedSubcategory = subcategory ? subcategory.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase() : null;

    // Special handling for message attachments - organize by conversation
    // If conversationId is provided, use messages folder structure
    // SECURITY NOTE: Files from different users share the same conversation folder.
    // Conversation-level authorization MUST be enforced at the API/service layer
    // to prevent unauthorized file uploads and access.
    if (conversationId) {
      const sanitizedConversationId = conversationId.replace(/[^a-zA-Z0-9-]/g, '_');
      return `messages/${sanitizedConversationId}/${timestamp}-${sanitizedFilename}`;
    }

    // If subcategory provided, use it as a subfolder
    if (sanitizedSubcategory) {
      return `${assetKind.toLowerCase()}/${sanitizedSubcategory}/${appUserId}/${timestamp}-${sanitizedFilename}`;
    }

    return `${assetKind.toLowerCase()}/${appUserId}/${timestamp}-${sanitizedFilename}`;
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
   * Get file as a stream for proxying/downloading
   */
  async getFileStream(key: string): Promise<{ stream: any; contentType: string; size: number }> {
    // Check if R2 is configured
    if (!this.isConfigured()) {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (isDevelopment) {
        this.logger.warn(`⚠️ R2 not configured. Cannot download file: ${key}`);
        this.logger.warn('File downloads require R2 to be properly configured.');
        this.logger.warn('Files uploaded in development mode without R2 are not actually stored.');
        throw new BadRequestException(
          'File downloads are not available in development mode without R2 configuration. ' +
          'Please configure R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.'
        );
      }
      throw new BadRequestException('File storage is not properly configured. Please contact administrator.');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File body is empty');
      }

      return {
        stream: response.Body as any, // AWS SDK returns a readable stream
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get file stream');
      this.logger.error(`Error details: ${error.message || error}`);
      this.logger.error(`Attempted to fetch key: ${key}`);
      this.logger.error(`Bucket: ${this.bucketName}`);
      
      // Check if it's a NoSuchKey error (file doesn't exist)
      if (error.name === 'NoSuchKey' || error.message?.includes('NoSuchKey')) {
        throw new BadRequestException(`File not found: ${key}`);
      }
      
      throw new BadRequestException(`Failed to get file stream: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Development fallback: simulate file upload without R2
   * This stores file metadata in memory and returns mock URLs
   */
  private uploadFileLocalFallback(
    file: Express.Multer.File,
    assetKind: AssetKind,
    appUserId: string,
    subcategory?: string,
    conversationId?: string,
  ): UploadResult {
    const key = this.generateStorageKey(file.originalname, assetKind, appUserId, subcategory, conversationId);
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