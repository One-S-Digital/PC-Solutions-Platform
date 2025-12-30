import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { JobContractType, JobStatus } from '@workspace/types';
import { JobEmploymentType } from '@prisma/client';

export enum JobPreferredTimeSlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  FULL_DAY = 'FULL_DAY',
  FLEXIBLE = 'FLEXIBLE',
}

export class JobWorkScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(80)
  expectedHoursPerWeek?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  preferredDays?: number[];

  @IsOptional()
  @IsEnum(JobPreferredTimeSlot)
  preferredTimeSlot?: JobPreferredTimeSlot;

  @IsOptional()
  @IsString()
  startTime?: string; // HH:MM (validated loosely)

  @IsOptional()
  @IsString()
  endTime?: string; // HH:MM (validated loosely)
}

export class CreateJobListingDto {
  @IsString()
  title: string;

  // Optional foundation override (used by ADMIN/SUPER_ADMIN in dev/testing)
  @IsOptional()
  @IsString()
  foundationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsEnum(JobContractType)
  contractType?: JobContractType;

  @IsOptional()
  @IsEnum(JobEmploymentType)
  employmentType?: JobEmploymentType;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobWorkScheduleDto)
  workSchedule?: JobWorkScheduleDto;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}