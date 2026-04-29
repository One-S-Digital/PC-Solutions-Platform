import { IsOptional, IsArray, IsBoolean, IsString, IsEnum, ArrayMaxSize } from 'class-validator';
import { UserRole, SubscriptionStatus, SubscriptionTier } from '@prisma/client';

export class MailingFiltersDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(2000)
  userIds?: string[];
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  excludeRoles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSubscription?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(SubscriptionStatus, { each: true })
  subscriptionStatuses?: SubscriptionStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(SubscriptionTier, { each: true })
  subscriptionTiers?: SubscriptionTier[];

  @IsOptional()
  @IsString()
  renewalDateFrom?: string;

  @IsOptional()
  @IsString()
  renewalDateTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cantons?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsBoolean()
  excludeUnsubscribed?: boolean;

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsOptional()
  @IsString()
  createdTo?: string;

  @IsOptional()
  @IsString()
  lastActiveFrom?: string;

  @IsOptional()
  @IsString()
  lastActiveTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
