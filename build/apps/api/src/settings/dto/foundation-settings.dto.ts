import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class UpdateFoundationSettingsDto {
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
  languages: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity: number;

  @IsArray()
  @IsString({ each: true })
  pedagogy: string[];
}
