import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateLeadResponseDto {
  @IsString()
  @IsIn(['INTERESTED', 'NOT_INTERESTED', 'NEEDS_MORE_INFO', 'ENROLLED'])
  status: 'INTERESTED' | 'NOT_INTERESTED' | 'NEEDS_MORE_INFO' | 'ENROLLED';

  @IsString()
  @IsOptional()
  message?: string;
}
