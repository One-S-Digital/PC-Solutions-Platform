import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Optional promo code to apply for the supplier organization.
   * Validated during order creation against the supplier owning the products.
   */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  promoCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}