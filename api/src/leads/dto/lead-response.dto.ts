import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class CreateLeadResponseDto {
  @IsString()
  @IsIn(['INTERESTED', 'NOT_INTERESTED', 'NEEDS_MORE_INFO', 'ENROLLED'])
  status: 'INTERESTED' | 'NOT_INTERESTED' | 'NEEDS_MORE_INFO' | 'ENROLLED';

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(5000)
  message?: string;
}
