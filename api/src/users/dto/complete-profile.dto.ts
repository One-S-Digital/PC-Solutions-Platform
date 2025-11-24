import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

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
  capacity?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  serviceType?: string;

  @IsOptional()
  childAge?: number;

  @IsString()
  @IsOptional()
  childStartDate?: string;
}
