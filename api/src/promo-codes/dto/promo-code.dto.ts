import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Promo code string', example: 'SAVE20' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Type of discount',
    enum: ['Percentage', 'FixedAmount', 'FreeMinutes'],
    example: 'Percentage',
  })
  @IsString()
  @IsIn(['Percentage', 'FixedAmount', 'FreeMinutes'])
  discountType: string;

  @ApiProperty({ description: 'Discount value', example: 20 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Expiry date in ISO format', example: '2025-12-31T23:59:59.000Z' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ description: 'Description of the promo code', example: 'First-time customer discount' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum usage limit', example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsage?: number;
}

export class UpdatePromoCodeDto {
  @ApiPropertyOptional({ description: 'Promo code string', example: 'SAVE20' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Type of discount',
    enum: ['Percentage', 'FixedAmount', 'FreeMinutes'],
    example: 'Percentage',
  })
  @IsString()
  @IsIn(['Percentage', 'FixedAmount', 'FreeMinutes'])
  @IsOptional()
  discountType?: string;

  @ApiPropertyOptional({ description: 'Discount value', example: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({ description: 'Expiry date in ISO format', example: '2025-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Status of the promo code',
    enum: ['Active', 'Expired', 'Disabled'],
    example: 'Active',
  })
  @IsString()
  @IsIn(['Active', 'Expired', 'Disabled'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Description of the promo code' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum usage limit', example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsage?: number;
}

export class PromoCodeResponseDto {
  @ApiProperty({ description: 'Promo code ID' })
  id: string;

  @ApiProperty({ description: 'Promo code string' })
  code: string;

  @ApiProperty({ description: 'Type of discount' })
  discountType: string;

  @ApiProperty({ description: 'Discount value' })
  value: number;

  @ApiProperty({ description: 'Expiry date' })
  expiryDate: Date;

  @ApiProperty({ description: 'Status of the promo code' })
  status: string;

  @ApiPropertyOptional({ description: 'Description of the promo code' })
  description?: string;

  @ApiProperty({ description: 'Number of times the code has been used' })
  usageCount: number;

  @ApiPropertyOptional({ description: 'Maximum usage limit' })
  maxUsage?: number;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
