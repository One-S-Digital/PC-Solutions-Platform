import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { MailingListType, UserRole } from '@prisma/client';

export class PreviewRecipientsDto {
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberUserIds?: string[];

  @IsOptional()
  @IsString()
  limit?: string;
}

