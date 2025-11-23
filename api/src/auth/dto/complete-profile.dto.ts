import { IsString, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CompleteProfileDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  organisationName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  canton?: string;
  
  // Additional fields can be added here as needed
}
