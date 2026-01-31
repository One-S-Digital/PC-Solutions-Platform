import { IsEnum, IsOptional, IsString, IsISO8601, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StatePolicyCategory {
  STATE_POLICY = 'STATE_POLICY',
  REGULATION = 'REGULATION',
  COMPLIANCE = 'COMPLIANCE',
  SAFETY = 'SAFETY',
  LICENSING = 'LICENSING',
}

export enum SwissRegion {
  AG = 'AG', // Aargau
  AI = 'AI', // Appenzell Innerrhoden
  AR = 'AR', // Appenzell Ausserrhoden
  BE = 'BE', // Bern
  BL = 'BL', // Basel-Landschaft
  BS = 'BS', // Basel-Stadt
  FR = 'FR', // Fribourg
  GE = 'GE', // Geneva
  GL = 'GL', // Glarus
  GR = 'GR', // Graubünden
  JU = 'JU', // Jura
  LU = 'LU', // Lucerne
  NE = 'NE', // Neuchâtel
  NW = 'NW', // Nidwalden
  OW = 'OW', // Obwalden
  SG = 'SG', // St. Gallen
  SH = 'SH', // Schaffhausen
  SO = 'SO', // Solothurn
  SZ = 'SZ', // Schwyz
  TG = 'TG', // Thurgau
  TI = 'TI', // Ticino
  UR = 'UR', // Uri
  VD = 'VD', // Vaud
  VS = 'VS', // Valais
  ZG = 'ZG', // Zug
  ZH = 'ZH', // Zürich
  FEDERAL = 'FEDERAL', // Federal/National level
}

export class UploadStatePolicyDto {
  @ApiProperty({
    description: 'Title of the state policy',
    example: 'Childcare Licensing Requirements 2025',
  })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({
    description: 'Category of state policy',
    enum: StatePolicyCategory,
    example: StatePolicyCategory.LICENSING,
  })
  @IsEnum(StatePolicyCategory)
  category!: StatePolicyCategory;

  @ApiProperty({
    description: 'Swiss canton/region this policy applies to',
    enum: SwissRegion,
    example: SwissRegion.ZH,
  })
  @IsEnum(SwissRegion)
  region!: SwissRegion;

  @ApiProperty({
    description: 'Effective date of the policy (ISO 8601 format)',
    example: '2025-01-01',
  })
  @IsISO8601()
  effectiveDate!: string;

  @ApiProperty({
    description: 'Description of the policy',
    example: 'Updated licensing requirements for childcare facilities',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Policy reference number',
    example: 'POL-ZH-2025-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceNumber?: string;
}
