import { IsString, IsBoolean, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePlatformSettingsDto {
  @IsString()
  platformName: string;

  @IsOptional()
  @IsString()
  platformDescription?: string;

  @IsOptional()
  @IsString()
  platformVersion?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerificationRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1024) // 1KB minimum
  maxFileUploadSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(300) // 5 minutes minimum
  sessionTimeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(50)
  passwordMinLength?: number;

  @IsOptional()
  @IsBoolean()
  passwordRequireSpecial?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(100)
  apiRateLimit?: number;

  @IsOptional()
  @IsString()
  backupFrequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  logRetentionDays?: number;
}

export class UpdatePlatformSettingsDto extends PartialType(CreatePlatformSettingsDto) {}