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
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Separate from authentication email: used for "contact info" on the profile.
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  workExperience?: string;

  @IsString()
  @IsOptional()
  education?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsOptional()
  @IsString()
  availability?: string; // Legacy: simple text availability (kept for backward compatibility)

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EducatorAvailabilitySettingsDto)
  availabilitySettings?: EducatorAvailabilitySettingsDto; // New: structured availability schedule

  @IsString()
  @IsOptional()
  cvUrl?: string;

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
