import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
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
  PolicyType,
  POLICY_CATEGORIES,
  PolicyCategory,
  COUNTRIES,
  Country,
  REGIONS_BY_COUNTRY,
} from './content.enums';

export class UploadStatePolicyDto {
  @IsString()
  @MinLength(3, { message: 'Policy title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Policy title must not exceed 100 characters' })
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
    if (typeof value === 'string' && POLICY_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category: PolicyCategory;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as LanguageCode;
    }
    return value;
  })
  @IsEnum(LanguageCode, { message: 'Language must be EN, FR, or DE' })
  language: LanguageCode;

  @Transform(({ value }) => {
    if (typeof value === 'string' && COUNTRIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  country: Country;

  @IsString()
  @MinLength(2, { message: 'Region/Canton is required' })
  region: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as PolicyType;
    }
    return value;
  })
  @IsEnum(PolicyType, { message: 'Invalid policy type' })
  policyType: PolicyType;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value === true;
  })
  @IsBoolean()
  isCritical?: boolean;

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
  expirationDate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  @MaxLength(500, { message: 'External link must not exceed 500 characters' })
  externalLink?: string;

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

export class UpdateStatePolicyDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Policy title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Policy title must not exceed 100 characters' })
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
    if (typeof value === 'string' && POLICY_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  category?: PolicyCategory;

  /**
   * Backwards-compatible alias for `category`.
   * Some clients historically send `contentCategory`; we store it as `Asset.contentCategory`.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string' && POLICY_CATEGORIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  contentCategory?: PolicyCategory;

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
    if (typeof value === 'string' && COUNTRIES.includes(value as any)) {
      return value;
    }
    return undefined;
  })
  @IsString()
  country?: Country;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Region/Canton is required' })
  region?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as PolicyType;
    }
    return value;
  })
  @IsEnum(PolicyType, { message: 'Invalid policy type' })
  policyType?: PolicyType;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value === true;
  })
  @IsBoolean()
  isCritical?: boolean;

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

  /**
   * Crawler workflow status for STATE_POLICY assets (e.g. pending_review, approved, rejected).
   * This is stored as `Asset.crawlStatus`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'crawlStatus must not exceed 50 characters' })
  crawlStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Version must not exceed 20 characters' })
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  @MaxLength(500, { message: 'External link must not exceed 500 characters' })
  externalLink?: string;

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

export class GetStatePoliciesQueryDto {
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

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsString()
  lang?: string; // Language for translation resolution (en, fr, de)
}

