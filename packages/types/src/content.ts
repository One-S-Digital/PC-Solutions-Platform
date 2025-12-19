/**
 * Content item types
 */
export enum ContentType {
  VIDEO = 'video',
  PDF = 'pdf',
  IMAGE = 'image',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  TEXT = 'text',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Content item interface
 */
export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  contentType: ContentType;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags: string[];
  status: ContentStatus;
  isPublic: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Content category interface
 */
export interface ContentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Upload response
 */
export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  etag?: string;
  checksum?: string;
}

/**
 * Content upload DTO
 */
export interface UploadContentPayload {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  language?: 'en' | 'fr' | 'de';
}
