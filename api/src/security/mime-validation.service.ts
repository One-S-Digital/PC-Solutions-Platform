import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import * as mime from 'mime-types';

export interface MimeValidationResult {
  isValid: boolean;
  detectedExt: string;
  detectedMimeType: string;
  originalExt: string;
  originalMimeType: string;
  reason?: string;
}

@Injectable()
export class MimeValidationService {
  private readonly logger = new Logger(MimeValidationService.name);
  private readonly allowedExtensions: string[];
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSize: number;

  constructor(private configService: ConfigService) {
    // Default extensions include video formats for e-learning content
    const defaultExtensions = 'pdf,png,jpg,jpeg,webp,doc,docx,mp4,mov,webm,avi,ppt,pptx,xls,xlsx';
    this.allowedExtensions = (this.configService.get<string>('UPLOAD_ALLOWED_EXT') || defaultExtensions)
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(Boolean);
    
    // Default MIME types include video formats for e-learning content
    const defaultMimeTypes = 'application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm,video/x-msvideo,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    this.allowedMimeTypes = (this.configService.get<string>('UPLOAD_ALLOWED_MIME') || defaultMimeTypes)
      .split(',')
      .map(mime => mime.trim().toLowerCase())
      .filter(Boolean);
    
    // Default max file size is 100MB to support video uploads
    this.maxFileSize = Number(this.configService.get<string>('UPLOAD_MAX_MB') || '100') * 1024 * 1024;
    
    this.logger.log(`MIME validation configured: ${this.allowedExtensions.length} extensions, ${this.allowedMimeTypes.length} MIME types, max ${this.maxFileSize / (1024 * 1024)}MB`);
  }

  /**
   * Validate file buffer against allowed types and extensions
   */
  async validateFile(buffer: Buffer, originalName: string): Promise<MimeValidationResult> {
    // Check file size
    if (buffer.length > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Get file type from buffer content
    const fileType = await fileTypeFromBuffer(buffer);
    
    // Extract original extension and MIME type
    const originalExt = this.extractExtension(originalName);
    const originalMimeType = mime.lookup(originalName) || '';

    // Get detected extension and MIME type
    const detectedExt = fileType?.ext || originalExt;
    const detectedMimeType = fileType?.mime || originalMimeType;

    // Validate detected types
    const isValidExt = this.allowedExtensions.includes(detectedExt.toLowerCase());
    const isValidMime = this.allowedMimeTypes.includes(detectedMimeType.toLowerCase());

    // Check for MIME/extension mismatch (potential security risk)
    const hasMimeMismatch = detectedExt.toLowerCase() !== originalExt.toLowerCase() || 
                           detectedMimeType.toLowerCase() !== originalMimeType.toLowerCase();

    const result: MimeValidationResult = {
      isValid: isValidExt && isValidMime && !hasMimeMismatch,
      detectedExt,
      detectedMimeType,
      originalExt,
      originalMimeType,
    };

    if (!result.isValid) {
      if (!isValidExt) {
        result.reason = `File extension '${detectedExt}' is not allowed`;
      } else if (!isValidMime) {
        result.reason = `File type '${detectedMimeType}' is not allowed`;
      } else if (hasMimeMismatch) {
        result.reason = `File type mismatch detected. Extension: '${originalExt}', Detected: '${detectedExt}'`;
      }
    }

    this.logger.log(`MIME validation for '${originalName}': ${result.isValid ? 'VALID' : 'INVALID'} - ${result.reason || 'OK'}`);
    
    return result;
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get allowed extensions list
   */
  getAllowedExtensions(): string[] {
    return [...this.allowedExtensions];
  }

  /**
   * Get allowed MIME types list
   */
  getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  /**
   * Get maximum file size in bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * Check if a specific extension is allowed
   */
  isExtensionAllowed(extension: string): boolean {
    return this.allowedExtensions.includes(extension.toLowerCase());
  }

  /**
   * Check if a specific MIME type is allowed
   */
  isMimeTypeAllowed(mimeType: string): boolean {
    return this.allowedMimeTypes.includes(mimeType.toLowerCase());
  }
}