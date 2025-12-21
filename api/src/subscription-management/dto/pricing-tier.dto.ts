import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTier, UserRole } from '@workspace/types';

export class VolumeDiscountDto {
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;
}

export class PricingDiscountsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yearlyDiscount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumeDiscountDto)
  volumeDiscounts?: VolumeDiscountDto[];
}

export class CreatePricingTierDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsEnum(SubscriptionTier)
  subscriptionTier: SubscriptionTier;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingPeriod?: 'monthly' | 'yearly';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingDiscountsDto)
  discounts?: PricingDiscountsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class UpdatePricingTierDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingPeriod?: 'monthly' | 'yearly';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingDiscountsDto)
  discounts?: PricingDiscountsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

