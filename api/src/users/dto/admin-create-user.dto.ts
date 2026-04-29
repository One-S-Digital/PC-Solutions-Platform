import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AdminCreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /**
   * Optional temporary password. If omitted the backend generates a
   * cryptographically random one. The user should reset it on first login.
   */
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword?: string;
}
