import { IsArray, IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { JobContractType, JobStatus } from '@workspace/types';

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
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}