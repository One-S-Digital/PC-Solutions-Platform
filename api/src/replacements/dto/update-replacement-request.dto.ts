import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReplacementRequestStatus } from '@prisma/client';

export class UpdateReplacementRequestDto {
  @IsOptional()
  @IsEnum(ReplacementRequestStatus)
  status?: ReplacementRequestStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  urgency?: string;
}
