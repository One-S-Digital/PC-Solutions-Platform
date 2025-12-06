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
  @IsString()
  companyName: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  canton?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regionsServed?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pedagogy?: string[];

  @IsUUID()
  @IsOptional()
  logoAssetId?: string;

  @IsUUID()
  @IsOptional()
  coverAssetId?: string;
}
