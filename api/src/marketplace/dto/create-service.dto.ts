import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsArray, IsIn } from 'class-validator';
import { ServiceCategory } from '@workspace/types';

export const SERVICE_DELIVERY_TYPES = ['On-site', 'Remote', 'Hybrid'] as const;

export class CreateServiceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  /**
   * Flexible service categories (stored as tags).
   * Use this for custom categories (e.g. when user selects "Other").
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  priceInfo?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsIn(SERVICE_DELIVERY_TYPES)
  deliveryType?: (typeof SERVICE_DELIVERY_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  priceInfo?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsIn(SERVICE_DELIVERY_TYPES)
  deliveryType?: (typeof SERVICE_DELIVERY_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;
}