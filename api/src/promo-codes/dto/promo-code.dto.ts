import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a display-only promo code
 * These are simple promotional codes shown on supplier/provider profiles
 */
export class CreatePromoCodeDto {
  @ApiProperty({ 
    description: 'Promo code string that customers can use', 
    example: 'SAVE20' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ 
    description: 'Description of the promo code offer', 
    example: 'First-time customer discount' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Free text discount display (e.g., "20% off", "Free shipping", "CHF 10 off")', 
    example: '20% off your first order' 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  discount: string;

  @ApiPropertyOptional({ 
    description: 'Whether the promo code is active and visible on profile', 
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO for updating a display-only promo code
 */
export class UpdatePromoCodeDto {
  @ApiPropertyOptional({ 
    description: 'Promo code string', 
    example: 'SAVE20' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ 
    description: 'Description of the promo code offer' 
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Free text discount display', 
    example: '20% off' 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  discount?: string;

  @ApiPropertyOptional({ 
    description: 'Whether the promo code is active and visible', 
    example: true 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Response DTO for promo code data
 */
export class PromoCodeResponseDto {
  @ApiProperty({ description: 'Promo code ID' })
  id: string;

  @ApiProperty({ description: 'Promo code string' })
  code: string;

  @ApiPropertyOptional({ description: 'Description of the promo code' })
  description?: string;

  @ApiProperty({ description: 'Free text discount display' })
  discount: string;

  @ApiProperty({ description: 'Whether the promo code is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
