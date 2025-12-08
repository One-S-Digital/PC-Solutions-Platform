import { IsString, IsOptional, IsNumber, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InquiryUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum PreferredContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PLATFORM = 'PLATFORM',
}

export class CreateInquiryDto {
  @ApiProperty({ description: 'The supplier organization ID to send inquiry to' })
  @IsString()
  supplierId: string;

  @ApiPropertyOptional({ description: 'Subject of the inquiry' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Inquiry message/details' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Specific product of interest' })
  @IsOptional()
  @IsString()
  productInterest?: string;

  @ApiPropertyOptional({ description: 'Estimated quantity needed' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Budget range' })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: 'Urgency level', enum: InquiryUrgency })
  @IsOptional()
  @IsEnum(InquiryUrgency)
  urgency?: InquiryUrgency;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Preferred contact method', enum: PreferredContactMethod })
  @IsOptional()
  @IsEnum(PreferredContactMethod)
  preferredContactMethod?: PreferredContactMethod;
}

export class UpdateInquiryStatusDto {
  @ApiProperty({ description: 'New status for the inquiry' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Response message to the buyer' })
  @IsOptional()
  @IsString()
  responseMessage?: string;

  @ApiPropertyOptional({ description: 'Quoted amount if providing a quote' })
  @IsOptional()
  @IsNumber()
  quotedAmount?: number;

  @ApiPropertyOptional({ description: 'Internal notes for the supplier' })
  @IsOptional()
  @IsString()
  supplierNotes?: string;
}

export class UpdateInquiryDto {
  @ApiPropertyOptional({ description: 'Internal notes for the supplier' })
  @IsOptional()
  @IsString()
  supplierNotes?: string;

  @ApiPropertyOptional({ description: 'Response message to the buyer' })
  @IsOptional()
  @IsString()
  responseMessage?: string;

  @ApiPropertyOptional({ description: 'Quoted amount' })
  @IsOptional()
  @IsNumber()
  quotedAmount?: number;
}
