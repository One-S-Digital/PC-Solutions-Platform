import {
  IsArray,
  IsEmail,
  IsString,
} from 'class-validator';

export class UpdateEducatorSettingsDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  workExperience: string;

  @IsString()
  education: string;

  @IsArray()
  @IsString({ each: true })
  certifications: string[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsString()
  availability: string;

  @IsString()
  cvUrl: string;

  @IsString()
  shortBio?: string;

  @IsString()
  avatarAssetId?: string;
}
