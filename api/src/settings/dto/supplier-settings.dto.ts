import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class UpdateSupplierSettingsDto {
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

  @IsString()
  @IsOptional()
  productCategory?: string;

  @IsString()
  @IsOptional()
  serviceType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minimumOrderQuantity?: number;

  @IsString()
  @IsOptional()
  directOrderLink?: string;

  @IsString()
  @IsOptional()
  catalogUrl?: string;
}
