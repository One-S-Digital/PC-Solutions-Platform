import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateFoundationSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  canton?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionsServed?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pedagogy?: string[];

  @IsOptional()
  @IsUUID()
  logoAssetId?: string;

  @IsOptional()
  @IsUUID()
  coverAssetId?: string;
}
