import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Plan code (e.g., BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE)',
    example: 'ESSENTIAL',
  })
  @IsString()
  @IsNotEmpty()
  planCode: string;
}