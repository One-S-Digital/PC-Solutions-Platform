import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AssignUserOrganizationDto {
  @IsUUID()
  organizationId: string;

  /**
   * Optional role override for the user within this organization.
   * Defaults to the user's system-level role if omitted.
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
