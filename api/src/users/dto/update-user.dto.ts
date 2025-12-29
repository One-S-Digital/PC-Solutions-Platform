import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsUUID, IsEnum, IsEmail, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'PENDING'])
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';

  /**
   * Admin-selected reason shown to the user when their account is deactivated.
   * Stored on the User profile record (not AppUser).
   */
  @IsOptional()
  @IsString()
  deactivatedReasonCode?: string;

  @IsOptional()
  @IsString()
  deactivatedReasonText?: string;

  /**
   * Educator-controlled visibility in the candidate pool (admin override).
   * Only applicable to EDUCATOR profiles; ignored for other roles.
   */
  @IsOptional()
  @IsBoolean()
  candidatePoolVisible?: boolean;
}
