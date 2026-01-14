import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EducatorAvailabilitySettingsDto } from './educator-availability.dto';

export class UpdateEducatorSettingsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Separate from authentication email: used for "contact info" on the profile.
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  workExperience?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  availability?: string; // Legacy: simple text availability (kept for backward compatibility)

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EducatorAvailabilitySettingsDto)
  availabilitySettings?: EducatorAvailabilitySettingsDto; // New: structured availability schedule

  @IsOptional()
  @IsString()
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

  /**
   * Candidate location (e.g., canton/city). Used for candidate pool filtering.
   */
  @IsOptional()
  @IsString()
  region?: string;

  /**
   * Candidate role/title (e.g., "Educator", "Assistant"). Used for candidate pool filtering.
   */
  @IsOptional()
  @IsString()
  jobRole?: string;

  /**
   * Candidate roles/titles for multi-role matching.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobRoles?: string[];

  /**
   * Candidate cities for multi-city matching.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  /**
   * When true, the educator will appear in the Foundation/Admin candidate pool.
   * Default is false (hidden).
   */
  @IsOptional()
  @IsBoolean()
  candidatePoolVisible?: boolean;
}
