import { IsString, IsOptional, IsEnum, IsNotEmpty, IsInt, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class CompleteProfileDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsOptional()
  organisationName?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  canton?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  serviceType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  childAge?: number;

  @IsString()
  @IsOptional()
  childStartDate?: string;
}
