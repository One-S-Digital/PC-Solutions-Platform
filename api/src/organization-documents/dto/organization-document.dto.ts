import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  CATALOG = 'CATALOG',
  COMPANY_PROFILE = 'COMPANY_PROFILE',
  BROCHURE = 'BROCHURE',
  PRICE_LIST = 'PRICE_LIST',
}

export class CreateOrganizationDocumentDto {
  @ApiProperty({ description: 'Asset ID of the uploaded document' })
  @IsUUID()
  assetId: string;

  @ApiProperty({ enum: DocumentType, description: 'Type of document' })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ description: 'Title of the document' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the document' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOrganizationDocumentDto {
  @ApiPropertyOptional({ enum: DocumentType, description: 'Type of document' })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'Title of the document' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the document' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the document is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class OrganizationDocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  assetId: string;

  @ApiProperty({ enum: DocumentType })
  documentType: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Asset details including URL' })
  asset?: {
    id: string;
    filename: string;
    publicUrl: string;
    mimeType?: string;
    size?: number;
  };
}
