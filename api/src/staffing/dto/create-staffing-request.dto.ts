import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateStaffingRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  rawText: string;

  @IsOptional()
  @IsIn(['fr', 'de', 'en'])
  locale?: 'fr' | 'de' | 'en';
}
