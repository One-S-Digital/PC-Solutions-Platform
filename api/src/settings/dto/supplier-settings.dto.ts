import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSupplierSettingsDto {
  @IsString()
  companyName: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  address: string;

  @IsString()
  canton: string;

  @IsString()
  productCategory: string;

  @IsString()
  serviceType: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumOrderQuantity: number;

  @IsString()
  directOrderLink: string;

  @IsString()
  catalogUrl: string;
}
