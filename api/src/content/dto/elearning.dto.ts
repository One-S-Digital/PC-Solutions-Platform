import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import {
  ELearningContentType,
  ContentStatus,
  LanguageCode,
  ELEARNING_CATEGORIES,
  ELearningCategory,
} from './content.enums';

export class UploadElearningDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
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
    if (typeof value === 'string' && ELEARNING_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category: ELearningCategory;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as ELearningContentType;
    }
    return value;
  })
  @IsEnum(ELearningContentType, {
    message: 'Content type must be COURSE, VIDEO, PDF, or LINK',
  })
  type: ELearningContentType;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as LanguageCode;
    }
    return value;
  })
  @IsEnum(LanguageCode, { message: 'Language must be EN, FR, or DE' })
  language: LanguageCode;

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

  // For COURSE type
  @ValidateIf((o) => o.type === ELearningContentType.COURSE)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt({ message: 'Number of lessons must be an integer' })
  @Min(1, { message: 'Number of lessons must be at least 1' })
  @IsOptional()
  lessons?: number;

  // For COURSE and VIDEO types
  @ValidateIf(
    (o) =>
      o.type === ELearningContentType.COURSE ||
      o.type === ELearningContentType.VIDEO,
  )
  @IsString()
  @MaxLength(100, { message: 'Duration must not exceed 100 characters' })
  @IsOptional()
  duration?: string;

  // For LINK type and VIDEO with URL source
  @ValidateIf((o) => o.type === ELearningContentType.LINK || o.videoSourceType === 'url')
  @IsUrl({}, { message: 'Invalid URL format' })
  @IsOptional()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  videoSourceType?: 'upload' | 'url';

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

export class UpdateElearningDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
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
    if (typeof value === 'string' && ELEARNING_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category?: ELearningCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as ELearningContentType;
    }
    return value;
  })
  @IsEnum(ELearningContentType, {
    message: 'Content type must be COURSE, VIDEO, PDF, or LINK',
  })
  type?: ELearningContentType;

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
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt({ message: 'Number of lessons must be an integer' })
  @Min(1, { message: 'Number of lessons must be at least 1' })
  lessons?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Duration must not exceed 100 characters' })
  duration?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  fileUrl?: string;

  @IsOptional()
  @IsString()
  videoSourceType?: 'upload' | 'url';

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

export class GetElearningQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ELearningContentType)
  type?: ELearningContentType;

  @IsOptional()
  @IsEnum(LanguageCode)
  language?: LanguageCode;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  lang?: string; // Language for translation resolution (en, fr, de)
}

