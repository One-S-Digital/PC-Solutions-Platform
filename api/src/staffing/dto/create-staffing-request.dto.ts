import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateStaffingRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  rawText: string;

  @IsOptional()
  @IsIn(['fr', 'de', 'en'])
  locale?: 'fr' | 'de' | 'en';

  /** Admin/Super-admin only: scope the request to a specific foundation org. */
  @IsOptional()
  @IsUUID()
  foundationId?: string;
}
