import { IsString, IsOptional, IsEnum, IsNotEmpty, IsInt, Min, IsEmail, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class CompleteProfileDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MinLength(1)
  @MaxLength(200)
  organisationName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  canton?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  serviceType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  childAge?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  childStartDate?: string;
}
