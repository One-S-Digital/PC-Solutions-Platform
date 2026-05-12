import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsNumber,
  Min,
  ArrayMaxSize,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const ALLOWED_JOB_ROLES = ['EDE', 'ASE', 'Auxiliaire', 'Director', 'Cleaning Staff', 'Intern'] as const;
import { Type } from 'class-transformer';

const MAX_DOCUMENTS = 5;

export class EducatorDocumentItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsIn(['CV', 'Diploma', 'Certificate', 'Reference', 'Other'])
  type?: string;

  @IsOptional()
  @IsString()
  uploadDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;
}
import { EducatorAvailabilitySettingsDto } from './educator-availability.dto';

const MAX_EDUCATOR_ITEMS = 20;

export class EducatorWorkExperienceItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  jobTitle!: string;

  @IsString()
  institutionName!: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptionPoints?: string[];
}

export class EducatorEducationItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  degree!: string;

  @IsString()
  institutionName!: string;

  @IsOptional()
  @IsString()
  graduationYear?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EducatorCertificationItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @ValidateIf((value) => typeof value?.credentialUrl === 'string' && value.credentialUrl.trim().length > 0)
  @IsUrl()
  credentialUrl?: string;
}

export class UpdateEducatorSettingsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  email?: string;

  // Separate from authentication email: used for "contact info" on the profile.
  @IsOptional()
  @ValidateIf((o) => !!o.contactEmail)
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
  @ArrayMaxSize(MAX_EDUCATOR_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EducatorWorkExperienceItemDto)
  workExperienceItems?: EducatorWorkExperienceItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EDUCATOR_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EducatorEducationItemDto)
  educationItems?: EducatorEducationItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EDUCATOR_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EducatorCertificationItemDto)
  certificationItems?: EducatorCertificationItemDto[];

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
  @IsArray()
  @ArrayMaxSize(MAX_DOCUMENTS)
  @ValidateNested({ each: true })
  @Type(() => EducatorDocumentItemDto)
  documents?: EducatorDocumentItemDto[];

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
  @ValidateIf((o) => !!o.jobRole)
  @IsIn(ALLOWED_JOB_ROLES)
  jobRole?: string;

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

  /**
   * When true, the educator is in the replacement/substitute staff pool.
   * Automatically set to true when CUSTOM_SCHEDULE is among the selected employment types.
   */
  @IsOptional()
  @IsBoolean()
  availableForReplacement?: boolean;
}
