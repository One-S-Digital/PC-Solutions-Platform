import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export interface KeyMetadata {
  courseId?: string;
  moduleId?: string;
  userId?: string;
  category?: string;
}

@Injectable()
export class KeyGeneratorService {
  /**
   * Generate deterministic storage key based on content hash
   * Format: {category}/{identifier}/{hash}.{ext}
   * 
   * This ensures:
   * - Idempotency: same file + metadata = same key
   * - Deduplication: identical content reuses same storage
   * - Organization: files grouped by category/identifier
   */
  generate(file: Express.Multer.File, metadata: KeyMetadata): string {
    // Calculate content hash (first 16 chars for brevity)
    const contentHash = createHash('sha256')
      .update(file.buffer)
      .digest('hex')
      .substring(0, 16);

    // Get file extension
    const ext = this.getFileExtension(file.originalname);

    // Build key based on metadata type
    if (metadata.courseId && metadata.moduleId) {
      // E-learning content: elearning/{courseId}/{moduleId}/{hash}.{ext}
      return `elearning/${metadata.courseId}/${metadata.moduleId}/${contentHash}.${ext}`;
    }

    if (metadata.category && metadata.userId) {
      // User-specific content: {category}/{userId}/{hash}.{ext}
      return `${metadata.category}/${metadata.userId}/${contentHash}.${ext}`;
    }

    if (metadata.category) {
      // General category: {category}/{hash}.{ext}
      return `${metadata.category}/${contentHash}.${ext}`;
    }

    // Fallback: general/{hash}.{ext}
    return `general/${contentHash}.${ext}`;
  }

  /**
   * Generate key from file content only (for pure deduplication)
   */
  generateFromContent(buffer: Buffer, filename: string): string {
    const contentHash = createHash('sha256')
      .update(buffer)
      .digest('hex')
      .substring(0, 16);

    const ext = this.getFileExtension(filename);
    return `deduplicated/${contentHash}.${ext}`;
  }

  /**
   * Generate composite identifier from multiple IDs
   * Useful for creating unique keys based on relationships
   */
  generateCompositeId(...ids: string[]): string {
    return createHash('sha256')
      .update(ids.filter(Boolean).join(':'))
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Extract file extension safely
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length === 1) return 'bin'; // No extension
    return parts.pop()!.toLowerCase();
  }

  /**
   * Validate key format
   */
  isValidKey(key: string): boolean {
    // Key should be: category/path/hash.ext
    // Minimum format: abc/123.ext
    const pattern = /^[a-z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-z0-9]+$/i;
    return pattern.test(key) || key.split('/').length >= 2;
  }
}
