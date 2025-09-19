import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class UpdateParentSettingsDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  childAge: number;

  @IsString()
  preferredLocation: string;

  @IsArray()
  @IsString({ each: true })
  preferredLanguages: string[];

  @IsString()
  specialRequirements: string;
}
