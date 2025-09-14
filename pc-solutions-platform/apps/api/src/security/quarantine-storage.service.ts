import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StorageResult {
  location: string;
  key: string;
  bucket?: string;
}

@Injectable()
export class QuarantineStorageService {
  private readonly logger = new Logger(QuarantineStorageService.name);
  private readonly uploadMode: string;
  private readonly s3Client?: S3Client;
  private readonly quarantineBucket: string;
  private readonly safeBucket: string;

  constructor(private configService: ConfigService) {
    this.uploadMode = this.configService.get<string>('UPLOAD_MODE') || 'local';
    
    if (this.uploadMode === 'r2') {
      this.quarantineBucket = this.configService.get<string>('R2_BUCKET_QUARANTINE') || '';
      this.safeBucket = this.configService.get<string>('R2_BUCKET_SAFE') || '';
      
      if (!this.quarantineBucket || !this.safeBucket) {
        throw new Error('R2_BUCKET_QUARANTINE and R2_BUCKET_SAFE must be configured for R2 mode');
      }

      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: this.configService.get<string>('R2_ENDPOINT'),
        credentials: {
          accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '',
        },
      });
    }

    this.logger.log(`Quarantine storage configured: ${this.uploadMode} mode`);
  }

  /**
   * Generate a unique filename with timestamp and random hash
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(6).toString('hex');
    return `${timestamp}-${randomHash}${ext}`;
  }

  /**
   * Save file to quarantine storage
   */
  async saveToQuarantine(buffer: Buffer, originalName: string): Promise<StorageResult> {
    const filename = this.generateFilename(originalName);
    
    try {
      if (this.uploadMode === 'r2') {
        return await this.saveToR2Quarantine(buffer, filename);
      } else {
        return await this.saveToLocalQuarantine(buffer, filename);
      }
    } catch (error) {
      this.logger.error(`Failed to save file to quarantine: ${filename}`, error);
      throw new InternalServerErrorException('Failed to save file to quarantine');
    }
  }

  /**
   * Promote file from quarantine to safe storage
   */
  async promoteToSafe(buffer: Buffer, filename: string, contentType: string): Promise<StorageResult> {
    try {
      if (this.uploadMode === 'r2') {
        return await this.promoteToR2Safe(buffer, filename, contentType);
      } else {
        return await this.promoteToLocalSafe(buffer, filename, contentType);
      }
    } catch (error) {
      this.logger.error(`Failed to promote file to safe storage: ${filename}`, error);
      throw new InternalServerErrorException('Failed to promote file to safe storage');
    }
  }

  /**
   * Delete file from quarantine storage
   */
  async deleteFromQuarantine(key: string): Promise<void> {
    try {
      if (this.uploadMode === 'r2') {
        await this.deleteFromR2Quarantine(key);
      } else {
        await this.deleteFromLocalQuarantine(key);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file from quarantine: ${key}`, error);
      // Don't throw here as this is cleanup
    }
  }

  /**
   * Save to R2 quarantine bucket
   */
  private async saveToR2Quarantine(buffer: Buffer, filename: string): Promise<StorageResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.quarantineBucket,
      Key: filename,
      Body: buffer,
      ContentType: 'application/octet-stream',
      Metadata: {
        'quarantine': 'true',
        'scan-status': 'pending',
        'uploaded-at': new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    
    this.logger.log(`File saved to R2 quarantine: ${filename}`);
    
    return {
      location: `r2://${this.quarantineBucket}/${filename}`,
      key: filename,
      bucket: this.quarantineBucket,
    };
  }

  /**
   * Promote from R2 quarantine to safe bucket
   */
  private async promoteToR2Safe(buffer: Buffer, filename: string, contentType: string): Promise<StorageResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.safeBucket,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'quarantine': 'false',
        'scan-status': 'clean',
        'promoted-at': new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    
    this.logger.log(`File promoted to R2 safe storage: ${filename}`);
    
    return {
      location: `r2://${this.safeBucket}/${filename}`,
      key: filename,
      bucket: this.safeBucket,
    };
  }

  /**
   * Delete from R2 quarantine bucket
   */
  private async deleteFromR2Quarantine(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.quarantineBucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`File deleted from R2 quarantine: ${key}`);
  }

  /**
   * Save to local quarantine directory
   */
  private async saveToLocalQuarantine(buffer: Buffer, filename: string): Promise<StorageResult> {
    const quarantineDir = path.join(process.cwd(), 'uploads', 'quarantine');
    fs.mkdirSync(quarantineDir, { recursive: true });
    
    const filePath = path.join(quarantineDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    this.logger.log(`File saved to local quarantine: ${filename}`);
    
    return {
      location: filePath,
      key: filename,
    };
  }

  /**
   * Promote from local quarantine to safe directory
   */
  private async promoteToLocalSafe(buffer: Buffer, filename: string, contentType: string): Promise<StorageResult> {
    const safeDir = path.join(process.cwd(), 'uploads', 'safe');
    fs.mkdirSync(safeDir, { recursive: true });
    
    const filePath = path.join(safeDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    this.logger.log(`File promoted to local safe storage: ${filename}`);
    
    return {
      location: filePath,
      key: filename,
    };
  }

  /**
   * Delete from local quarantine directory
   */
  private async deleteFromLocalQuarantine(key: string): Promise<void> {
    const quarantineDir = path.join(process.cwd(), 'uploads', 'quarantine');
    const filePath = path.join(quarantineDir, key);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`File deleted from local quarantine: ${key}`);
    }
  }

  /**
   * Get storage mode
   */
  getStorageMode(): string {
    return this.uploadMode;
  }

  /**
   * Get quarantine bucket name (for R2 mode)
   */
  getQuarantineBucket(): string {
    return this.quarantineBucket;
  }

  /**
   * Get safe bucket name (for R2 mode)
   */
  getSafeBucket(): string {
    return this.safeBucket;
  }
}