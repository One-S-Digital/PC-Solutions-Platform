import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ProductAvailabilityStatus } from '@prisma/client';

class VolumePricingTierDto {
  @IsInt()
  @Min(1)
  minQuantity: number;

  @IsNumber()
  price: number;
}

class DeliveryFeeDto {
  @IsString()
  method: string;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

class ProductVariantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  stockStatus?: string;

  @IsOptional()
  @IsString()
  imageAssetId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributes?: string[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  primaryCategory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productHighlights?: string[];

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsEnum(ProductAvailabilityStatus)
  availabilityStatus?: ProductAvailabilityStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  vendorSku?: string;

  @IsOptional()
  @IsString()
  ean?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxOrderQuantity?: number;

  @IsOptional()
  @IsString()
  stockStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryLeadTimeDays?: number;

  @IsOptional()
  @IsString()
  restockCadence?: string;

  @IsOptional()
  @IsString()
  usageNotes?: string;

  @IsOptional()
  @IsString()
  packagingDetails?: string;

  @IsOptional()
  @IsString()
  materials?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ageRanges?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveryMethods?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryFeeDto)
  deliveryFees?: DeliveryFeeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCantons?: string[];

  @IsOptional()
  @IsDateString()
  visibilityStart?: string;

  @IsOptional()
  @IsDateString()
  visibilityEnd?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumePricingTierDto)
  volumePricing?: VolumePricingTierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsString()
  imageAssetId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryAssetIds?: string[];

  @IsOptional()
  @IsString()
  specSheetAssetId?: string;

  @IsOptional()
  @IsString()
  msdsAssetId?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}