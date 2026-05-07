import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReplacementMatchStatus } from '@prisma/client';

export class RespondMatchDto {
  @IsEnum(ReplacementMatchStatus)
  status: ReplacementMatchStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
