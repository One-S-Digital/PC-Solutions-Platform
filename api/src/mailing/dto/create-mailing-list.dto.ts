import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MailingListType, UserRole } from '@prisma/client';

export class CreateMailingListDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(MailingListType)
  type!: MailingListType;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  /**
   * Only used when type=CUSTOM.
   * These are DB User.id values (profile IDs).
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberUserIds?: string[];
}

