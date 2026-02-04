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
  private readonly officeZipExtensions = new Set(['docx', 'xlsx', 'pptx']);
  private readonly officeLegacyExtensions = new Set(['doc', 'xls', 'ppt']);

  constructor(private configService: ConfigService) {
    // Default extensions include video formats for e-learning content
    const defaultExtensions = 'pdf,png,jpg,jpeg,webp,doc,docx,mp4,mov,webm,avi,ppt,pptx,xls,xlsx,csv,ods';
    this.allowedExtensions = (this.configService.get<string>('UPLOAD_ALLOWED_EXT') || defaultExtensions)
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(Boolean);
    
    // Default MIME types include video formats for e-learning content
    // Note: AVI files can be detected as either video/x-msvideo or video/vnd.avi depending on the file-type library version
    const defaultMimeTypes = 'application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm,video/x-msvideo,video/vnd.avi,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/csv,application/vnd.oasis.opendocument.spreadsheet';
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
    let detectedExt = fileType?.ext || originalExt;
    let detectedMimeType = fileType?.mime || originalMimeType;

    /**
     * Special-case handling for Microsoft Office formats:
     * - Modern Office files (.docx/.xlsx/.pptx) are ZIP containers, and `file-type`
     *   often reports them as application/zip. We validate that the ZIP contains
     *   expected OOXML entries, then treat the detected type as the original.
     * - Legacy Office files (.doc/.xls/.ppt) are Compound File Binary (CFB) and may be
     *   detected generically; if the buffer matches the CFB signature, we treat the
     *   detected type as the original.
     */
    const normalizedOriginalExt = originalExt.toLowerCase();
    const normalizedDetectedMime = (detectedMimeType || '').toLowerCase();
    const normalizedDetectedExt = (detectedExt || '').toLowerCase();

    if (
      this.officeZipExtensions.has(normalizedOriginalExt) &&
      (normalizedDetectedMime === 'application/zip' || normalizedDetectedExt === 'zip')
    ) {
      const ooxmlCheck = this.validateOfficeOpenXmlZipContainer(buffer, normalizedOriginalExt as 'docx' | 'xlsx' | 'pptx');
      if (!ooxmlCheck.isValid) {
        return {
          isValid: false,
          detectedExt,
          detectedMimeType,
          originalExt,
          originalMimeType,
          reason: ooxmlCheck.reason,
        };
      }

      // Treat the detected type as the original intended OOXML type
      detectedExt = originalExt;
      detectedMimeType = originalMimeType;
    }

    if (
      this.officeLegacyExtensions.has(normalizedOriginalExt) &&
      (normalizedDetectedExt === 'cfb' || normalizedDetectedMime === 'application/x-cfb')
    ) {
      if (!this.isCompoundFileBinary(buffer)) {
        return {
          isValid: false,
          detectedExt,
          detectedMimeType,
          originalExt,
          originalMimeType,
          reason: "Invalid legacy Office document structure (expected Compound File Binary format)",
        };
      }

      detectedExt = originalExt;
      detectedMimeType = originalMimeType;
    }

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
   * Validate OOXML files (docx/xlsx/pptx) when detected as a generic ZIP.
   * This is a lightweight structural check that avoids full ZIP parsing.
   * It looks for key entry names which are stored as plain strings in ZIP metadata.
   */
  private validateOfficeOpenXmlZipContainer(
    buffer: Buffer,
    extension: 'docx' | 'xlsx' | 'pptx',
  ): { isValid: boolean; reason?: string } {
    // ZIP local file header signature "PK\x03\x04"
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return { isValid: false, reason: 'Invalid Office document: expected ZIP container' };
    }

    // All OOXML files should include [Content_Types].xml
    const hasContentTypes = buffer.indexOf(Buffer.from('[Content_Types].xml')) !== -1;
    if (!hasContentTypes) {
      return { isValid: false, reason: 'Invalid Office document: missing [Content_Types].xml' };
    }

    // Minimal type-specific markers
    const markers: Record<typeof extension, string[]> = {
      docx: ['word/document.xml', 'word/'],
      xlsx: ['xl/workbook.xml', 'xl/'],
      pptx: ['ppt/presentation.xml', 'ppt/'],
    };

    const hasAnyMarker = markers[extension].some((m) => buffer.indexOf(Buffer.from(m)) !== -1);
    if (!hasAnyMarker) {
      return { isValid: false, reason: `Invalid Office document: missing expected ${extension.toUpperCase()} content` };
    }

    return { isValid: true };
  }

  /**
   * Check for Compound File Binary signature (used by legacy Office .doc/.xls/.ppt).
   * Signature bytes: D0 CF 11 E0 A1 B1 1A E1
   */
  private isCompoundFileBinary(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    );
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