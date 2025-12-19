import {
  IsArray,
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class UpdateServiceProviderSettingsDto {
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

  @IsString()
  @IsOptional()
  serviceType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serviceCategories?: string[];

  @IsString()
  @IsOptional()
  deliveryType?: string;

  @IsString()
  @IsOptional()
  bookingLink?: string;

  @IsUUID()
  @IsOptional()
  logoAssetId?: string;

  @IsUUID()
  @IsOptional()
  coverAssetId?: string;
}
