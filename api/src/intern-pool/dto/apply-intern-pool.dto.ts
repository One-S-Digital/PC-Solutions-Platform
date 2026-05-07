import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InternPoolApplicationStatus } from '@prisma/client';

export class ApplyInternPoolDto {
  @IsOptional()
  @IsString()
  motivationLetter?: string;
}

export class ProposeInternDto {
  @IsNotEmpty()
  @IsString()
  applicantId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RespondInternApplicationDto {
  @IsEnum(InternPoolApplicationStatus)
  status: InternPoolApplicationStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
