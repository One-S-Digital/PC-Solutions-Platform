import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EducatorAvailabilitySettingsDto } from './educator-availability.dto';

export class UpdateEducatorSettingsDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  workExperience: string;

  @IsString()
  education: string;

  @IsArray()
  @IsString({ each: true })
  certifications: string[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  availability?: string; // Legacy: simple text availability (kept for backward compatibility)

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EducatorAvailabilitySettingsDto)
  availabilitySettings?: EducatorAvailabilitySettingsDto; // New: structured availability schedule

  @IsString()
  cvUrl: string;

  @IsOptional()
  @IsString()
  shortBio?: string;

  @IsOptional()
  @IsString()
  avatarAssetId?: string;

  @IsOptional()
  @IsString()
  coverAssetId?: string;
}
