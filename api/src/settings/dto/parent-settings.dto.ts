import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateParentSettingsDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  // Separate from authentication email: used for "contact info" on the profile.
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

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

  @IsUUID()
  @IsOptional()
  avatarAssetId?: string;
}
