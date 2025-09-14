import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class CreateJobApplicationDto {
  @IsString()
  jobListingId: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;
}

export class UpdateJobApplicationDto {
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}