import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApplicationStatus } from '@workspace/types';

export class UpdateJobApplicationDto {
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}