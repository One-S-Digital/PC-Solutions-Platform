import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JobContractType, JobStatus } from '@workspace/types';
import { JobEmploymentType } from '@prisma/client';
import { JobWorkScheduleDto } from './create-job-listing.dto';

export class UpdateJobListingDto {
  @IsOptional()
  @IsString()
  title?: string;

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