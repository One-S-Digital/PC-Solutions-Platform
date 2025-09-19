import {
  IsArray,
  IsEmail,
  IsString,
} from 'class-validator';

export class UpdateServiceProviderSettingsDto {
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

  @IsArray()
  @IsString({ each: true })
  serviceCategories: string[];

  @IsString()
  deliveryType: string;

  @IsString()
  bookingLink: string;
}
