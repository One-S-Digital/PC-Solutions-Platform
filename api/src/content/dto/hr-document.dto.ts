import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import {
  ContentStatus,
  LanguageCode,
  FileType,
  HR_CATEGORIES,
  HRCategory,
} from './content.enums';

export class UploadHrDocumentDto {
  @IsString()
  @MinLength(3, { message: 'Document title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Document title must not exceed 200 characters' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Content preview must not exceed 1000 characters' })
  contentPreview?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string' && HR_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category: HRCategory;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as LanguageCode;
    }
    return value;
  })
  @IsEnum(LanguageCode, { message: 'Language must be EN, FR, or DE' })
  language: LanguageCode;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as FileType;
    }
    return value;
  })
  @IsEnum(FileType, { message: 'Invalid file type' })
  fileType: FileType;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid access role' })
  accessRoles?: UserRole[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as ContentStatus;
    }
    return value;
  })
  @IsEnum(ContentStatus, { message: 'Invalid status value' })
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Version must not exceed 20 characters' })
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateHrDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Document title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Document title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Content preview must not exceed 1000 characters' })
  contentPreview?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string' && HR_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category?: HRCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as LanguageCode;
    }
    return value;
  })
  @IsEnum(LanguageCode, { message: 'Language must be EN, FR, or DE' })
  language?: LanguageCode;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as FileType;
    }
    return value;
  })
  @IsEnum(FileType, { message: 'Invalid file type' })
  fileType?: FileType;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid access role' })
  accessRoles?: UserRole[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as ContentStatus;
    }
    return value;
  })
  @IsEnum(ContentStatus, { message: 'Invalid status value' })
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Version must not exceed 20 characters' })
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class GetHrDocumentsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsEnum(LanguageCode)
  language?: LanguageCode;
}

