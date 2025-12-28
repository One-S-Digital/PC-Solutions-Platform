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
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Separate from authentication email: used for "contact info" on the profile.
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  childAge?: number;

  @IsString()
  @IsOptional()
  preferredLocation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLanguages?: string[];

  @IsString()
  @IsOptional()
  specialRequirements?: string;

  @IsUUID()
  @IsOptional()
  avatarAssetId?: string;
}
