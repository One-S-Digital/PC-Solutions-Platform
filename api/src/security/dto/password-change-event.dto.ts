import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class PasswordChangeEventDto {
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
