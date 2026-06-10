import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  /**
   * Optional URL to redirect the user after accepting the invitation.
   * If not provided, Clerk will use its default behavior.
   */
  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['https', 'http'] })
  @MaxLength(2048)
  redirectUrl?: string;

  /**
   * Optional reason (stored in Clerk invitation metadata/audit logs if desired).
   * Kept for future expansion; currently not persisted server-side.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

