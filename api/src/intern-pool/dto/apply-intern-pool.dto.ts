import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InternPoolApplicationStatus } from '@prisma/client';

export class ApplyInternPoolDto {
  @IsOptional()
  @IsString()
  motivationLetter?: string;
}

export class RespondInternApplicationDto {
  @IsEnum(InternPoolApplicationStatus)
  status: InternPoolApplicationStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
