import { IsEmail, IsISO8601, IsOptional, IsString } from 'class-validator';

export class EmailChangeEventDto {
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsEmail()
  previousEmail?: string;

  @IsOptional()
  @IsEmail()
  newEmail?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
