import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';

export enum SourceType {
  LANDING = 'landing',
  DIRECTIVES = 'directives',
  LAWS = 'laws',
  FEDERAL = 'federal',
}

export enum RenderType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
}

export class CreateSourceDto {
  @IsInt()
  cantonId!: number;

  @IsString()
  label!: string;

  @IsString()
  url!: string;

  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType = SourceType.LANDING;

  @IsEnum(RenderType)
  @IsOptional()
  renderType?: RenderType = RenderType.STATIC;

  @IsString()
  @IsOptional()
  cssSelector?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  crawlFrequencyDays?: number = 7;
}

export class UpdateSourceDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  @IsEnum(RenderType)
  @IsOptional()
  renderType?: RenderType;

  @IsString()
  @IsOptional()
  cssSelector?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  crawlFrequencyDays?: number;
}

export class ReviewQueueQueryDto {
  @IsString()
  @IsOptional()
  canton?: string;

  @IsBoolean()
  @IsOptional()
  hasChanges?: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}

