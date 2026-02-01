import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, Min, Max, IsArray, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  hasChanges?: boolean;

  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 100;
}

export class IngestUrlsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  urls!: string[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  force?: boolean;
}

